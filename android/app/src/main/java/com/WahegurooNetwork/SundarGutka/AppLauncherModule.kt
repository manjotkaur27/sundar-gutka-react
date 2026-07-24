package com.WahegurooNetwork.SundarGutka

import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

// Launches another app's own launcher activity directly when it's installed,
// instead of routing through a market:// Play Store listing (which only ever
// opens the store page, never the target app itself). The target package must
// also be listed in AndroidManifest.xml's <queries> block, or Android 11+
// package-visibility rules make getLaunchIntentForPackage() return null for
// it unconditionally.
class AppLauncherModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "AppLauncher"

  @ReactMethod
  fun openApp(packageName: String, promise: Promise) {
    val launchIntent = reactApplicationContext.packageManager.getLaunchIntentForPackage(packageName)
    if (launchIntent == null) {
      promise.resolve(false)
      return
    }
    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactApplicationContext.startActivity(launchIntent)
    promise.resolve(true)
  }
}
