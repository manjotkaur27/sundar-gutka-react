import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import NetInfo from '@react-native-community/netinfo';
import { enqueueDownload, toggleDownloadWifiOnly } from '@common/actions';
import { STRINGS, showConfirm, COACH, useCoachmark } from '@common';
import { getLocalTrackPath } from '../../utils/audioDownloader';

// Thin Redux bridge. All download logic lives in useGlobalDownloadManager
// (mounted at app root). This hook exposes state and conditionally auto-enqueues
// based on the "auto-download on stream" user setting.
const useDownloadManager = (currentPlaying, addTrackToManifest, isTrackDownloaded, baniID, baniTitle, baniNameUni) => {
  const dispatch             = useDispatch();
  const downloadQueue        = useSelector((s) => s.downloadQueue);
  const downloadRegistry     = useSelector((s) => s.downloadRegistry);
  const autoDownloadOnStream = useSelector((s) => s.autoDownloadOnStream);
  const downloadWifiOnly       = useSelector((s) => s.downloadWifiOnly);

  // Defer auto-download only until the PLAYER tutorial (play/pause → download
  // steps) has been shown — not through the rest of the tour. Auto-enqueuing a
  // download during those two steps floods the JS thread (enqueue + the
  // download-button spinner + the "download complete" toast) and chokes the
  // spotlight tooltips, and it also pre-empts the "tap to download" step (the
  // track would already be downloading). Gating on COACH.PLAYER means
  // shouldShow is true for exactly the play + download steps and flips false the
  // moment that pair completes (or the user skips/opts out) — so auto-download
  // kicks in right after we've explained the download button, instead of waiting
  // for the later "show me / Manage Downloads" walk-through. For users not in
  // the tour, shouldShow is always false, so auto-download fires immediately.
  const { shouldShow: tourInProgress } = useCoachmark(COACH.PLAYER);

  const trackKey   = currentPlaying?.audioUrl ? getLocalTrackPath(currentPlaying.audioUrl) : null;
  const queueEntry = trackKey ? downloadQueue[trackKey] : null;
  const inRegistry = Boolean(trackKey && downloadRegistry[trackKey]);

  // isDownloaded: registry entry OR manifest flag stamped by mergeDownloadedTracks
  const isDownloaded  = inRegistry || Boolean(currentPlaying?.isLocallyDownloaded);
  const isDownloading = queueEntry?.status === 'downloading';
  const progress      = queueEntry?.progress ?? 0;

  // Auto-enqueue when the user starts streaming, but ONLY when the
  // "auto-download on stream" setting is enabled. WiFi-only is the single
  // gate: if it's ON and we're currently on cellular, ask before using mobile
  // data (same dialog the manual download button shows) — confirming turns
  // WiFi-only off, so every later download (manual or auto) proceeds without
  // asking again, until the user re-enables WiFi-only themselves.
  useEffect(() => {
    if (!autoDownloadOnStream || !currentPlaying?.audioUrl || isDownloaded || queueEntry || tourInProgress) {
      return undefined;
    }

    let cancelled = false;
    const enqueue = () => {
      if (cancelled) return;
      dispatch(enqueueDownload({
        trackKey,
        audioUrl: currentPlaying.remoteUrl || currentPlaying.audioUrl,
        displayName: currentPlaying.displayName,
        baniTitle,
        baniNameUni: baniNameUni || baniTitle,
        baniId: baniID,
        sizeMB: currentPlaying.trackSizeMB,
      }));
    };

    (async () => {
      if (!downloadWifiOnly) {
        enqueue();
        return;
      }
      const net = await NetInfo.fetch();
      if (cancelled) return;
      if (net.type !== 'cellular') {
        enqueue();
        return;
      }
      showConfirm({
        title: STRINGS.WIFI_ONLY_ALERT_TITLE,
        message: STRINGS.WIFI_ONLY_ALERT_BODY,
        cancelText: STRINGS.cancel,
        confirmText: STRINGS.WIFI_ONLY_USE_MOBILE_DATA,
        onConfirm: () => {
          dispatch(toggleDownloadWifiOnly(false));
          enqueue();
        },
      });
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlaying?.audioUrl, autoDownloadOnStream, downloadWifiOnly, tourInProgress]);

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
