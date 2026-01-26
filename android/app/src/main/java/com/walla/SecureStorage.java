package com.walla;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

public class SecureStorage {
    private static final String TAG = "SecureStorage";
    private static final String PREFS_NAME = "AppPrefsEncrypted";
    
    // CACHE the instance
    private static SharedPreferences cachedPrefs = null;
    
    public static SharedPreferences getEncryptedPrefs(Context context) {
        // Return cached instance if available
        if (cachedPrefs != null) {
            return cachedPrefs;  
        }
        
        // First call - create and cache
        try {
            MasterKey masterKey = new MasterKey.Builder(context.getApplicationContext())
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build();

            cachedPrefs = EncryptedSharedPreferences.create(
                context.getApplicationContext(),
                PREFS_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            );
            
            Log.i(TAG, "EncryptedSharedPreferences initialized and cached");
            return cachedPrefs;
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to create EncryptedSharedPreferences", e);
            return context.getSharedPreferences("AppPrefs", Context.MODE_PRIVATE);
        }
    }
    
    public static void clearCache() {
        cachedPrefs = null;
    }
}