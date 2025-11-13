package com.walla;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

import java.util.concurrent.TimeUnit;

import org.json.JSONException;

public class OfflineSyncWorker extends Worker {
    private static final String TAG = "OfflineSyncWorker";
    private final OkHttpClient httpClient;

    public OfflineSyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
        httpClient = new OkHttpClient.Builder()
                .connectTimeout(1500, TimeUnit.MILLISECONDS)
                .callTimeout(2500, TimeUnit.MILLISECONDS)
                .build();
    }

    @NonNull
    @Override
    public Result doWork() {
       

        try {
            SharedPreferences prefs = getApplicationContext().getSharedPreferences("AppPrefs", Context.MODE_PRIVATE);

            String existingQueue = prefs.getString("offline_queue", "[]");
            JSONArray queue;
            try {
                queue = new JSONArray(existingQueue);
            } catch (JSONException e) {
                queue = new JSONArray();
                Log.e(TAG, "Failed to parse offline queue", e);
            }

            Log.i(TAG, "[LOG] OfflineSyncWorker started. Queue length=" + queue.length());
            if (queue.length() == 0) {
                Log.i(TAG, "[LOG] No queued transactions to sync");
                return Result.success();
            }

            JSONArray newQueue = new JSONArray();

            for (int i = 0; i < queue.length(); i++) {
                JSONObject tx = queue.getJSONObject(i);
                boolean ok = sendToBackend(tx);
                if (!ok) {
                    newQueue.put(tx); // keep failed ones
                }
            }

            prefs.edit().putString("offline_queue", newQueue.toString()).apply();
            Log.i(TAG, "[LOG] Sync finished. Remaining in queue=" + newQueue.length());

            return Result.success();
        } catch (Exception e) {
            Log.e(TAG, "[ERROR] Offline sync failed", e);
            return Result.retry();
        }
    }

    private boolean sendToBackend(JSONObject tx) {
        try {
            RequestBody body = RequestBody.create(tx.toString(), MediaType.parse("application/json"));
            Request request = new Request.Builder()
                    .url("http://172.20.10.13:3000/api/wallet/redeem-offline")
                    .post(body)
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    Log.e(TAG, "[ERROR] Backend failed txId=" + tx.optString("txId") + " code=" + response.code());
                    return false;
                }
                Log.i(TAG, "[LOG] Synced txId=" + tx.optString("txId"));
                return true;
            }
        } catch (Exception e) {
            Log.e(TAG, "[ERROR] sendToBackend failed", e);
            return false;
        }
    }
}
