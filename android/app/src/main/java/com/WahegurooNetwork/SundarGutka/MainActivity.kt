package com.WahegurooNetwork.SundarGutka

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import org.devio.rn.splashscreen.SplashScreen
import android.os.Bundle
import android.view.KeyEvent
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : ReactActivity() {
 
  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "SundarGutka"

  override fun onCreate(savedInstanceState: Bundle?) {
      SplashScreen.show(this)
      super.onCreate(null)
      // Lay out content edge-to-edge so the window draws behind system bars.
      WindowCompat.setDecorFitsSystemWindows(window, false)
  }

  /**
   * Called every time the window regains/loses focus. We re-apply sticky-immersive
   * flags here so they survive notification shade pulls, lock/unlock cycles, etc.
   */
  override fun onWindowFocusChanged(hasFocus: Boolean) {
      super.onWindowFocusChanged(hasFocus)
      if (hasFocus) {
          hideSystemBars()
      }
  }

  /**
   * Set BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE so the system bars (status bar +
   * gesture navigation bar) are hidden by default and reappear transiently when
   * the user swipes from an edge, then auto-hide again without any app interaction.
   */
  private fun hideSystemBars() {
      val controller = WindowInsetsControllerCompat(window, window.decorView)
      controller.systemBarsBehavior =
          WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
      controller.hide(WindowInsetsCompat.Type.systemBars())
  }
 
  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  /**
   * Safely handle system dialog operations to prevent SecurityException
   */
  private fun safeCloseSystemDialogs() {
    try {
      // Check if we have the permission and are on a compatible API level
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P && 
          checkSelfPermission("android.permission.BROADCAST_CLOSE_SYSTEM_DIALOGS") == PackageManager.PERMISSION_GRANTED) {
        val closeDialogIntent = Intent(Intent.ACTION_CLOSE_SYSTEM_DIALOGS)
        sendBroadcast(closeDialogIntent)
      }
    } catch (e: SecurityException) {
      // Log the exception but don't crash
      e.printStackTrace()
    } catch (e: Exception) {
      // Handle any other exceptions
      e.printStackTrace()
    }
  }

  /**
   * Override onKeyDown to safely handle system dialog operations
   */
  override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
    try {
      return super.onKeyDown(keyCode, event)
    } catch (e: SecurityException) {
      // If we get a SecurityException, try to handle it gracefully
      if (e.message?.contains("BROADCAST_CLOSE_SYSTEM_DIALOGS") == true) {
        // Log the issue but don't crash
        e.printStackTrace()
        return true // Consume the event
      }
      throw e // Re-throw if it's not related to our permission
    }
  }
}