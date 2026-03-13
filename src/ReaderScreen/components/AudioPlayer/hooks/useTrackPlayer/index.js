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
import { downloadAudioOnly, getFullLocalTrackPath } from "../../utils/audioDownloader";

const useTrackPlayer = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState(null);
  const playbackState = usePlaybackState();
  const progress = useProgress();
  const [isPlaying, setIsPlaying] = useState(false);
  const isAudio = useSelector((state) => state.isAudio);
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

    // Cleanup function
    return () => {
      // Cleanup on unmount
      const cleanup = async () => {
        try {
          // Stop any active playback when component unmounts
          await stopTrack();
        } catch (error) {
          logError("Error during cleanup:", error);
        }
      };
      cleanup();
    };
  }, [configurePlayer]);

  useEffect(() => {
    if (!isInitialized) return;
    setIsPlaying(playbackState?.state === State.Playing);
  }, [playbackState, isInitialized]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const prefetchForSeek = useCallback(
    async (track) => {
      if (!track?.id || !track?.url || isLocalFile(track.url)) return null;

      if (prefetchInFlightRef.current.has(track.id)) {
        return prefetchInFlightRef.current.get(track.id);
      }

      const prefetchPromise = (async () => {
        try {
          const fullLocalPath = getFullLocalTrackPath(track.url);
          const alreadyExists = await exists(fullLocalPath);
          if (!alreadyExists) {
            await downloadAudioOnly(track.url, track.title || track.artist || "Track");
          }

          const ready = await exists(fullLocalPath);
          if (!ready) return null;

          if (currentTrackIdRef.current === track.id && !isLocalFile(track.url)) {
            const wasPlaying = playbackState?.state === State.Playing;
            const position = progressRef.current?.position || 0;
            const localTrack = {
              ...track,
              url: formatUrlForTrackPlayer(fullLocalPath),
            };

            await reset();
            await addTrack(localTrack);
            if (position > 0) {
              await TrackPlayer.seekTo(position);
            }
            if (wasPlaying) {
              await play();
            }
          }

          return fullLocalPath;
        } catch (error) {
          logError("Prefetch for seek failed:", error);
          return null;
        } finally {
          prefetchInFlightRef.current.delete(track.id);
        }
      })();

      prefetchInFlightRef.current.set(track.id, prefetchPromise);
      return prefetchPromise;
    },
    [playbackState, reset, addTrack, play]
  );

  const play = async () => {
    if (!isInitialized || !isAudio) {
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
    if (!isInitialized || !isAudio) {
      logMessage("Audio is not initialized or disabled in settings");
      return;
    }
    try {
      await TrackPlayer.seekTo(position);
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
    if (!isInitialized || !isAudio) {
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
    isAudioEnabled: isAudio && isInitialized,
    isInitialized,
    setIsPlaying,
    isInitializing,
    initializationError,
    retryInitialization,
  };
};

export default useTrackPlayer;
