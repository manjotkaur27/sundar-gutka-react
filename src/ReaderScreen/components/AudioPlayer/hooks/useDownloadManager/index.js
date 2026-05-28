import { useState, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { stopDownload, unlink, exists, stat } from "react-native-fs";
import { logError, trackTrackDownload } from "@common";
import { downloadTrack, getFullLocalTrackPath } from "../../utils/audioDownloader";

const useDownloadManager = (currentPlaying, addTrackToManifest, isTrackDownloaded, baniID, baniTitle) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  // Ref-based in-flight guard: prevents a second download from starting if
  // currentPlaying.audioUrl changes while a download is already running.
  const downloadingRef = useRef(false);
  // Stores the RNFS download jobId so the watchdog can cancel the native
  // download task instead of just hiding the badge and abandoning it.
  const downloadJobIdRef = useRef(null);
  // Prevents retry within the same track session after the watchdog fires.
  // Without this, a re-render after the watchdog clears downloadingRef could
  // trigger a second download that overwrites the first partial file mid-write.
  const downloadFailedRef = useRef(false);

  const checkDownloadStatus = () => {
    // Primary: isLocallyDownloaded is stamped by mergeDownloadedTracks after a real
    // exists() check — single source of truth, immune to the redux-persist hydration race.
    if (currentPlaying?.isLocallyDownloaded != null) {
      return currentPlaying.isLocallyDownloaded;
    }
    // Fallback: check Redux manifest for tracks downloaded in the current session
    // before the manifest has been re-fetched to reflect the updated local path.
    if (currentPlaying?.id) {
      try {
        return isTrackDownloaded(currentPlaying.id);
      } catch (error) {
        logError("Error checking download status:", error);
        return false;
      }
    }
    return false;
  };

  const handleDownload = async (cancelledRef) => {
    if (!currentPlaying?.audioUrl || downloadingRef.current || downloadFailedRef.current) {
      return;
    }

    try {
      const downloaded = checkDownloadStatus();
      if (downloaded) {
        setIsDownloaded(true);
        return;
      }

      downloadingRef.current = true;
      downloadJobIdRef.current = null;
      setIsDownloading(true);

      // Failsafe watchdog: If the native filesystem pipeline hangs silently without returning or throwing
      // (common with backgrounded file downloads on Android DOZE), cancel the download
      // and clean up the partial file after 5 minutes.
      const watchdog = setTimeout(() => {
        if (downloadingRef.current && !cancelledRef?.current) {
          // Cancel the actual RNFS download task — stops bytes from being written.
          if (downloadJobIdRef.current != null) {
            stopDownload(downloadJobIdRef.current);
            downloadJobIdRef.current = null;
          }
          // Delete partial file so exists() never returns true for a corrupt M4A.
          // A truncated M4A with a missing/incomplete moov atom will cause ExoPlayer
          // to silently fail the fast-seek swap and rebuffer from the remote URL.
          if (currentPlaying?.audioUrl) {
            const partialPath = getFullLocalTrackPath(currentPlaying.audioUrl);
            unlink(partialPath).catch(() => {});
          }
          downloadFailedRef.current = true;
          setIsDownloading(false);
          downloadingRef.current = false;
        }
      }, 5 * 60 * 1000);

      const result = await downloadTrack(currentPlaying.audioUrl, currentPlaying.displayName, currentPlaying.trackSizeMB);
      clearTimeout(watchdog);
      downloadJobIdRef.current = null;

      // If the track changed while we were downloading, discard stale state updates.
      if (cancelledRef?.current) {
        return;
      }

      if (!result || !result.audioRelativePath) {
        return;
      }
      setIsDownloaded(true);
      addTrackToManifest(currentPlaying, result.audioRelativePath, result.jsonRelativePath);
      trackTrackDownload(baniID, currentPlaying?.displayName, baniTitle);
    } catch (error) {
      logError("Download error:", error);
      // Mark as failed so the watchdog-cleared guard prevents retry this session.
      downloadFailedRef.current = true;
    } finally {
      downloadingRef.current = false;
      downloadJobIdRef.current = null;
      if (!cancelledRef?.current) {
        setIsDownloading(false);
      }
    }
  };

  useEffect(() => {
    // Reset state whenever the track changes so the badge doesn't leak
    // from a previous track's lifecycle into the next one.
    setIsDownloading(false);
    setIsDownloaded(false);
    downloadingRef.current = false;
    downloadJobIdRef.current = null;
    // Reset the failure guard when the track changes — new track, fresh attempt.
    downloadFailedRef.current = false;

    const cancelledRef = { current: false };

    const autoDownload = async () => {
      const isDownloadedStatus = checkDownloadStatus();

      if (currentPlaying?.audioUrl && !isDownloadedStatus) {
        await handleDownload(cancelledRef);
      } else {
        setIsDownloaded(true);
      }
    };

    if (currentPlaying?.audioUrl) {
      autoDownload();
    }

    return () => {
      // Mark this effect cycle as stale so in-flight downloads don't update
      // state after the track has already changed.
      cancelledRef.current = true;
    };
  }, [currentPlaying?.audioUrl]);

  // ── Foreground-resume recovery ────────────────────────────────────────────
  // Android DOZE kills background network work silently — no error thrown,
  // no promise rejection. JS timers are frozen too, so the 5-minute watchdog
  // never fires. When the app returns to foreground, downloadingRef is still
  // true and the badge is stuck. This listener checks the real file state
  // and resolves accordingly.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && downloadingRef.current) {
        const checkAndResolve = async () => {
          try {
            if (!currentPlaying?.audioUrl) {
              setIsDownloading(false);
              downloadingRef.current = false;
              return;
            }

            const path = getFullLocalTrackPath(currentPlaying.audioUrl);
            const fileExists = await exists(path);

            if (fileExists) {
              const fileStat = await stat(path);
              if (Number(fileStat.size) > 100000) {
                // File completed in background — clear badge, keep file.
                setIsDownloading(false);
                setIsDownloaded(true);
                downloadingRef.current = false;
                downloadJobIdRef.current = null;
                return;
              }
            }

            // File incomplete or missing — cancel and clean up.
            if (downloadJobIdRef.current != null) {
              stopDownload(downloadJobIdRef.current);
              downloadJobIdRef.current = null;
            }
            if (fileExists) {
              await unlink(path).catch(() => {});
            }
            downloadFailedRef.current = true;
            setIsDownloading(false);
            downloadingRef.current = false;
          } catch (_) {
            // Best effort — at minimum clear the badge.
            setIsDownloading(false);
            downloadingRef.current = false;
          }
        };
        checkAndResolve();
      }
    });
    return () => subscription.remove();
  }, [currentPlaying?.audioUrl]);

  return {
    isDownloading,
    isDownloaded,
    handleDownload,
  };
};

export default useDownloadManager;
