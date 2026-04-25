const TrackPlayer = require("react-native-track-player").default;
const { Event, State } = require("react-native-track-player");
const AsyncStorage = require("@react-native-async-storage/async-storage").default;
const { Platform } = require("react-native");

/**
 * Background Playback Service (RNTP v4)
 *
 * Handles OS/hardware events: lock-screen controls, headphones, Bluetooth,
 * Android notification actions, phone calls, alarms.
 *
 * Call/alarm interruption logic:
 *  - Autoplay OFF → pause on interrupt, stay paused forever.
 *  - Autoplay ON  → pause on interrupt, auto-resume when interrupt ends.
 *  - Notification volume duck → OS handles volume dip natively, no pause.
 */
module.exports = async function () {
  let shouldResumeAfterDuck = false;

  const getIsAutoPlay = async () => {
    try {
      const rawState = await AsyncStorage.getItem("persist:root");
      if (rawState) {
        const state = JSON.parse(rawState);
        return JSON.parse(state.isAudioAutoPlay || "false");
      }
    } catch (e) {
      console.error("Failed to read autoplay pref", e);
    }
    return false;
  };

  const safeStopAndReset = async () => {
    try {
      await TrackPlayer.pause();
    } catch (_) {}
    try {
      await TrackPlayer.stop();
    } catch (_) {}
    try {
      await TrackPlayer.reset();
    } catch (_) {}
    shouldResumeAfterDuck = false;
  };

  // ── Remote control / notification actions ──────────────────────────────────
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, safeStopAndReset);

  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => TrackPlayer.seekTo(position));

  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext().catch(() => {}));

  TrackPlayer.addEventListener(Event.RemotePrevious, () =>
    TrackPlayer.skipToPrevious().catch(() => {}),
  );

  // ── Audio focus / call & alarm interruptions ───────────────────────────────
  //
  // RemoteDuck fires for ALL audio focus changes:
  //  • permanent=true          → another app took audio (Spotify, YouTube)
  //  • permanent=false, paused → transient loss (phone call, alarm)
  //  • permanent=false, !paused→ focus regained (call/alarm ended)
  //
  // Notification sound ducks do NOT fire paused=true — the OS just lowers
  // volume briefly and restores it. We don't need to handle that case.
  TrackPlayer.addEventListener(Event.RemoteDuck, async ({ paused, permanent }) => {
    if (permanent) {
      // Another app took audio permanently. Stay paused, never auto-resume.
      shouldResumeAfterDuck = false;
      await TrackPlayer.pause().catch(() => {});
      return;
    }

    if (paused) {
      // Call/alarm arrived. Check if we should resume when it ends.
      shouldResumeAfterDuck = false;

      try {
        const [playbackState, isAutoPlay] = await Promise.all([
          TrackPlayer.getPlaybackState(),
          getIsAutoPlay(),
        ]);

        const currentState = playbackState?.state ?? playbackState;
        const wasPlaying = currentState === State.Playing || currentState === State.Buffering;

        // Resume after interrupt ONLY if autoplay is ON AND audio was playing.
        shouldResumeAfterDuck = isAutoPlay && wasPlaying;
      } catch (_) {
        shouldResumeAfterDuck = false;
      }

      await TrackPlayer.pause().catch(() => {});
      return;
    }

    // Focus regained — call/alarm ended.
    if (shouldResumeAfterDuck) {
      shouldResumeAfterDuck = false;
      // Brief delay so the OS audio session is fully restored on all OEMs.
      await new Promise((resolve) => setTimeout(resolve, 300));
      await TrackPlayer.play().catch(() => {});
    }
  });

  // ── iOS Control Center / Lock Screen fix ────────────────────────────────────
  //
  // On iOS, the MPNowPlayingInfoCenter determines the play/pause button state
  // from the `playbackRate` in NowPlayingInfo. After a reset→add→play sequence,
  // the rate can get stuck at 0 because:
  //   1. reset() clears NowPlayingInfo and deactivates the audio session
  //   2. add() fires with playWhenReady=false, so playbackRate is set to 0
  //   3. play() sets playWhenReady=true, but the audio session may not be
  //      fully re-activated yet, causing iOS to ignore the rate update
  //
  // The key insight: updateNowPlayingMetadata() only updates title/artist/
  // duration — it does NOT touch playbackRate. We must call setRate() which
  // triggers the native updateNowPlayingPlaybackValues() that correctly
  // sets playbackRate = playWhenReady ? rate : 0.
  //
  // Two attempts with increasing delay cover both fast (local) and slow
  // (streaming) audio session reactivation in release builds.
  if (Platform.OS === "ios") {
    const forceNowPlayingRateSync = async () => {
      try {
        const playbackState = await TrackPlayer.getPlaybackState().catch(() => null);
        const currentState = playbackState?.state ?? playbackState;
        // Only sync if the player is actually playing — avoid overwriting
        // a user-initiated pause.
        if (currentState !== State.Playing) return;

        const currentRate = await TrackPlayer.getRate().catch(() => 1);
        // Re-setting the same rate triggers native updateNowPlayingPlaybackValues()
        // which sets playbackRate = playWhenReady ? rate : 0.
        // Since the player is in Playing state, playWhenReady is true, so
        // this correctly sets playbackRate > 0 → iOS shows the pause button.
        await TrackPlayer.setRate(currentRate);
      } catch (_) {
        // Non-critical — worst case the button stays stale until next
        // native state change refreshes it.
      }
    };

    TrackPlayer.addEventListener(Event.PlaybackState, async ({ state }) => {
      if (state === State.Playing) {
        // First attempt: 500ms gives the audio session time to fully activate.
        // In release builds, the native bridge is ~10× faster than debug,
        // so the 150ms delay from the previous fix was too short.
        setTimeout(forceNowPlayingRateSync, 500);
        // Second attempt: 1200ms covers cases where the audio session
        // reactivation takes longer (e.g., first play after app launch,
        // or when switching from Bluetooth to speaker).
        setTimeout(forceNowPlayingRateSync, 1200);
      }
    });
  }

  // ── Playback lifecycle ──────────────────────────────────────────────────────
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async ({ track }) => {
    if (track != null) {
      await safeStopAndReset();
    }
  });

  TrackPlayer.addEventListener(Event.PlaybackError, ({ code, message }) => {
    console.error("[TrackPlayer] Playback error:", code, message);
  });
};
