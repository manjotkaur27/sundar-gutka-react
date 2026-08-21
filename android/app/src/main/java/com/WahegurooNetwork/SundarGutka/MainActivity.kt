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
import androidx.activity.OnBackPressedCallback
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : ReactActivity() {
 
  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "SundarGutka"

  /**
   * Routes the system back gesture into React Native.
   *
   * ── Why this has to exist ─────────────────────────────────────────────────
   * React Native 0.78 handles back by overriding the DEPRECATED
   * Activity.onBackPressed(). Nothing in the React Native AAR registers an
   * OnBackPressedCallback.
   *
   * This app targets SDK 36, and from Android 16 the platform no longer calls
   * onBackPressed() — back is delivered through OnBackInvokedDispatcher, which
   * androidx forwards to onBackPressedDispatcher. With no callback registered
   * there, the dispatcher falls through to its default and FINISHES THE
   * ACTIVITY. The press never reached JavaScript, so every screen exited the app
   * instead of navigating back, and no amount of BackHandler work in JS could
   * have caught it — BackHandler was never being called.
   *
   * Registering here restores the delivery path. It is deliberately not gated on
   * an API level: on older devices the legacy onBackPressed() override inside
   * ReactActivity consumes the press before the dispatcher is ever consulted, so
   * this callback simply does not fire and behaviour is unchanged.
   */
  private val backPressedCallback = object : OnBackPressedCallback(true) {
      override fun handleOnBackPressed() {
          // Hands the press to JS exactly as ReactActivity.onBackPressed() did:
          // React Navigation, then any screen's BackHandler listener.
          if (!reactActivityDelegate.onBackPressed()) {
              // No React instance yet (very early startup) — act like the platform.
              isEnabled = false
              this@MainActivity.onBackPressedDispatcher.onBackPressed()
              isEnabled = true
          }
      }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
      SplashScreen.show(this)
      super.onCreate(null)
      // Lay out content edge-to-edge so the window draws behind system bars.
      WindowCompat.setDecorFitsSystemWindows(window, false)
      onBackPressedDispatcher.addCallback(this, backPressedCallback)
  }

  /**
   * Called by React Native when NO JavaScript listener consumed the press — i.e.
   * there is nothing left to go back to.
   *
   * The inherited implementation calls super.onBackPressed(), which now routes
   * through OnBackPressedDispatcher and straight back into the callback above,
   * round and round forever. Disabling the callback for the duration lets the
   * dispatcher fall through to the platform default instead, which is exactly
   * what leaving the app used to mean.
   */
  override fun invokeDefaultOnBackPressed() {
      backPressedCallback.isEnabled = false
      onBackPressedDispatcher.onBackPressed()
      backPressedCallback.isEnabled = true
  }

  /**
   * Called every time the window regains/loses focus. We re-apply sticky-immersive
   * flags here so they survive notification shade pulls, lock/unlock cycles, etc.
   */
  override fun onWindowFocusChanged(hasFocus: Boolean) {
      super.onWindowFocusChanged(hasFocus)
      if (hasFocus) {
          hideNavigationBar()
      }
  }

  /**
   * Hides the NAVIGATION bar only, and re-applies it above so it survives a
   * notification shade pull or a lock/unlock.
   *
   * It used to hide `Type.systemBars()`, which is the navigation bar AND the
   * status bar. That is what made the app's own Hide Status Bar setting look
   * broken: React Native's StatusBar component would show the bar as the user
   * asked, and the next focus change — a shade pull, a dialog closing,
   * unlocking the phone — hid it again a moment later. The setting was being
   * saved correctly all along; it simply never survived contact with this
   * method, which is also why turning it off appeared to do nothing after a
   * relaunch.
   *
   * Narrowing it to the navigation bar hands the status bar back to the JS
   * setting, which is the only thing that should be deciding it, and leaves
   * every other assumption in the app untouched: the navigation bar stays
   * hidden exactly as before, so the bottom inset stays zero and nothing that
   * lays out against it — the audio player, its progress track, the dialogs —
   * moves a pixel.
   */
  private fun hideNavigationBar() {
      val controller = WindowInsetsControllerCompat(window, window.decorView)
      controller.systemBarsBehavior =
          WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
      controller.hide(WindowInsetsCompat.Type.navigationBars())
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