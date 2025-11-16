package com.walla;

import android.os.Build;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import android.util.Base64;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.security.keystore.KeyInfo;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.KeyStore;
import java.security.KeyFactory;
import java.security.spec.ECGenParameterSpec;
import java.security.KeyStore.PrivateKeyEntry;


import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Constraints;
import androidx.work.NetworkType;
import androidx.work.ExistingWorkPolicy;
import androidx.work.BackoffPolicy;
import java.util.concurrent.TimeUnit;

public class NFCModule extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "NFCModule";
    private SharedPreferences prefs;
    private static ReactApplicationContext reactContext;


    public NFCModule(ReactApplicationContext context) {
    super(context);
    prefs = context.getSharedPreferences("AppPrefs", Context.MODE_PRIVATE);
    reactContext = context; // assign static reference here
    }

    public static void sendEventToJS(String type, String message) {
        if (reactContext != null) {
            WritableMap map = Arguments.createMap();
            map.putString("type", type);
            map.putString("message", message);
            reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                        .emit("NfcEvent", map);
        }
    }

    @ReactMethod
    public void manualSyncTest(Promise promise) {
        try {
            // Trigger immediate sync without network constraint for testing
            OneTimeWorkRequest workRequest = new OneTimeWorkRequest.Builder(OfflineSyncWorker.class)
                    .addTag("offline-sync")
                    .build();

            WorkManager.getInstance(reactContext)
                    .enqueueUniqueWork("offline-sync", ExistingWorkPolicy.REPLACE, workRequest);

            Log.i("NFCModule", "[TEST] Manual sync triggered immediately");
            promise.resolve("Sync triggered");
        } catch (Exception e) {
            Log.e("NFCModule", "[ERROR] Manual sync failed", e);
            promise.reject("SYNC_ERROR", e);
        }
    }

    @ReactMethod
    public void triggerOfflineSync(Promise promise) {
        try {
            // Check if there are queued transactions
            String queueJson = prefs.getString("tx_queue", "[]");
            org.json.JSONArray queue = new org.json.JSONArray(queueJson);

            if (queue.length() == 0) {
                Log.i("NFCModule", "[SYNC] No queued transactions to sync");
                promise.resolve("No transactions to sync");
                return;
            }

            Log.i("NFCModule", "[SYNC] Triggering sync for " + queue.length() + " queued transaction(s)");

            // Schedule work with network constraint
            Constraints constraints = new Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build();

            OneTimeWorkRequest workRequest = new OneTimeWorkRequest.Builder(OfflineSyncWorker.class)
                    .setConstraints(constraints)
                    .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.SECONDS)
                    .addTag("offline-sync")
                    .build();

            WorkManager.getInstance(reactContext)
                    .enqueueUniqueWork("offline-sync", ExistingWorkPolicy.REPLACE, workRequest);

            promise.resolve("Sync scheduled for " + queue.length() + " transaction(s)");
        } catch (Exception e) {
            Log.e("NFCModule", "[ERROR] Failed to trigger offline sync", e);
            promise.reject("SYNC_ERROR", e);
        }
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void saveJwtToken(String token, Promise promise) {
        try {
            prefs.edit().putString("jwt_token", token).apply();
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SAVE_FAILED", e);
        }
    }


    @ReactMethod
    public void getJwtToken(Promise promise) {
        try {
            String token = prefs.getString("jwt_token", null);
            if (token != null) {
                promise.resolve(token);
            } else {
                promise.reject("NO_TOKEN", "No JWT token found");
            }
        } catch (Exception e) {
            promise.reject("GET_TOKEN_FAILED", e);
        }
    }

    @ReactMethod
    public void clearJwtToken(Promise promise) {
        try {
            prefs.edit().remove("jwt_token").apply();
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("CLEAR_FAILED", e);
        }
    }

    @ReactMethod
    public void clearQueue(Promise promise) {
        try {
            prefs.edit().remove("tx_queue").apply();
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("CLEAR_Queue_FAILED", e);
        }
    }

    //Add method to clear local balance??
    

    //Save balance to sharedRef
    @ReactMethod
    public void saveLocalBalance(double balance, Promise promise) {
        try {
            // Store as long bits
            prefs.edit().putLong("local_balance", Double.doubleToRawLongBits(balance)).apply();
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SAVE_BALANCE_FAILED", e);
        }
    }

    @ReactMethod
    public void generateKeyPair(String alias, Promise promise) {
        try {
            KeyPair keyPair = getOrCreateKeyPair(alias);
            String publicKeyStr = Base64.encodeToString(keyPair.getPublic().getEncoded(), Base64.NO_WRAP);
            promise.resolve(publicKeyStr);
        } catch (Exception e) {
            promise.reject("KEYGEN_FAILED", e);
        }
    }

    private KeyPair getOrCreateKeyPair(String alias) throws Exception {
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);

        KeyPair keyPair;

        if (keyStore.containsAlias(alias)) {
            KeyStore.PrivateKeyEntry entry = (KeyStore.PrivateKeyEntry)keyStore.getEntry(alias, null);
            keyPair = new KeyPair(entry.getCertificate().getPublicKey(), entry.getPrivateKey());

           } else {
            KeyPairGenerator keyPairGenerator = KeyPairGenerator
            .getInstance(KeyProperties.KEY_ALGORITHM_EC, "AndroidKeyStore");

            KeyGenParameterSpec spec = new KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_SIGN | KeyProperties.PURPOSE_VERIFY )
            .setAlgorithmParameterSpec(new java.security.spec.ECGenParameterSpec("secp256r1"))
            .setDigests(KeyProperties.DIGEST_SHA256, KeyProperties.DIGEST_SHA512)
            .setUserAuthenticationRequired(false)
            .setIsStrongBoxBacked(true)
            .build(); 
            keyPairGenerator.initialize(spec); 
            keyPair = keyPairGenerator.generateKeyPair(); }
        // --- Now check if private key is hardware-backed
        KeyFactory keyFactory = KeyFactory.getInstance(keyPair.getPrivate().getAlgorithm(), "AndroidKeyStore"); 
        KeyInfo keyInfo = keyFactory.getKeySpec(keyPair.getPrivate(), KeyInfo.class); 
        Log.i("KeyCheck", "Hardware backed: " + keyInfo.isInsideSecureHardware()); 
        return keyPair;

    }


   @ReactMethod
    public void getLocalBalance(Promise promise) {
        try {
            long bits = prefs.getLong("local_balance", Double.doubleToRawLongBits(0.0));
            double balance = Double.longBitsToDouble(bits);
            promise.resolve(balance);
        } catch (Exception e) {
            promise.reject("GET_BALANCE_FAILED", e);
        }
    }


    @ReactMethod
    public void saveKeyAlias(String alias, Promise promise){
        try {
            prefs.edit().putString("key_alias", alias).apply();
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SAVE_FAILED", e);
        }
    }

    @ReactMethod
    public void saveDeviceId(String deviceId, Promise promise){
        try {
            prefs.edit().putString("device_id", deviceId).apply();
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SAVE_FAILED", e);
        }
    }

    @ReactMethod
    public void setBaseUrl(String url, Promise promise) {
        try {
            AppConfig.setBaseUrl(reactContext, url);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SET_BASE_URL_FAILED", e);
        }
    }


   @ReactMethod
    public void addListener(String eventName) {
        // Required for RN built-in EventEmitter.
        // No implementation needed — RN calls this when JS adds a listener.
    }

    @ReactMethod
    public void removeListeners(Integer count) {
        // Required for RN built-in EventEmitter.
        // No implementation needed — RN calls this when JS removes listeners.
    }
}
