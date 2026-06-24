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

  // Defer auto-download until the onboarding tour's reader portion is OVER.
  // The very first audio start lands on the "play / pause" tutorial step.
  // Auto-enqueuing a download anywhere during the tour floods the JS thread
  // (enqueue + the download-button spinner + the "download complete" toast),
  // which chokes the tour dialogs — most visibly the play/pause tooltip, which
  // takes a beat to fade in. Every other dialog is fine because none kick off a
  // download. We gate on the EXPLORE prompt, the LAST reader-screen tour element
  // (shown right after the play + download steps): its shouldShow is true for the
  // entire player tutorial and only flips false once the user answers that prompt
  // OR skips/opts out anywhere — so the download is deferred through the whole
  // guided flow, then the effect re-runs and downloads. This can't hang: the
  // explore prompt forces a choice, and any Skip / "Not now" opts out (releasing
  // it too). Bonus: the tour's "tap to download" step is meaningful (the track
  // isn't already auto-downloaded). For users not in the tour, shouldShow is
  // always false, so auto-download fires immediately exactly as before.
  const { shouldShow: tourInProgress } = useCoachmark(COACH.EXPLORE);

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
