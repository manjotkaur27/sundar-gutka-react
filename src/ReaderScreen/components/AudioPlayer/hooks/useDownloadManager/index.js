import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { enqueueDownload } from '@common/actions';
import { getLocalTrackPath } from '../../utils/audioDownloader';

// Thin Redux bridge. All download logic lives in useGlobalDownloadManager
// (mounted at app root). This hook exposes state and conditionally auto-enqueues
// based on the "auto-download on stream" user setting.
const useDownloadManager = (currentPlaying, addTrackToManifest, isTrackDownloaded, baniID, baniTitle, baniNameUni) => {
  const dispatch             = useDispatch();
  const downloadQueue        = useSelector((s) => s.downloadQueue);
  const downloadRegistry     = useSelector((s) => s.downloadRegistry);
  const autoDownloadOnStream = useSelector((s) => s.autoDownloadOnStream);

  const trackKey   = currentPlaying?.audioUrl ? getLocalTrackPath(currentPlaying.audioUrl) : null;
  const queueEntry = trackKey ? downloadQueue[trackKey] : null;
  const inRegistry = Boolean(trackKey && downloadRegistry[trackKey]);

  // isDownloaded: registry entry OR manifest flag stamped by mergeDownloadedTracks
  const isDownloaded  = inRegistry || Boolean(currentPlaying?.isLocallyDownloaded);
  const isDownloading = queueEntry?.status === 'downloading';
  const progress      = queueEntry?.progress ?? 0;

  // Auto-enqueue when the user starts streaming, but ONLY when the
  // "auto-download on stream" setting is enabled. The global engine handles
  // wifi-only, cellular-warn, and network-state gates before starting the
  // actual transfer.
  useEffect(() => {
    if (autoDownloadOnStream && currentPlaying?.audioUrl && !isDownloaded && !queueEntry) {
      dispatch(enqueueDownload({
        trackKey,
        audioUrl: currentPlaying.remoteUrl || currentPlaying.audioUrl,
        displayName: currentPlaying.displayName,
        baniTitle,
        baniNameUni: baniNameUni || baniTitle,
        baniId: baniID,
        sizeMB: currentPlaying.trackSizeMB,
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlaying?.audioUrl, autoDownloadOnStream]);

  // When global engine completes a download, stamp the manifest entry so the
  // existing mergeDownloadedTracks / isLocallyDownloaded flow still works.
  useEffect(() => {
    if (inRegistry && currentPlaying?.audioUrl && addTrackToManifest) {
      const entry = downloadRegistry[trackKey];
      if (entry) {
        addTrackToManifest(currentPlaying, entry.relativePath, null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRegistry]);

  return { isDownloading, isDownloaded, progress, handleDownload: () => {} };
};

export default useDownloadManager;
