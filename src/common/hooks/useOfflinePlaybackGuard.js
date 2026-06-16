import { useEffect } from "react";
import { useDispatch } from "react-redux";
import TrackPlayer from "react-native-track-player";
import { stopTrack, resetPlayer } from "../TrackPlayerUtils";
import * as actions from "../actions";
import { useNetwork } from "../context";

/**
 * Offline-playback guard — the Spotify/YT-style reaction to losing connectivity.
 *
 * When the device loses REAL internet, a track that is STREAMING from the
 * network can no longer continue, so we stop it cleanly and collapse the audio
 * UI. A downloaded track (file://) is untouched and keeps playing.
 *
 * Event-driven: this effect re-runs only when `isOffline` flips, so it reacts
 * the instant the OS reports the change — no polling, no timers. Mounted once
 * globally (see GlobalServices in app.js) instead of per-screen.
 */
const useOfflinePlaybackGuard = () => {
  const { isOffline } = useNetwork();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isOffline) return undefined;

    let cancelled = false;
    (async () => {
      const activeTrack = await TrackPlayer.getActiveTrack().catch(() => null);
      if (cancelled) return;
      // Nothing playing, or a local download is playing → leave it alone.
      if (!activeTrack || activeTrack.url?.startsWith("file://")) return;
      await stopTrack();
      await resetPlayer();
      dispatch(actions.toggleAudio(false));
    })();

    return () => {
      cancelled = true;
    };
  }, [isOffline, dispatch]);
};

export default useOfflinePlaybackGuard;
