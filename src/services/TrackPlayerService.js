const TrackPlayer = require("react-native-track-player").default;
const { Event } = require("react-native-track-player");

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
  // ── Remote control / notification actions ──────────────────────────────────
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());

  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());

  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    await TrackPlayer.stop();
    await TrackPlayer.reset();
  });

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

  // ── Audio focus / ducking (Android) ────────────────────────────────────────
  // Pause on incoming call / notification; resume when focus returns.
  TrackPlayer.addEventListener(Event.RemoteDuck, async ({ paused, permanent }) => {
    if (permanent) {
      // Permanent focus loss (e.g. another music app took over) — stop outright
      await TrackPlayer.stop();
    } else if (paused) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  });

  // ── Playback lifecycle ──────────────────────────────────────────────────────
  // Queue ended (track finished) — reset so UI reflects stopped state
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async ({ track, position }) => {
    if (track != null) {
      await TrackPlayer.reset();
    }
  });

  // Surface native playback errors to the JS error logger
  TrackPlayer.addEventListener(Event.PlaybackError, ({ code, message }) => {
    console.error("[TrackPlayer] Playback error:", code, message);
  });
};
