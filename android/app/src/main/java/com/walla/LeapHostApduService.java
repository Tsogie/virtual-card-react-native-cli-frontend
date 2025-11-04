package com.walla;

import android.content.SharedPreferences;
import android.nfc.cardemulation.HostApduService;
import android.os.Bundle;
import android.util.Log;

import com.walla.NFCModule;


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

    // ISO-7816 Status words
    private static final byte[] SW_OK = new byte[]{(byte) 0x90, (byte) 0x00};
    private static final byte[] SW_FAIL = new byte[]{(byte) 0x69, (byte) 0x85};

    // Example AID (must match your res/xml/apduservice.xml)
    private static final byte[] TEST_AID = new byte[]{
            (byte) 0xF0, (byte) 0x01, (byte) 0x02,
            (byte) 0x03, (byte) 0x04, (byte) 0x05, (byte) 0x06
    };

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(1500, TimeUnit.MILLISECONDS)
            .callTimeout(2500, TimeUnit.MILLISECONDS)
            .build();

    @Override
    public byte[] processCommandApdu(byte[] commandApdu, Bundle extras) {
        if (commandApdu == null) return SW_FAIL;
        Log.i(TAG, "Incoming APDU: " + bytesToHex(commandApdu));

        // ---- SELECT AID ----
        if (isSelectAid(commandApdu)) {
            Log.i(TAG, "SELECT AID received");
            return concat("LEAP_OK".getBytes(), SW_OK);
        }

        // ---- DEDUCT FARE (CLA=0x80, INS=0x10) ----
        if (commandApdu.length >= 9 &&
                commandApdu[0] == (byte) 0x80 &&
                commandApdu[1] == (byte) 0x10) {

            try {
                int lc = commandApdu[4] & 0xFF;
                byte[] data = new byte[lc];
                System.arraycopy(commandApdu, 5, data, 0, lc);

                int fare = ByteBuffer.wrap(data).getInt();
                Log.i(TAG, "DEDUCT fare=" + fare);

                SharedPreferences prefs = getSharedPreferences("AppPrefs", MODE_PRIVATE);
                String jwt = prefs.getString("jwt_token", null);

                Log.i(TAG, "Stored JWT: " + jwt);
                if (jwt == null) {
                    Log.w(TAG, "No JWT token stored");
                    return SW_FAIL;
                }

                // Run backend call asynchronously
                //result != null && 
                new Thread(() -> {
                    String result = redeemFareToBackend(jwt, fare);
                    Log.i(TAG, "Backend responded: " + result);
                    // Determine status
                       if (result != null && result.contains("Success")) {
                            NFCModule.sendEventToJS("success", "Fare deducted successfully");
                        } else if (result.contains("Invalid")) {
                            NFCModule.sendEventToJS("failure", "Invalid token or expired session");
                        } else {
                            NFCModule.sendEventToJS("failure", result);
                        }
                }).start();

                // Respond to reader immediately
                return SW_OK;

            } catch (Exception e) {
                Log.e(TAG, "Error processing DEDUCT APDU", e);
                return SW_FAIL;
            }
        }

        return SW_FAIL;
    }

    @Override
    public void onDeactivated(int reason) {
        Log.i(TAG, "HCE deactivated, reason=" + reason);
    }

    private boolean isSelectAid(byte[] apdu) {
        if (apdu.length < 4) return false;
        return (apdu[0] == (byte) 0x00 && apdu[1] == (byte) 0xA4 &&
                apdu[2] == (byte) 0x04 && apdu[3] == (byte) 0x00);
    }

    // ---- Call backend redeem endpoint ----
    private String redeemFareToBackend(String jwt, int fare) {
        JSONObject json = new JSONObject();
        try {
            json.put("token", jwt);
            json.put("fare", fare);
        } catch (JSONException e) {
            Log.e(TAG, "JSON error", e);
            return null;
        }

        RequestBody body = RequestBody.create(
                json.toString(),
                MediaType.parse("application/json")
        );

        Request request = new Request.Builder()
                .url("http://172.20.10.13:3000/api/wallet/redeem")
                .post(body)
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            return response.isSuccessful() ? response.body().string() : null;
        } catch (IOException e) {
            Log.e(TAG, "Network error", e);
            return null;
        }
    }

    // ---- Helper: concatenate byte arrays ----
    private byte[] concat(byte[] a, byte[] b) {
        byte[] result = new byte[a.length + b.length];
        System.arraycopy(a, 0, result, 0, a.length);
        System.arraycopy(b, 0, result, a.length, b.length);
        return result;
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02X", b));
        }
        return sb.toString();
    }

//     JSONArray offlineTxs = prefs.getJSONArray("offline_tx");
// offlineTxs.put({jwt, fare, timestamp});
// syncLater();

}
