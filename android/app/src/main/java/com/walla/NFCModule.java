package com.walla;

import android.content.Context;
import android.content.SharedPreferences;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

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

    @ReactMethod
    public void clearQueue(Promise promise) {
        try {
            prefs.edit().remove("offline_queue").apply();
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
    public void saveDeviceKey(String deviceKey, Promise promise){
        try {
            prefs.edit().putString("device_key", deviceKey).apply();
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SAVE_FAILED", e);
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
