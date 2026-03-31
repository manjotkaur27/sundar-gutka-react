import { useState, useEffect, useRef } from "react";
import { logError } from "@common";
import { downloadTrack } from "../../utils/audioDownloader";

const useDownloadManager = (currentPlaying, addTrackToManifest, isTrackDownloaded) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  // Ref-based in-flight guard: prevents a second download from starting if
  // currentPlaying.audioUrl changes while a download is already running.
  const downloadingRef = useRef(false);

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
    if (!currentPlaying?.audioUrl || downloadingRef.current) {
      return;
    }

    try {
      const downloaded = checkDownloadStatus();
      if (downloaded) {
        setIsDownloaded(true);
        return;
      }

      downloadingRef.current = true;
      setIsDownloading(true);
      const result = await downloadTrack(currentPlaying.audioUrl, currentPlaying.displayName);

      // If the track changed while we were downloading, discard stale state updates.
      if (cancelledRef?.current) {
        return;
      }

      if (!result || !result.audioRelativePath) {
        return;
      }
      setIsDownloaded(true);
      addTrackToManifest(currentPlaying, result.audioRelativePath, result.jsonRelativePath);
    } catch (error) {
      logError("Download error:", error);
    } finally {
      downloadingRef.current = false;
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

  return {
    isDownloading,
    isDownloaded,
    handleDownload,
  };
};

export default useDownloadManager;
