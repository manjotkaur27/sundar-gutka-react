import { useState, useEffect, useCallback, useRef } from "react";
import { exists } from "react-native-fs";
import TrackPlayer, { usePlaybackState, useProgress, State } from "react-native-track-player";
import { useSelector } from "react-redux";
import {
  addTrack,
  playTrack,
  pauseTrack,
  stopTrack,
  resetPlayer,
  TrackPlayerSetup,
  getTrackPlayerState,
} from "@common/TrackPlayerUtils";
import { logError, logMessage } from "@common";
import { formatUrlForTrackPlayer, isLocalFile } from "../../utils/urlHelper";
import {
  downloadAudioOnly,
  getFullPrefetchTrackPath,
  touchPrefetchTrack,
  prunePrefetchCache,
} from "../../utils/audioDownloader";

const useTrackPlayer = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState(null);
  const playbackState = usePlaybackState();
  const progress = useProgress();
  const [isPlaying, setIsPlaying] = useState(false);
  const isAudio = useSelector((state) => state.isAudio);
  const isAudioFeatureEnabled = useSelector((state) => state.isAudioFeatureEnabled);
  const isAudioFeatureOn = isAudioFeatureEnabled ?? true;
  const progressRef = useRef(progress);
  const currentTrackIdRef = useRef(null);
  const prefetchInFlightRef = useRef(new Map());

  const configurePlayer = useCallback(async () => {
    setInitializationError(null);
    setIsInitializing(true);
    try {
      // Use singleton service for initialization
      await TrackPlayerSetup();

      // Check state from singleton
      const state = getTrackPlayerState();
      setIsInitialized(state.isInitialized);
    } catch (error) {
      logError("Error initializing TrackPlayer:", error);
      setIsInitialized(false);
      setInitializationError(error);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  const retryInitialization = useCallback(async () => {
    if (isInitializing) {
      return;
    }
    await configurePlayer();
  }, [configurePlayer, isInitializing]);

  useEffect(() => {
    (async () => {
      await configurePlayer();
    })();
  }, [configurePlayer]);

  useEffect(() => {
    if (!isInitialized) return;
    setIsPlaying(playbackState?.state === State.Playing);
  }, [playbackState, isInitialized]);

  useEffect(() => {
    const teardownWhenFeatureDisabled = async () => {
      if (!isInitialized || isAudioFeatureOn) {
        return;
      }
      try {
        await stopTrack();
      } catch (_) {}
      try {
        await resetPlayer();
      } catch (_) {}
      currentTrackIdRef.current = null;
      setIsPlaying(false);
    };

    teardownWhenFeatureDisabled();
  }, [isInitialized, isAudioFeatureOn]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const prefetchForSeek = useCallback(async (track) => {
    if (!track?.id || !track?.url || isLocalFile(track.url)) return null;

    const trackKey = String(track.id);
    if (prefetchInFlightRef.current.has(trackKey)) {
      return prefetchInFlightRef.current.get(trackKey);
    }

    const prefetchPromise = (async () => {
      try {
        const fullLocalPath = getFullPrefetchTrackPath(track.url);
        const alreadyExists = await exists(fullLocalPath);
        if (!alreadyExists) {
          await downloadAudioOnly(track.url, track.title || track.artist || "Track", {
            targetDirectory: "prefetch",
          });
        }

        const ready = await exists(fullLocalPath);
        if (!ready) return null;

        // Keep last 5 prefetched tracks for quick seek without re-download churn.
        await touchPrefetchTrack(track.url);
        await prunePrefetchCache(5);

        return fullLocalPath;
      } catch (error) {
        logError("Prefetch for seek failed:", error);
        return null;
      } finally {
        prefetchInFlightRef.current.delete(trackKey);
      }
    })();

    prefetchInFlightRef.current.set(trackKey, prefetchPromise);
    return prefetchPromise;
  }, []);

  const play = async () => {
    if (!isInitialized || !isAudio || !isAudioFeatureOn) {
      logMessage("Audio is not initialized or disabled in settings");
      return;
    }
    try {
      await playTrack();
    } catch (error) {
      logError("Error playing track:", error);
    }
  };

  const pause = async () => {
    try {
      await pauseTrack();
    } catch (error) {
      logError("Error pausing track:", error);
    }
  };

  const stop = async () => {
    if (!isInitialized) return;
    try {
      await stopTrack();
    } catch (error) {
      logError("Error stopping track:", error);
    }
  };

  const reset = async () => {
    if (!isInitialized) return;
    try {
      await resetPlayer();
    } catch (error) {
      logError("Error resetting player:", error);
    }
  };

  const seekTo = async (position) => {
    if (!isInitialized || !isAudio || !isAudioFeatureOn) {
      logMessage("Audio is not initialized or disabled in settings");
      return;
    }

    const numericPosition = Number(position);
    if (!Number.isFinite(numericPosition) || numericPosition < 0) {
      return;
    }

    try {
      const activeTrack = await TrackPlayer.getActiveTrack();

      // Keep seek path stable: do not reset/re-add player while seeking.
      // Resetting around seek can desync duration metadata on Android and throw
      // IO_READ_POSITION_OUT_OF_RANGE for valid-looking slider positions.
      if (activeTrack?.url && !isLocalFile(activeTrack.url)) {
        prefetchForSeek({
          ...activeTrack,
          id: activeTrack.id,
          url: activeTrack.url,
          title: activeTrack.title,
          artist: activeTrack.artist,
        });
      }

      const nativeProgress = await TrackPlayer.getProgress().catch(() => null);
      const candidateDurations = [
        Number(nativeProgress?.duration),
        Number(progressRef.current?.duration),
        Number(activeTrack?.duration),
      ].filter((value) => Number.isFinite(value) && value > 0);

      const knownDuration = candidateDurations.length ? Math.max(...candidateDurations) : null;
      const safePosition =
        knownDuration != null
          ? Math.min(Math.max(0, numericPosition), Math.max(0, knownDuration - 0.25))
          : Math.max(0, numericPosition);

      await TrackPlayer.seekTo(safePosition);
    } catch (error) {
      logError("Error seeking to position:", error);
    }
  };

  const addAndPlayTrack = async (
    id,
    url,
    title,
    artist,
    lyricsUrl,
    trackLengthSec,
    trackSizeMB,
    shouldPlay = true,
    fallbackUrl = null
  ) => {
    if (!isInitialized || !isAudio || !isAudioFeatureOn) {
      logMessage("Audio is not initialized or disabled in settings");
      return;
    }

    try {
      let playbackUrl = url;

      // If pointing to a local file, verify it exists; otherwise fall back to remote URL when provided
      if (isLocalFile(url)) {
        const filePath = url.startsWith("file://") ? url.replace(/^file:\/\//, "") : url;
        const fileExists = await exists(filePath);
        if (!fileExists) {
          if (fallbackUrl) {
            playbackUrl = fallbackUrl;
          } else {
            logMessage("Local audio missing and no fallback URL available");
            return;
          }
        }
      }

      if (!isLocalFile(playbackUrl)) {
        const prefetchPath = getFullPrefetchTrackPath(playbackUrl);
        const hasPrefetchedAudio = await exists(prefetchPath);
        if (hasPrefetchedAudio) {
          playbackUrl = prefetchPath;
          // Refresh LRU stamp when reusing a cached track.
          await touchPrefetchTrack(url);
          await prunePrefetchCache(5);
        }
      }

      const track = {
        id,
        url: formatUrlForTrackPlayer(playbackUrl),
        title,
        artist,
        duration: trackLengthSec, // RNTP reads 'duration' — enables instant slider + seek
        lyricsUrl,
        trackSizeMB,
      };

      currentTrackIdRef.current = id;

      await reset();
      await addTrack(track);

      if (shouldPlay) {
        await play();
      }

      // Prefetch the full audio file in background to enable instant local seeks.
      // This only runs when we are streaming from a remote URL.
      if (!isLocalFile(playbackUrl)) {
        prefetchForSeek({ ...track, url: playbackUrl });
      }
    } catch (error) {
      logError("Error adding and playing track:", error);
    }
  };

  const setRate = async (rate) => {
    if (!isInitialized) {
      logMessage("Audio is not initialized");
      return;
    }
    try {
      await TrackPlayer.setRate(rate);
    } catch (error) {
      logError("Error setting playback rate:", error);
    }
  };

  return {
    isPlaying,
    playbackState,
    progress,
    play,
    pause,
    stop,
    reset,
    addAndPlayTrack,
    seekTo,
    setRate,
    isAudioEnabled: isAudio && isInitialized && isAudioFeatureOn,
    isInitialized,
    setIsPlaying,
    isInitializing,
    initializationError,
    retryInitialization,
  };
};

export default useTrackPlayer;
