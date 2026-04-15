const TrackPlayer = require("react-native-track-player").default;
const { Event, State } = require("react-native-track-player");
const AsyncStorage = require("@react-native-async-storage/async-storage").default;

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
    try { await TrackPlayer.pause(); } catch (_) {}
    try { await TrackPlayer.stop(); } catch (_) {}
    try { await TrackPlayer.reset(); } catch (_) {}
    shouldResumeAfterDuck = false;
  };

  // ── Remote control / notification actions ──────────────────────────────────
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, safeStopAndReset);

  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) =>
    TrackPlayer.seekTo(position)
  );

  TrackPlayer.addEventListener(Event.RemoteNext, () =>
    TrackPlayer.skipToNext().catch(() => {})
  );

  TrackPlayer.addEventListener(Event.RemotePrevious, () =>
    TrackPlayer.skipToPrevious().catch(() => {})
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
        const wasPlaying =
          currentState === State.Playing || currentState === State.Buffering;

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
