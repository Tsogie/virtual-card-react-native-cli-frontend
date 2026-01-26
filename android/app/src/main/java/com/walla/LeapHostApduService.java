package com.walla;

import android.content.Intent;
import android.content.SharedPreferences;
import android.nfc.cardemulation.HostApduService;
import android.os.Bundle;
import android.util.Log;

import com.walla.NFCModule;
import com.walla.OfflineSyncWorker;
import com.walla.AppConfig;
import com.walla.OfflineTransaction;
import com.walla.SecureStorage;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.concurrent.TimeUnit;

import java.security.MessageDigest;
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

    private static String cachedAlias = null;
    private static Double cachedBalance = null;

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
       
                String alias;
                double newLocalBalance;
                                
                // EXPANDED SYNCHRONIZED BLOCK - protects entire critical section
                synchronized (this) {

                    if (cachedAlias == null || cachedBalance == null) {
                        SharedPreferences prefs = SecureStorage.getEncryptedPrefs(this);
                        cachedAlias = prefs.getString("key_alias", null);
                        long bits = prefs.getLong("local_balance", Double.doubleToRawLongBits(0.0));
                        cachedBalance = Double.longBitsToDouble(bits);
                        Log.i(TAG, "Cache miss - loaded from disk");
                    }
                    
                    alias = cachedAlias;
                    double localBalance = cachedBalance;

                    if (alias == null) {
                        Log.w(TAG, "[LOG] No key alias found — device not registered");
                        return SW_FAIL;
                    }

                    // Read balance
                    // Check sufficient balance
                    if (localBalance < fare) {
                        NFCModule.sendEventToJS("failure", "Insufficient");
                        Log.i(TAG, "[LOG] Insufficient funds; LocalBalance=" + localBalance);
                        return SW_FAIL;
                    }

                    // Deduct in memory INSTANTLY
                    newLocalBalance = localBalance - fare;
                    cachedBalance = newLocalBalance;

                    Log.i(TAG, "[LOG] Fare=" + fare + " euros, LocalBalance = " + localBalance );
                    Log.i(TAG, "[LOG] Deducted locally. New local balance=" + newLocalBalance );
                    
                    
                } 

                NFCModule.sendEventToJS("balanceUpdate", String.valueOf(newLocalBalance));
                
                final String finalAlias = alias;
                final int finalFare = fare;
                final double finalBalance = newLocalBalance;
                
                new Thread(() -> {
                    try {
                        // Persist balance to disk
                        SharedPreferences prefs = SecureStorage.getEncryptedPrefs(this);
                        prefs.edit().putLong("local_balance", 
                            Double.doubleToRawLongBits(finalBalance)).commit();
                        updateBalanceCache(finalBalance);
                        Log.i(TAG, "Balance persisted to disk");
                        
                        // Create signed transaction (slow - ECDSA signing)
                        OfflineTransaction tx = createSignedTransaction(finalAlias, finalFare);
                        
                        // Network/queue operations
                        if (isNetworkAvailable()) {
                            syncTransactionWithBackend(tx);
                        } else {
                            queueTransactionLocally(tx);
                            scheduleOfflineSync();
                            NFCModule.sendEventToJS("offline", "Offline transaction");
                            Log.i(TAG, "[LOG] Offline: queued transaction");
                        }
                        
                    } catch (Exception e) {
                        Log.e(TAG, "[ERROR] Background processing failed", e);
                    }
                }).start();

                // RETURN IMMEDIATELY
                return SW_OK;

            } catch (Exception e) {
                Log.e(TAG, "[ERROR] DEDUCT APDU failed", e);
                NFCModule.sendEventToJS("failure", "Transaction failed: " + e.getMessage());
                return SW_FAIL;
            }
        }

        return SW_FAIL;
    }

    public static void updateBalanceCache(double newBalance) {
        cachedBalance = newBalance;
        Log.i(TAG, "Balance cache updated: " + newBalance);
    }

    public static void clearCache() {
        cachedAlias = null;
        cachedBalance = null;
        Log.i(TAG, "Cache cleared");
    }


    private boolean isNetworkAvailable() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        
        // Modern API (Android 6.0+)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            android.net.Network network = cm.getActiveNetwork();
            if (network == null) return false;
            
            android.net.NetworkCapabilities capabilities = cm.getNetworkCapabilities(network);
            if (capabilities == null) return false;
            
            // Check if network has internet capability
            return capabilities.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_INTERNET)
                && capabilities.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_VALIDATED);
        } else {
            // Fallback for older Android versions
            android.net.NetworkInfo ni = cm.getActiveNetworkInfo();
            return ni != null && ni.isConnectedOrConnecting();
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

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.i(TAG, "[LOG] HCE Service started or restarted");
        
        return START_STICKY;
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

        // Ensure new work is always scheduled
        WorkManager.getInstance(getApplicationContext())
                .enqueueUniqueWork("offline-sync", ExistingWorkPolicy.REPLACE, workRequest);

        Log.i(TAG, "[WORK] Scheduled offline sync work (will run when network available)");
    }


    private void queueTransactionLocally(OfflineTransaction tx) {

        SharedPreferences prefs = SecureStorage.getEncryptedPrefs(this);
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
        payload.put("fare", fare); 
        payload.put("timestamp", tx.timestamp);
        
        String payloadString = payload.toString(); //exact string to sing
        tx.payload = payloadString;
        byte[] payloadBytes = payload.toString().getBytes(StandardCharsets.UTF_8);
        
        // Sign the payload
        // Sign using EC / ECDSA 
        java.security.Signature signature = java.security.Signature.getInstance("SHA256withECDSA");
        java.security.KeyStore ks = java.security.KeyStore.getInstance("AndroidKeyStore");
        ks.load(null);
        
        java.security.PrivateKey privateKey = (java.security.PrivateKey) ks.getKey(alias, null);
        signature.initSign(privateKey);
        signature.update(payloadBytes);
        // NO_WRAP so there are no newlines
        tx.signature = android.util.Base64.encodeToString(signature.sign(), android.util.Base64.NO_WRAP);

        return tx;
    }

    private String syncTransactionWithBackend(OfflineTransaction tx) {
        HttpURLConnection conn = null;
        try {
            SharedPreferences prefs = SecureStorage.getEncryptedPrefs(this);
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
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);

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
                        updateBalanceCache(newBalance);
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

                // DON'T REQUEUE
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
                scheduleOfflineSync();
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