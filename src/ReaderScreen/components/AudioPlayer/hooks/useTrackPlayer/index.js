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
  getFullLocalTrackPath,
  touchPrefetchTrack,
  prunePrefetchCache,
} from "../../utils/audioDownloader";

const useTrackPlayer = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState(null);
  const playbackState = usePlaybackState();
  const progress = useProgress(250);
  const [isPlaying, setIsPlaying] = useState(false);
  const isAudio = useSelector((state) => state.isAudio);
  const isAudioFeatureEnabled = useSelector((state) => state.isAudioFeatureEnabled);
  const isAudioFeatureOn = isAudioFeatureEnabled ?? true;
  const progressRef = useRef(progress);
  const currentTrackIdRef = useRef(null);
  const prefetchInFlightRef = useRef(new Map());
  const seekInFlightRef = useRef(false);
  const pendingSeekRef = useRef(null);
  // Tracks whether the user had an active play session before a buffer stall.
  // Used by the auto-resume logic to distinguish a mid-play stall from an
  // intentional pause/stop.
  const wasPlayingBeforeBufferRef = useRef(false);

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

  // Track play/stop transitions so the auto-resume knows when a stall is
  // mid-playback vs. an intentional pause.
  useEffect(() => {
    if (playbackState?.state === State.Playing) {
      wasPlayingBeforeBufferRef.current = true;
    } else if (
      playbackState?.state === State.Stopped ||
      playbackState?.state === State.None
    ) {
      wasPlayingBeforeBufferRef.current = false;
    }
  }, [playbackState?.state]);

  // Auto-resume: when the buffer refills (State.Ready after a stall) and the
  // user was playing before, immediately kick the player back into Playing.
  // This is the primary recovery path — instant, no delay.
  useEffect(() => {
    if (!isInitialized || !isAudio || !isAudioFeatureOn) return;
    if (playbackState?.state !== State.Ready) return;
    if (!wasPlayingBeforeBufferRef.current) return; // don't auto-play on initial load

    TrackPlayer.play().catch(() => {});
  }, [isInitialized, isAudio, isAudioFeatureOn, playbackState?.state]);

  // Hard-fallback watchdog: if the player stays in State.Buffering for 2.5s
  // without transitioning to State.Ready, kick it anyway. Covers edge cases
  // where the state machine doesn't emit Ready (can happen on some Android OEMs).
  useEffect(() => {
    if (!isInitialized || !isAudio || !isAudioFeatureOn) return;
    if (playbackState?.state !== State.Buffering) return;
    if (!wasPlayingBeforeBufferRef.current) return;

    const timer = setTimeout(() => {
      TrackPlayer.play().catch(() => {});
    }, 500);

    return () => clearTimeout(timer);
  }, [isInitialized, isAudio, isAudioFeatureOn, playbackState?.state]);

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

    pendingSeekRef.current = numericPosition;
    if (seekInFlightRef.current) {
      return;
    }

    seekInFlightRef.current = true;

    try {
      while (pendingSeekRef.current != null) {
        const targetPosition = pendingSeekRef.current;
        pendingSeekRef.current = null;

        // Capture playing state via native API (React state is stale in async).
        // Used by both seek paths to auto-resume after the seek settles.
        const playbackStateNow = await TrackPlayer.getPlaybackState().catch(() => null);
        const wasPlaying = playbackStateNow?.state === State.Playing ||
          playbackStateNow?.state === State.Buffering;

        const activeTrack = await TrackPlayer.getActiveTrack();
        if (!activeTrack) {
          return;
        }

        // --- Fast-seek: reload from a local copy when streaming from remote ---
        // Seeking in a remote HTTP stream triggers buffering (~30s delay).
        // If the full downloaded file or the background-prefetch file already
        // exists on disk, silently swap to it and seek locally instead.
        if (activeTrack?.url && !isLocalFile(activeTrack.url)) {
          const remoteUrl = activeTrack.url;

          // Priority 1: user-explicitly-downloaded copy (permanent, full quality)
          const fullDownloadedPath = getFullLocalTrackPath(remoteUrl);
          // Priority 2: background prefetch copy (temporary LRU cache)
          const prefetchPath = getFullPrefetchTrackPath(remoteUrl);

          let localPath = null;
          try {
            if (await exists(fullDownloadedPath)) {
              localPath = fullDownloadedPath;
            } else if (await exists(prefetchPath)) {
              localPath = prefetchPath;
              await touchPrefetchTrack(remoteUrl).catch(() => {});
            }
          } catch (_) {
            // exists() failure is non-fatal; fall through to plain remote seek.
          }

          if (localPath) {
            try {

              const nativeProgressBeforeSwap = await TrackPlayer.getProgress().catch(() => null);
              const nativeDuration = Number(nativeProgressBeforeSwap?.duration);
              const metaDuration = Number(activeTrack?.duration);
              const knownDuration =
                Number.isFinite(nativeDuration) && nativeDuration > 0
                  ? nativeDuration
                  : Number.isFinite(metaDuration) && metaDuration > 0
                  ? metaDuration
                  : null;

              const maxSeekable = knownDuration != null ? Math.max(0, knownDuration - 0.5) : null;
              const safePosition =
                maxSeekable != null
                  ? Math.min(Math.max(0, targetPosition), maxSeekable)
                  : Math.max(0, targetPosition);

              // Reload with local file — this is fast (disk I/O, no network).
              await TrackPlayer.reset();
              await addTrack({
                ...activeTrack,
                url: formatUrlForTrackPlayer(localPath),
              });
              await TrackPlayer.seekTo(safePosition);
              if (wasPlaying) {
                await playTrack();
              }
              // Update the ref so subsequent operations know the track is local.
              currentTrackIdRef.current = activeTrack.id;
              return;
            } catch (swapError) {
              logError("Fast-seek local swap failed, falling back to remote seek:", swapError);
              // Fall through to the original remote seekTo path below.
            }
          }

          // No local copy yet — kick off a background prefetch so future seeks
          // are instant, but don't block the current seek on it.
          prefetchForSeek({
            ...activeTrack,
            id: activeTrack.id,
            url: activeTrack.url,
            title: activeTrack.title,
            artist: activeTrack.artist,
          });
        }

        // --- Original remote seek path (fallback or already-local track) ---
        const nativeProgress = await TrackPlayer.getProgress().catch(() => null);

        const nativeDuration = Number(nativeProgress?.duration);
        const runtimeDuration = Number(progressRef.current?.duration);
        const metadataDuration = Number(activeTrack?.duration);

        let knownDuration = null;
        if (Number.isFinite(nativeDuration) && nativeDuration > 0) {
          knownDuration = nativeDuration;
        } else if (Number.isFinite(runtimeDuration) && runtimeDuration > 0) {
          knownDuration = runtimeDuration;
        } else if (Number.isFinite(metadataDuration) && metadataDuration > 0) {
          knownDuration = metadataDuration;
        }

        const maxSeekable = knownDuration != null ? Math.max(0, knownDuration - 0.5) : null;
        const safePosition =
          maxSeekable != null
            ? Math.min(Math.max(0, targetPosition), maxSeekable)
            : Math.max(0, targetPosition);

        await TrackPlayer.seekTo(safePosition);
        // Android (and occasionally iOS) transitions to Paused after seekTo
        // even when the track was playing before the seek. Auto-resume so the
        // user never has to spam the play button.
        if (wasPlaying) {
          await playTrack();
        }
      }
    } catch (error) {
      logError("Error seeking to position:", error);
    } finally {
      seekInFlightRef.current = false;
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
        artwork: require("../../../../../../images/sundar_gutka_icon.png"),
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

      // No background prefetch on play-start — downloading the full file while
      // simultaneously streaming it starves the stream buffer on low-bandwidth
      // connections and causes audio to go mute. Prefetch is triggered by seekTo
      // instead, which is a more appropriate time (user has already buffered).
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
    isBuffering: playbackState?.state === State.Buffering,
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
