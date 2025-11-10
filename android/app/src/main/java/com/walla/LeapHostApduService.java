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

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

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

        // ---- DEDUCT FARE ----
        if (commandApdu.length >= 9 && commandApdu[0] == (byte) 0x80 && commandApdu[1] == (byte) 0x10) {
            try {
                int lc = commandApdu[4] & 0xFF;
                byte[] data = new byte[lc];
                System.arraycopy(commandApdu, 5, data, 0, lc);
                int fare = ByteBuffer.wrap(data).getInt();

                SharedPreferences prefs = getSharedPreferences("AppPrefs", MODE_PRIVATE);
                String jwt = prefs.getString("jwt_token", null);
                double localBalance = Double.longBitsToDouble(
                    prefs.getLong("local_balance", Double.doubleToRawLongBits(0.0))
                );

                if (jwt == null) {
                    Log.w(TAG, "[LOG] No JWT token found");
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
                new Thread(() -> syncWithBackend(jwt, fare, newLocalBalance)).start();
                return SW_OK;

            } catch (Exception e) {
                Log.e(TAG, "[ERROR] DEDUCT APDU failed", e);
                return SW_FAIL;
            }
        }

        return SW_FAIL;
    }

    /** Try backend sync, or queue locally if offline */
    private void syncWithBackend(String jwt, int fare, double currentBalance) {
        try {
            String result = redeemFareToBackend(jwt, fare);
            if (result == null) {
                Log.w(TAG, "[LOG] Backend unreachable. Queuing transaction.");
                queueTransactionLocally(jwt, fare);
                return;
            }

            JSONObject json = new JSONObject(result);
            String status = json.optString("status", "");
            double newBalance = json.optDouble("newBalance", currentBalance);

            if ("Success".equals(status)) {
                SharedPreferences prefs = getSharedPreferences("AppPrefs", MODE_PRIVATE);
                prefs.edit().putLong("local_balance", Double.doubleToLongBits(newBalance)).apply();
                NFCModule.sendEventToJS("success", "Fare deducted successfully");
                NFCModule.sendEventToJS("balanceUpdate", String.valueOf(newBalance));
                Log.i(TAG, "[LOG] Synced successfully. New backend balance=" + newBalance);
            } else {
                Log.w(TAG, "[LOG] Backend responded error: " + status);
                NFCModule.sendEventToJS("failure", status);
            }

        } catch (Exception e) {
            Log.e(TAG, "[ERROR] Sync failed", e);
            queueTransactionLocally(jwt, fare);
        }
    }

    /** Queue the transaction to SharedPreferences for retry later */
    private void queueTransactionLocally(String jwt, int fare) {
        try {
            SharedPreferences prefs = getSharedPreferences("AppPrefs", MODE_PRIVATE);
            String existingQueue = prefs.getString("offline_queue", "[]");
            JSONArray queue = new JSONArray(existingQueue);

            JSONObject tx = new JSONObject();
            tx.put("token", jwt);
            tx.put("fare", fare);
            tx.put("timestamp", System.currentTimeMillis());

            queue.put(tx);
            prefs.edit().putString("offline_queue", queue.toString()).apply();

            Log.i(TAG, "[LOG] Queued offline transaction (fare=" + fare + ")");
            NFCModule.sendEventToJS("queued", "Transaction queued for later sync");
        } catch (JSONException e) {
            Log.e(TAG, "[ERROR] Failed to queue offline transaction", e);
        }
    }

    private String redeemFareToBackend(String jwt, int fare) {
        JSONObject json = new JSONObject();
        try {
            json.put("token", jwt);
            json.put("fare", fare);
        } catch (JSONException e) {
            Log.e(TAG, "[ERROR] JSON error", e);
            return null;
        }

        RequestBody body = RequestBody.create(json.toString(), MediaType.parse("application/json"));
        Request request = new Request.Builder()
                .url("http://172.20.10.13:3000/api/wallet/redeem")
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

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.i(TAG, "[LOG] HCE Service started or restarted");
        return START_STICKY;
    }
}
