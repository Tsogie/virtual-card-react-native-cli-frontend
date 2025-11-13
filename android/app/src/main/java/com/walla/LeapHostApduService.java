package com.walla;

import android.content.Intent;
import android.content.SharedPreferences;
import android.nfc.cardemulation.HostApduService;
import android.os.Bundle;
import android.util.Log;

import com.walla.NFCModule;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.concurrent.TimeUnit;

import android.os.Handler;
import android.os.Looper;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.MessageDigest;
import java.util.Map;
import java.util.HashMap;
import java.util.UUID;

import android.net.ConnectivityManager;
import android.net.NetworkInfo;

import androidx.work.*;


public class LeapHostApduService extends HostApduService {
    private static final String TAG = "LeapHCE";

    private static final byte[] SW_OK = new byte[]{(byte) 0x90, (byte) 0x00};
    private static final byte[] SW_FAIL = new byte[]{(byte) 0x69, (byte) 0x85};

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(1500, TimeUnit.MILLISECONDS)
            .callTimeout(2500, TimeUnit.MILLISECONDS)
            .build();

    @Override
    public byte[] processCommandApdu(byte[] commandApdu, Bundle extras) {
        if (commandApdu == null) return SW_FAIL;

        Log.i(TAG, "[LOG] Incoming APDU: " + bytesToHex(commandApdu));

        // ---- SELECT AID ----
        if (isSelectAid(commandApdu)) {
            Log.i(TAG, "[LOG] SELECT AID received");
            return concat("LEAP_OK".getBytes(), SW_OK);
        }

        // GET CHALLENGE (CLA=0x80 INS=0x84)
        if (commandApdu.length >= 5 && (commandApdu[0] & 0xFF) == 0x80 && (commandApdu[1] & 0xFF) == 0x84) {
            try {
                int lc = commandApdu[4] & 0xFF;
                if (lc <= 0 || commandApdu.length < 5 + lc) return SW_FAIL;
                byte[] challenge = new byte[lc];
                System.arraycopy(commandApdu, 5, challenge, 0, lc);

                Token tok = pickToken();
                if (tok == null) {
                    Log.w(TAG, "[LOG] No token available");
                    return SW_FAIL;
                }

                // compute HMAC-SHA256(challenge) with tok.key
                byte[] hmac = hmacSha256(tok.key, challenge);

                // truncate signature to first 8 bytes (for APDU size). For test/demo 8 is okay.
                int sigLen = 8;
                byte[] sig = new byte[sigLen];
                System.arraycopy(hmac, 0, sig, 0, sigLen);

                // response = tokenId(1 byte) + sig(8 bytes) + SW_OK
                byte[] response = new byte[1 + sigLen + 2];
                response[0] = tok.id;
                System.arraycopy(sig, 0, response, 1, sigLen);
                response[response.length - 2] = SW_OK[0];
                response[response.length - 1] = SW_OK[1];

                Log.i(TAG, "[LOG] GET_CHALLENGE responded with tokenId=" + (tok.id & 0xFF) + " sig=" + bytesToHex(sig));
                return response;
            } catch (Exception e) {
                Log.e(TAG, "[ERROR] GET_CHALLENGE handling", e);
                return SW_FAIL;
            }
        }

        // ---- DEDUCT FARE ----
        if (commandApdu.length >= 9 && commandApdu[0] == (byte) 0x80 && commandApdu[1] == (byte) 0x10) {
            try {
                int lc = commandApdu[4] & 0xFF;
                byte[] data = new byte[lc];
                System.arraycopy(commandApdu, 5, data, 0, lc);
                int fare = ByteBuffer.wrap(data).getInt();

                SharedPreferences prefs = getSharedPreferences("AppPrefs", MODE_PRIVATE);
                String deviceKey = prefs.getString("device_key", null);
                double localBalance = Double.longBitsToDouble(
                    prefs.getLong("local_balance", Double.doubleToRawLongBits(0.0))
                );

                if (deviceKey == null) {
                    Log.w(TAG, "[LOG] No device key found");
                    return SW_FAIL;
                }

                Log.i(TAG, "[LOG] Fare=" + fare + ", Local balance=" + localBalance);

                // Check balance locally
                if (localBalance < fare) {
                    Log.w(TAG, "[LOG] Insufficient local balance");
                    NFCModule.sendEventToJS("failure", "Insufficient local balance");
                    return SW_FAIL;
                }

                // Deduct locally and respond immediately
                double newLocalBalance = localBalance - fare;
                prefs.edit().putLong("local_balance", Double.doubleToLongBits(newLocalBalance)).apply();
                Log.i(TAG, "[LOG] Deducted locally. New local balance=" + newLocalBalance);
                NFCModule.sendEventToJS("balanceUpdate", String.valueOf(newLocalBalance));

                // Return OK to reader first
                //new Thread(() -> syncWithBackend(deviceKey, fare, newLocalBalance)).start();
                //return SW_OK;

                // Return OK to reader first
                if (!isNetworkAvailable()) {
                    queueTransactionLocally(deviceKey, fare);
                    Log.i(TAG, "[LOG] Offline detected, transaction queued");
                } else {
                    new Thread(() -> syncWithBackend(deviceKey, fare, newLocalBalance)).start();
                }
                return SW_OK;

            } catch (Exception e) {
                Log.e(TAG, "[ERROR] DEDUCT APDU failed", e);
                return SW_FAIL;
            }
        }

        return SW_FAIL;
    }

    private boolean isNetworkAvailable() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        if (cm != null) {
            android.net.NetworkInfo ni = cm.getActiveNetworkInfo();
            return ni != null && ni.isConnected();
        }
        return false;
    }

    /** Try backend sync, or queue locally if offline */
    private void syncWithBackend(String deviceKey, int fare, double currentBalance) {
        try {
            String result = redeemFareToBackend(deviceKey, fare);
            if (result == null) {
                Log.w(TAG, "[LOG] Backend unreachable. Queuing transaction.");
                queueTransactionLocally(deviceKey, fare);
                return;
            }

            JSONObject json = new JSONObject(result);
            String status = json.optString("status", "");
            //is here overriding balance from backend?
            double newBalance = json.optDouble("newBalance", currentBalance);

            if ("Success".equals(status)) {
                SharedPreferences prefs = getSharedPreferences("AppPrefs", MODE_PRIVATE);
                prefs.edit().putLong("local_balance", Double.doubleToLongBits(newBalance)).apply();
                NFCModule.sendEventToJS("balanceUpdate", String.valueOf(newBalance));
                // Delay 10–20ms before sending success
                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    NFCModule.sendEventToJS("success", "Fare deducted successfully");
                }, 20);
                
                Log.i(TAG, "[LOG] Synced successfully. New backend balance=" + newBalance);
            } else {
                Log.w(TAG, "[LOG] Backend responded error: " + status);
                NFCModule.sendEventToJS("failure", status);
            }

        } catch (Exception e) {
            Log.e(TAG, "[ERROR] Sync failed", e);
            queueTransactionLocally(deviceKey, fare);
        }
    }

    private void cleanOfflineQueue() {
        SharedPreferences prefs = getSharedPreferences("AppPrefs", MODE_PRIVATE);
        String queueStr = prefs.getString("offline_queue", "[]");

        try {
            JSONArray queue = new JSONArray(queueStr);
            JSONArray cleanQueue = new JSONArray();

            for (int i = 0; i < queue.length(); i++) {
                JSONObject tx = queue.getJSONObject(i);
                // Only keep valid transactions
                if (tx.has("deviceKey") && tx.has("fare")) {
                    if (!tx.has("txId")) {
                        tx.put("txId", UUID.randomUUID().toString());
                    }
                    cleanQueue.put(tx);
                }
            }

            prefs.edit().putString("offline_queue", cleanQueue.toString()).apply();
            Log.i("OfflineQueue", "Cleaned offline queue: " + cleanQueue.toString());
        } catch (JSONException e) {
            Log.e("OfflineQueue", "Failed to clean offline queue", e);
        }
    }


    /** Queue the transaction to SharedPreferences for retry later */
    private void queueTransactionLocally(String deviceKey, int fare) {
        try {
            SharedPreferences prefs = getSharedPreferences("AppPrefs", MODE_PRIVATE);
            String existingQueue = prefs.getString("offline_queue", "[]");
            JSONArray queue = new JSONArray(existingQueue);

            JSONObject tx = new JSONObject();
            tx.put("txId", UUID.randomUUID().toString());
            tx.put("deviceKey", deviceKey);
            tx.put("fare", fare);
            tx.put("timestamp", System.currentTimeMillis());

            queue.put(tx);
            prefs.edit().putString("offline_queue", queue.toString()).apply();

            Log.i(TAG, "[LOG] Queued offline transaction (fare=" + fare + ")");
            NFCModule.sendEventToJS("queued", "Transaction queued for later sync");

            // Schedule sync attempt
            scheduleOfflineSync();
        } catch (JSONException e) {
            Log.e(TAG, "[ERROR] Failed to queue offline transaction", e);
        }
    }

    private String redeemFareToBackend(String deviceKey, int fare) {
        JSONObject json = new JSONObject();
        try {
            json.put("deviceKey", deviceKey);
            json.put("fare", fare);
        } catch (JSONException e) {
            Log.e(TAG, "[ERROR] JSON error", e);
            return null;
        }

        RequestBody body = RequestBody.create(json.toString(), MediaType.parse("application/json"));
        Request request = new Request.Builder()
                .url("http://172.20.10.13:3000/api/wallet/redeem-device")
                .post(body)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            return response.isSuccessful() ? response.body().string() : null;
        } catch (IOException e) {
            Log.e(TAG, "[ERROR] Network error", e);
            return null;
        }

    }

    @Override
    public void onDeactivated(int reason) {
        Log.i(TAG, "[LOG] HCE deactivated, reason=" + reason);
    }

    private boolean isSelectAid(byte[] apdu) {
        if (apdu.length < 4) return false;
        return apdu[0] == (byte) 0x00 && apdu[1] == (byte) 0xA4 &&
               apdu[2] == (byte) 0x04 && apdu[3] == (byte) 0x00;
    }

    private byte[] concat(byte[] a, byte[] b) {
        byte[] result = new byte[a.length + b.length];
        System.arraycopy(a, 0, result, 0, a.length);
        System.arraycopy(b, 0, result, a.length, b.length);
        return result;
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) sb.append(String.format("%02X", b));
        return sb.toString();
    }

    // Convert hex string to byte[]
    private byte[] hexToBytes(String s) {
        int len = s.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(s.charAt(i), 16) << 4)
                                + Character.digit(s.charAt(i+1), 16));
        }
        return data;
    }

    // HMAC-SHA256 and return raw bytes
    private byte[] hmacSha256(byte[] key, byte[] data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec keySpec = new SecretKeySpec(key, "HmacSHA256");
        mac.init(keySpec);
        return mac.doFinal(data);
    }

    // Pick token from SharedPreferences or fallback. For demo use round-robin or first token.
    private Token pickToken() {
        // Token is simple holder
        // In prefs we store JSON like: {"tokens":[{"id":1,"key":"A1B2..."}, ...]}
        try {
            SharedPreferences prefs = getSharedPreferences("AppPrefs", MODE_PRIVATE);
            String t = prefs.getString("tokens", null);
            if (t == null) {
                // fallback demo tokens (hex)
                Map<Integer,String> demo = new HashMap<>();
                demo.put(1, "A1B2C3D4E5F60708A1B2C3D4E5F60708"); // 32 hex = 16 bytes
                demo.put(2, "0102030405060708090A0B0C0D0E0F10");
                return new Token( (byte)1, hexToBytes(demo.get(1)) );
            } else {
                // parse JSON quickly (lightweight)
                JSONObject jobj = new JSONObject(t);
                JSONArray arr = jobj.optJSONArray("tokens");
                if (arr != null && arr.length() > 0) {
                    JSONObject it = arr.getJSONObject(0);
                    int id = it.getInt("id");
                    String keyhex = it.getString("key");
                    return new Token((byte)id, hexToBytes(keyhex));
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "pickToken error", e);
        }
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.i(TAG, "[LOG] HCE Service started or restarted");
        // Clean the offline queue once
        cleanOfflineQueue();
        return START_STICKY;
    }

    // small holder class
    private static class Token {
        public final byte id;
        public final byte[] key;
        public Token(byte id, byte[] key) { this.id = id; this.key = key; }
    }

    private void scheduleOfflineSync() {
        Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

        OneTimeWorkRequest workRequest = new OneTimeWorkRequest.Builder(OfflineSyncWorker.class)
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS)
                .build();

        WorkManager.getInstance(getApplicationContext())
                .enqueueUniqueWork("offline-sync", ExistingWorkPolicy.KEEP, workRequest);

        Log.i(TAG, "[LOG] Scheduled offline sync work");
    }

}
