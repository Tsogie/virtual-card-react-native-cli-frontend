package com.walla;

import android.content.Context;
import android.content.SharedPreferences;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class NFCModule extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "NFCModule";
    private SharedPreferences prefs;

    public NFCModule(ReactApplicationContext reactContext) {
        super(reactContext);
        prefs = reactContext.getSharedPreferences("AppPrefs", Context.MODE_PRIVATE);
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
    public void clearJwtToken(Promise promise) {
        try {
            prefs.edit().remove("jwt_token").apply();
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("CLEAR_FAILED", e);
        }
    }
}
