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

  const handleDownload = async () => {
    if (!currentPlaying?.audioUrl || downloadingRef.current) {
      return;
    }

    try {
      const downloaded = checkDownloadStatus();
      if (downloaded) {
        return;
      }

      downloadingRef.current = true;
      setIsDownloading(true);
      const result = await downloadTrack(currentPlaying.audioUrl, currentPlaying.displayName);
      if (!result.audioRelativePath) {
        return;
      }
      setIsDownloaded(true);
      addTrackToManifest(currentPlaying, result.audioRelativePath, result.jsonRelativePath);
    } catch (error) {
      logError("Download error:", error);
    } finally {
      downloadingRef.current = false;
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    const autoDownload = async () => {
      const isDownloadedStatus = checkDownloadStatus();

      if (currentPlaying?.audioUrl && !isDownloadedStatus) {
        await handleDownload();
      } else {
        setIsDownloaded(true);
      }
    };

    if (currentPlaying?.audioUrl) {
      autoDownload();
    }
  }, [currentPlaying?.audioUrl]);

  return {
    isDownloading,
    isDownloaded,
    handleDownload,
  };
};

export default useDownloadManager;
