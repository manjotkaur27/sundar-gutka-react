const TrackPlayer = require("react-native-track-player").default;
const { Event, State } = require("react-native-track-player");
const AsyncStorage = require("@react-native-async-storage/async-storage").default;

/**
 * Background Playback Service (RNTP v4)
 *
 * This is the ONLY context where TrackPlayer API calls are safe to make in
 * response to OS/hardware events (lock-screen controls, headphones, Bluetooth,
 * Android notification actions, CarPlay / Android Auto).
 *
 * Runs in a separate JS context on a background thread — keep handlers lean.
 */
module.exports = async function () {
  let duckPauseTimer = null;
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
    if (duckPauseTimer) {
      clearTimeout(duckPauseTimer);
      duckPauseTimer = null;
    }

    // Keep stop idempotent: each call is guarded so one native failure does not
    // prevent remaining cleanup steps.
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

  // Seek bar scrub from lock-screen / notification
  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) =>
    TrackPlayer.seekTo(position)
  );

  // Skip buttons (notification compact view has Next; keep graceful no-ops)
  TrackPlayer.addEventListener(Event.RemoteNext, () =>
    TrackPlayer.skipToNext().catch(() => {})
  );

  TrackPlayer.addEventListener(Event.RemotePrevious, () =>
    TrackPlayer.skipToPrevious().catch(() => {})
  );

  // ── Audio focus / ducking (Android & iOS) ──────────────────────────────────
  TrackPlayer.addEventListener(Event.RemoteDuck, async ({ paused, permanent }) => {
    if (permanent) {
      // Permanent focus loss (e.g. another music app or video took over) — stop outright
      await safeStopAndReset();
    } else if (paused) {
      // Transient focus loss (e.g. Phone Call or Alarm)
      if (duckPauseTimer) {
        clearTimeout(duckPauseTimer);
        duckPauseTimer = null;
      }

      try {
        const playbackState = await TrackPlayer.getPlaybackState();
        const currentState = playbackState?.state ?? playbackState;
        const isAutoPlay = await getIsAutoPlay();
        
        // ONLY flag for resume if:
        // A) The audio was actually playing (not paused by user).
        // B) The user has Autoplay toggled ON in Settings.
        shouldResumeAfterDuck = isAutoPlay && (currentState === State.Playing || currentState === State.Buffering);
      } catch (_) {
        shouldResumeAfterDuck = false;
      }

      await TrackPlayer.pause();
    } else {
      // Focus regained (Phone call/Alarm ended)
      if (duckPauseTimer) {
        clearTimeout(duckPauseTimer);
        duckPauseTimer = null;
      }
      if (shouldResumeAfterDuck) {
        shouldResumeAfterDuck = false;
        await TrackPlayer.play().catch(() => {});
      }
    }
  });

  // ── Playback lifecycle ──────────────────────────────────────────────────────
  // Queue ended (track finished) — reset so UI reflects stopped state
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async ({ track, position }) => {
    if (track != null) {
      await safeStopAndReset();
    }
  });

  // Surface native playback errors to the JS error logger
  TrackPlayer.addEventListener(Event.PlaybackError, ({ code, message }) => {
    console.error("[TrackPlayer] Playback error:", code, message);
  });
};
