package com.walla;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import androidx.work.WorkManager;
import androidx.work.OneTimeWorkRequest;
import androidx.work.Constraints;
import androidx.work.NetworkType;
import androidx.work.ExistingWorkPolicy;
import androidx.work.BackoffPolicy;
import java.util.concurrent.TimeUnit;
import org.json.JSONArray;
import org.json.JSONObject;
import com.google.gson.Gson;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import android.util.Base64;

public class OfflineSyncWorker extends Worker {
    private static final String TAG = "OfflineSyncWorker";

    public OfflineSyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
        Log.i(TAG, "[INIT] OfflineSyncWorker created");
    }

  @NonNull
@Override
public Result doWork() {
    Log.i(TAG, "[START] =========== OFFLINE SYNC STARTING ===========");

    SharedPreferences prefs = getApplicationContext().getSharedPreferences("AppPrefs", Context.MODE_PRIVATE);
    String queueJson = prefs.getString("tx_queue", "[]");
    String deviceId = prefs.getString("device_id", null);

    Log.i(TAG, "[LOG] Device ID: " + deviceId);
    Log.i(TAG, "[LOG] Queue JSON: " + queueJson);

    if (deviceId == null || deviceId.isEmpty()) {
        Log.e(TAG, "[ERROR] No device ID found - aborting sync");
        return Result.failure();
    }

    try {
        JSONArray queue = new JSONArray(queueJson);
        int queueSize = queue.length();
        
        Log.i(TAG, "[LOG] Found " + queueSize + " transactions in queue");
        
        if (queueSize == 0) {
            Log.i(TAG, "[LOG] Queue is empty, nothing to sync");
            return Result.success();
        }

        JSONArray failedTxs = new JSONArray();
        int successCount = 0;
        Gson gson = new Gson();

        for (int i = 0; i < queueSize; i++) {
            Log.i(TAG, "[LOG] Processing transaction " + (i + 1) + "/" + queueSize);
            
            try {
                JSONObject txJson = queue.getJSONObject(i);
                OfflineTransaction tx = gson.fromJson(txJson.toString(), OfflineTransaction.class);

                if (tx == null || tx.txId == null) {
                    Log.e(TAG, "[ERROR] Failed to parse transaction at index " + i);
                    failedTxs.put(txJson);
                    continue;
                }

                Log.i(TAG, "[LOG] Syncing txId: " + tx.txId + ", amount: " + tx.amount);
                
                boolean synced = syncSingleTransaction(tx, deviceId, prefs);
                
                if (synced) {
                    successCount++;
                    Log.i(TAG, "[SUCCESS] ✅ Transaction synced: " + tx.txId);
                } else {
                    failedTxs.put(txJson);
                    Log.w(TAG, "[FAILED] ❌ Transaction failed: " + tx.txId);
                }
                
            } catch (Exception e) {
                Log.e(TAG, "[ERROR] Exception processing transaction " + i, e);
                failedTxs.put(queue.getJSONObject(i));
            }
        }

        // ✅ Update queue with only failed transactions
        String newQueueJson = failedTxs.toString();
        prefs.edit().putString("tx_queue", newQueueJson).apply();

        Log.i(TAG, "[COMPLETE] Sync finished: " + successCount + " succeeded, " + 
              failedTxs.length() + " failed");
        Log.i(TAG, "[LOG] Updated queue: " + newQueueJson);

        // ✅ SIMPLE: Let WorkManager handle retries automatically
        if (failedTxs.length() == 0) {
            Log.i(TAG, "[END] =========== OFFLINE SYNC FINISHED (all successful) ===========");
            return Result.success();
        } else {
            Log.w(TAG, "[END] =========== OFFLINE SYNC FINISHED (with failures) ===========");
            return Result.retry(); // WorkManager will retry with exponential backoff
        }

    } catch (Exception e) {
        Log.e(TAG, "[ERROR] Offline sync crashed", e);
        return Result.retry();
    }
}



    private boolean syncSingleTransaction(OfflineTransaction tx, String deviceId, SharedPreferences prefs) {
        HttpURLConnection conn = null;
        try {
            Log.i(TAG, "[HTTP] Preparing request for txId: " + tx.txId);
            
            // ✅ Build request body
            JSONObject requestBody = new JSONObject();
            requestBody.put("deviceId", deviceId);
            requestBody.put("payload", Base64.encodeToString(
                tx.payload.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP));
            requestBody.put("signature", tx.signature);

            Log.i(TAG, "[HTTP] Request body: " + requestBody.toString());

            // ✅ Create connection
            URL url = new URL(AppConfig.Endpoints.walletRedeem(getApplicationContext()));
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);

            Log.i(TAG, "[HTTP] Connecting to backend...");

            // ✅ Send request
            try (OutputStream os = conn.getOutputStream()) {
                os.write(requestBody.toString().getBytes(StandardCharsets.UTF_8));
            }

            int status = conn.getResponseCode();
            Log.i(TAG, "[HTTP] Response status: " + status);
            
            if (status == 200) {
                // ✅ Read response
                try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()))) {
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) sb.append(line);
                    
                    String responseBody = sb.toString();
                    Log.i(TAG, "[HTTP] Response: " + responseBody);
                    
                    // ✅ Parse and update local balance
                    try {
                        JSONObject result = new JSONObject(responseBody);
                        double newBalance = result.getDouble("newBalance");
                        
                        prefs.edit().putLong("local_balance", 
                            Double.doubleToRawLongBits(newBalance)).apply();
                        
                        Log.i(TAG, "[BALANCE] Updated local balance to: " + newBalance);
                        
                        // ✅ Send event to JS
                        JSONObject eventData = new JSONObject();
                        eventData.put("status", result.getString("status"));
                        eventData.put("newBalance", newBalance);
                        eventData.put("fareDeducted", result.getDouble("fareDeducted"));
                        
                        NFCModule.sendEventToJS("transactionComplete", eventData.toString());
                        Log.i(TAG, "[EVENT] ✅ Sent transactionComplete event to React Native");
                        
                    } catch (Exception e) {
                        Log.e(TAG, "[ERROR] Failed to parse response or update balance", e);
                    }
                    
                    return true;
                }
            } else {
                Log.w(TAG, "[HTTP] ❌ Backend returned status " + status);
                
                // Try to read error response
                try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getErrorStream()))) {
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) sb.append(line);
                    Log.w(TAG, "[HTTP] Error response: " + sb.toString());
                } catch (Exception e) {
                    // Ignore
                }
                
                return false;
            }

        } catch (Exception e) {
            Log.e(TAG, "[ERROR] ❌ Exception syncing transaction " + tx.txId, e);
            return false;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }
}