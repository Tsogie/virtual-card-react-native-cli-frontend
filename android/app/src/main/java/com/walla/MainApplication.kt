package com.walla

import android.app.Application
import androidx.work.Configuration
import androidx.work.WorkManager
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.walla.NFCModulePackage

class MainApplication : Application(), ReactApplication {

    override val reactHost: ReactHost by lazy {
        getDefaultReactHost(
            context = applicationContext,
            packageList = PackageList(this).packages.apply {
                // Manually add native module
                add(NFCModulePackage())
            },
        )
    }

    override fun onCreate() {
        super.onCreate()

        // Load React Native runtime
        loadReactNative(this)
    }
}


