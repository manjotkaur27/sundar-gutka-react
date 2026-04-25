import Foundation
import MediaPlayer
import React

/// Native module that gives JS direct access to MPNowPlayingInfoCenter.
/// This avoids patching react-native-track-player for the iPad Control Center
/// "paused" state bug: after reset→add→play, the playbackRate in NowPlayingInfo
/// can get stuck at 0 because the audio session reactivates slowly on iPad.
///
/// Usage from JS:
///   import { NativeModules } from 'react-native';
///   NativeModules.NowPlayingHelper.forcePlaybackRate(1.0);
@objc(NowPlayingHelper)
class NowPlayingHelper: NSObject {

  /// Forces the playbackRate in MPNowPlayingInfoCenter to the given value.
  /// This is the ONLY way to make the Control Center show the correct
  /// play/pause button state when the audio session is slow to activate.
  @objc
  func forcePlaybackRate(_ rate: Double) {
    DispatchQueue.main.async {
      var info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
      info[MPNowPlayingInfoPropertyPlaybackRate] = rate
      // Also update elapsed time so the progress bar stays in sync
      info[MPNowPlayingInfoPropertyElapsedPlaybackTime] =
        info[MPNowPlayingInfoPropertyElapsedPlaybackTime] ?? 0
      MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }
  }

  /// Tells React Native this module's methods can be called from any thread.
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
