package com.walla;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

/**
 * Centralized configuration for native Android code.
 * Reads backend URL from SharedPreferences (synced from React Native config).
 */
public class AppConfig {
    private static final String TAG = "AppConfig";
    private static final String PREFS_NAME = "AppPrefs";
    private static final String KEY_BASE_URL = "base_url";

    // Fallback URL if not set in SharedPreferences
    private static final String DEFAULT_BASE_URL = "http://172.20.10.13:3000";

    /**
     * Get the backend base URL
     */
    public static String getBaseUrl(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String url = prefs.getString(KEY_BASE_URL, DEFAULT_BASE_URL);
        Log.d(TAG, "Using base URL: " + url);
        return url;
    }

    /**
     * Set the backend base URL (called from React Native)
     */
    public static void setBaseUrl(Context context, String url) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_BASE_URL, url).apply();
        Log.i(TAG, "Base URL updated to: " + url);
    }

    /**
     * API Endpoint builders
     */
    public static class Endpoints {
        public static String login(Context context) {
            return getBaseUrl(context) + "/api/login";
        }

        public static String deviceRegister(Context context) {
            return getBaseUrl(context) + "/api/device/register";
        }

        public static String userInfo(Context context) {
            return getBaseUrl(context) + "/api/userinfo";
        }

        public static String walletRedeem(Context context) {
            return getBaseUrl(context) + "/api/wallet/redeem";
        }
    }
}
