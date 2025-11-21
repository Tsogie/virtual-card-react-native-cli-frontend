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

import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.Signature;

import java.net.HttpURLConnection;
import java.net.URL;

import java.io.OutputStream;
import java.io.BufferedReader;
import java.io.InputStreamReader;

import java.nio.charset.StandardCharsets;

import android.util.Base64;

import com.google.gson.Gson;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

public class LeapHostApduService extends HostApduService {
    private static final String TAG = "LeapHCE";

    private static final byte[] SW_OK = new byte[]{(byte) 0x90, (byte) 0x00};
    private static final byte[] SW_FAIL = new byte[]{(byte) 0x69, (byte) 0x85};

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(1500, TimeUnit.MILLISECONDS)
            .callTimeout(2500, TimeUnit.MILLISECONDS)
            .build();

    private SharedPreferences getEncryptedPrefs() {
        try {
            MasterKey masterKey = new MasterKey.Builder(this)
                    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                    .build();

            return EncryptedSharedPreferences.create(
                    this,
                    "AppPrefsEncrypted",
                    masterKey,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            );
        } catch (Exception e) {
            Log.e(TAG, "Failed to create EncryptedSharedPreferences", e);
            return getSharedPreferences("AppPrefs", MODE_PRIVATE);
        }
    }

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

                //SharedPreferences prefs = getSharedPreferences("AppPrefs", MODE_PRIVATE);
                SharedPreferences prefs = getEncryptedPrefs();

                String alias = prefs.getString("key_alias", null);
                if (alias == null) {
                    Log.w(TAG, "[LOG] No key alias found — device not registered");
                    return SW_FAIL;
                }

                double newLocalBalance;
                OfflineTransaction tx;
                
                // EXPANDED SYNCHRONIZED BLOCK - protects entire critical section
                synchronized (this) {
                    // Read balance
                    double localBalance = Double.longBitsToDouble(
                        prefs.getLong("local_balance",
                        Double.doubleToRawLongBits(0.0))
                    );
                    Log.i(TAG, "[LOG] Fare=" + fare + " cents, LocalBalance=" + localBalance );

                    // Check sufficient balance
                    if (localBalance < fare) {
                        NFCModule.sendEventToJS("failure", "Insufficient local balance");
                        return SW_FAIL;
                    }

                    // Deduct fare
                    newLocalBalance = localBalance - fare;

                    // Persist new balance immediately
                    boolean saved = prefs.edit().putLong(
                        "local_balance",
                        Double.doubleToLongBits(newLocalBalance)
                    ).commit();

                    if (!saved) {
                        Log.e(TAG, "[ERROR] Failed to save balance");
                        return SW_FAIL;
                    }

                    Log.i(TAG, "[LOG] Deducted locally. New local balance=" + newLocalBalance );
                    
                    // Send balance update for display
                    NFCModule.sendEventToJS("balanceUpdate", String.valueOf(newLocalBalance));

                    // Create signed transaction
                    tx = createSignedTransaction(alias, fare);
                    
                    // Queue transaction immediately while still holding lock
                    if (!isNetworkAvailable()) {
                        queueTransactionLocally(tx);
                        Log.i(TAG, "[LOG] Offline: queued transaction");
                        //NFCModule.sendEventToJS("syncFailed", "Offline test");
                    }
                    
                } // ← Lock released AFTER all critical operations

                // Network operations outside lock. Tx is already queued/created
                if (isNetworkAvailable()) {
                    // Sync in background thread (tx is already created safely)
                    new Thread(() -> syncTransactionWithBackend(tx)).start();
                } else {
                    // Already queued inside synchronized block
                    scheduleOfflineSync();
                    //NFCModule.sendEventToJS("syncFailed", "Offline test - 2");
                }

                return SW_OK;

            } catch (Exception e) {
                Log.e(TAG, "[ERROR] DEDUCT APDU failed", e);
                NFCModule.sendEventToJS("failure", "Transaction failed: " + e.getMessage());
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
            SharedPreferences prefs = getEncryptedPrefs();
            //SharedPreferences prefs = getSharedPreferences("AppPrefs", MODE_PRIVATE);
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
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.SECONDS)
                .addTag("offline-sync")
                .build();

        // Use REPLACE to ensure new work is always scheduled
        WorkManager.getInstance(getApplicationContext())
                .enqueueUniqueWork("offline-sync", ExistingWorkPolicy.REPLACE, workRequest);

        Log.i(TAG, "[WORK] Scheduled offline sync work (will run when network available)");
    }


    private void queueTransactionLocally(OfflineTransaction tx) {
        SharedPreferences prefs = getEncryptedPrefs();
        //SharedPreferences prefs = getSharedPreferences("AppPrefs", MODE_PRIVATE);
        String json = prefs.getString("tx_queue", "[]");

        try {
            JSONArray arr = new JSONArray(json);
            arr.put(new JSONObject(new Gson().toJson(tx)));
            prefs.edit().putString("tx_queue", arr.toString()).apply();
        } catch (Exception e) {
            Log.e("NFC", "Queue error", e);
        }
    }



    private OfflineTransaction createSignedTransaction(String alias, int fare) throws Exception {
        
        OfflineTransaction tx = new OfflineTransaction();
        tx.txId = UUID.randomUUID().toString();
        tx.amount = fare; 
        tx.timestamp = System.currentTimeMillis();

        JSONObject payload = new JSONObject();
        payload.put("txId", tx.txId);
        payload.put("fare", fare); // Backend receives cents
        payload.put("timestamp", tx.timestamp);
        
        String payloadString = payload.toString(); //exact string to sing
        tx.payload = payloadString;
        byte[] payloadBytes = payload.toString().getBytes(StandardCharsets.UTF_8);
        
        // Sign the payload
        // Sign using EC / ECDSA (you created EC keys)
        java.security.Signature signature = java.security.Signature.getInstance("SHA256withECDSA");
        java.security.KeyStore ks = java.security.KeyStore.getInstance("AndroidKeyStore");
        ks.load(null);
        
        java.security.PrivateKey privateKey = (java.security.PrivateKey) ks.getKey(alias, null);
        signature.initSign(privateKey);
        signature.update(payloadBytes);
        // Use NO_WRAP so there are no newlines
        tx.signature = android.util.Base64.encodeToString(signature.sign(), android.util.Base64.NO_WRAP);
        // Optionally keep original payload string so you can send it directly
        // but in your sync method you base64-encode the JSON before sending,
        // so just return signature and build request later as you already do.
        return tx;

    }

    private String syncTransactionWithBackend(OfflineTransaction tx) {
        HttpURLConnection conn = null;
        try {
            SharedPreferences prefs = getEncryptedPrefs();
            //SharedPreferences prefs = getSharedPreferences("AppPrefs", MODE_PRIVATE);
            String deviceId = prefs.getString("device_id", null);
            if (deviceId == null) {
                Log.e(TAG, "[ERROR] No deviceId found in prefs");
                queueTransactionLocally(tx);
                return null;
            }

            // Build request JSON
            JSONObject requestBody = new JSONObject();
            requestBody.put("deviceId", deviceId);
            requestBody.put("payload", Base64.encodeToString(tx.payload.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP));
            requestBody.put("signature", tx.signature);

            // Create HTTP connection
            URL url = new URL(AppConfig.Endpoints.walletRedeem(getApplicationContext()));
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);
            conn.setConnectTimeout(3000);
            conn.setReadTimeout(3000);

            Log.i(TAG, "[DEBUG] Sending payload: " + tx.payload);
            Log.i(TAG, "[DEBUG] Request body: " + requestBody.toString());
            // Send request
            try (OutputStream os = conn.getOutputStream()) {
                byte[] input = requestBody.toString().getBytes(StandardCharsets.UTF_8);
                os.write(input, 0, input.length);
            }

            int status = conn.getResponseCode();
            if (status == 200) {
                try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()))) {
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) sb.append(line);
                    
                    String responseJson = sb.toString();
                    Log.i(TAG, "[SUCCESS] Transaction synced: " + tx.txId);
                    Log.i(TAG, "[RESPONSE] " + responseJson);
                    
                    // Parse and send complete transaction data
                    try {
                        JSONObject redeemResult = new JSONObject(responseJson);
                        String resultStatus = redeemResult.getString("status");
                        double newBalance = redeemResult.getDouble("newBalance");
                        double fareDeducted = redeemResult.getDouble("fareDeducted");
                        
                        // Update local balance
                        prefs.edit().putLong("local_balance", Double.doubleToRawLongBits(newBalance)).apply();
                        Log.i(TAG, "[SYNC] Local balance updated to: " + newBalance);
                        
                        // Send complete transaction event
                        JSONObject eventData = new JSONObject();
                        eventData.put("status", resultStatus);
                        eventData.put("newBalance", newBalance);
                        eventData.put("fareDeducted", fareDeducted);
                        
                        NFCModule.sendEventToJS("transactionComplete", eventData.toString());
                        
                    } catch (JSONException e) {
                        Log.e(TAG, "[ERROR] Failed to parse backend response", e);
                        NFCModule.sendEventToJS("failure", "Invalid response format");
                    }
                    
                    return responseJson;
                }
            } else if (status >= 400 && status < 500) {

                // Client error (4xx) - validation failed, DON'T REQUEUE
                try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getErrorStream()))) {
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) sb.append(line);
                    
                    String errorResponse = sb.toString();
                    Log.e(TAG, "[VALIDATION ERROR] Transaction rejected by backend: " + errorResponse);
                    
                    // Parse error message and notify user
                    try {
                        JSONObject error = new JSONObject(errorResponse);
                        String message = error.optString("message", "Transaction validation failed");
                        NFCModule.sendEventToJS("failure", "Backend rejected: " + message);
                    } catch (Exception e) {
                        NFCModule.sendEventToJS("failure", "Transaction validation failed");
                    }
                    
                    // not requeue - this will never succeed
                    return null;
                }
                
            } else {
                // Server error (5xx) or network issue - REQUEUE for retry
                Log.w(TAG, "[ERROR] Backend error " + status + ", requeueing");
                queueTransactionLocally(tx);
                NFCModule.sendEventToJS("syncFailed", "Backend error, will retry");
                return null;
            }

        } catch (Exception e) {
            Log.e(TAG, "[ERROR] Sync failed, requeueing transaction", e);
            queueTransactionLocally(tx);
            NFCModule.sendEventToJS("syncFailed", "Network error: " + e.getMessage());
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }


}
