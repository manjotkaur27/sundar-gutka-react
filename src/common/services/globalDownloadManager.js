import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import NetInfo from '@react-native-community/netinfo';
import {
  exists,
  stat,
  unlink,
  read,
  appendFile,
  moveFile,
  stopDownload,
  downloadFile,
} from 'react-native-fs';
import { logError, logMessage, trackTrackDownload } from '@common';
import {
  updateDownloadStatus,
  updateDownloadProgress,
  removeDownloadQueueEntry,
  requeuePausedDownloads,
  addDownloadEntry,
} from '../actions';
import {
  AUDIO_DIRECTORY_PATH,
  downloadLyricsOnly,
  ensureArtistDirectory,
  getLocalTrackPath,
} from '../../ReaderScreen/components/AudioPlayer/utils/audioDownloader';

const RETRY_DELAYS = [5_000, 15_000, 45_000];
const STALL_THRESHOLD_MS = 30_000;
const STALL_CHECK_INTERVAL_MS = 5_000;
const ONE_MB = 1_048_576;

// Derive artist-relative filename from URL (mirrors generateFilename in audioDownloader).
const parseUrl = (url) => {
  const parts = url.split('/');
  return {
    artistName: parts[parts.length - 2],
    fileName: parts[parts.length - 1],
  };
};

const buildPaths = (audioUrl) => {
  const { artistName, fileName } = parseUrl(audioUrl);
  const artistDir = `${AUDIO_DIRECTORY_PATH}/${artistName}`;
  const tempPath = `${artistDir}/.tmp_${fileName}`;
  const rangePath = `${tempPath}_range`;
  const finalPath = `${artistDir}/${fileName}`;
  const relativePath = `${artistName}/${fileName}`;
  return { artistName, fileName, artistDir, tempPath, rangePath, finalPath, relativePath };
};

// Chunked base64 merge: appends rangePath content onto basePath, 1 MB at a time.
const mergeChunked = async (basePath, rangePath) => {
  const { size } = await stat(rangePath);
  let offset = 0;
  while (offset < size) {
    // eslint-disable-next-line no-await-in-loop
    const chunk = await read(rangePath, ONE_MB, offset, 'base64');
    // eslint-disable-next-line no-await-in-loop
    await appendFile(basePath, chunk, 'base64');
    offset += ONE_MB;
  }
};

const useGlobalDownloadManager = () => {
  const dispatch = useDispatch();
  const downloadQueue     = useSelector((s) => s.downloadQueue);
  const downloadWifiOnly  = useSelector((s) => s.downloadWifiOnly);
  const downloadRegistry  = useSelector((s) => s.downloadRegistry);

  // Refs for values needed inside callbacks without re-registering listeners.
  const queueRef         = useRef(downloadQueue);
  const wifiOnlyRef      = useRef(downloadWifiOnly);
  const registryRef      = useRef(downloadRegistry);
  const activeKeyRef     = useRef(null);
  const activeJobIdRef   = useRef(null);
  const processingRef    = useRef(false);
  const lastProgressRef  = useRef(Date.now());
  const stallTimerRef    = useRef(null);
  const networkRef       = useRef({ isConnected: true, type: 'wifi' });

  useEffect(() => { queueRef.current        = downloadQueue; },   [downloadQueue]);
  useEffect(() => { wifiOnlyRef.current     = downloadWifiOnly; }, [downloadWifiOnly]);
  useEffect(() => { registryRef.current     = downloadRegistry; }, [downloadRegistry]);

  // Cancel the currently active native download without deleting the temp file.
  const cancelActiveJob = () => {
    if (activeJobIdRef.current != null) {
      try { stopDownload(activeJobIdRef.current); } catch (_) { /* best effort */ }
      activeJobIdRef.current = null;
    }
  };

  // Stop stall watchdog.
  const clearStall = () => {
    if (stallTimerRef.current) {
      clearInterval(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  };

  // ── Core download function ──────────────────────────────────────────────────
  const downloadWithResume = async (task) => {
    const { trackKey, audioUrl, displayName, baniTitle, baniId, sizeMB } = task;
    const { artistName, fileName, tempPath, rangePath, finalPath, relativePath } = buildPaths(audioUrl);

    try {
      await ensureArtistDirectory(artistName);

      // Determine how many bytes we already have on disk.
      const tempExists    = await exists(tempPath);
      const partialBytes  = tempExists ? Number((await stat(tempPath)).size) : 0;
      // Only resume if > 1 MB partial; otherwise restart from scratch.
      const startByte     = partialBytes > ONE_MB ? partialBytes : 0;
      if (startByte === 0 && partialBytes > 0) {
        await unlink(tempPath).catch(() => {});
      }

      const totalBytes = sizeMB ? Math.round(sizeMB * 1024 * 1024) : 0;

      dispatch(updateDownloadStatus(trackKey, 'downloading'));
      if (startByte > 0 && totalBytes > 0) {
        dispatch(updateDownloadProgress(trackKey, Math.round(startByte / totalBytes * 100), startByte, startByte));
      }

      const headers = startByte > 0 ? { Range: `bytes=${startByte}-` } : {};
      const toFile  = startByte > 0 ? rangePath : tempPath;

      let responseStatusCode = null;
      lastProgressRef.current = Date.now();

      // Start stall watchdog.
      stallTimerRef.current = setInterval(() => {
        const stalledFor = Date.now() - lastProgressRef.current;
        if (stalledFor > STALL_THRESHOLD_MS && activeKeyRef.current === trackKey) {
          clearStall();
          cancelActiveJob();
          const current = queueRef.current[trackKey];
          if (!current) return;
          const retryCount = (current.retryCount ?? 0) + 1;
          if (retryCount >= 3) {
            dispatch(updateDownloadStatus(trackKey, 'failed', { errorMessage: 'Stalled', retryCount }));
          } else {
            dispatch(updateDownloadStatus(trackKey, 'queued', { retryCount }));
            setTimeout(() => {
              dispatch(updateDownloadStatus(trackKey, 'queued'));
            }, RETRY_DELAYS[Math.min(retryCount - 1, 2)]);
          }
          processingRef.current = false;
          activeKeyRef.current = null;
        }
      }, STALL_CHECK_INTERVAL_MS);

      const task_ = downloadFile({
        fromUrl: audioUrl,
        toFile,
        headers,
        // Fire ~5 times per download (every 5% of content-length).
        // Matches the original audioDownloader progressDivider:20 behaviour
        // while giving the ring enough data-points to look smooth.
        progressDivider: 20,
        begin: ({ statusCode }) => {
          responseStatusCode = statusCode;
        },
        progress: ({ bytesWritten, contentLength }) => {
          lastProgressRef.current = Date.now();
          const totalWritten = startByte + bytesWritten;
          const total = contentLength > 0 ? (startByte + contentLength) : totalBytes;
          // Never cap at 99 — the ring transitions to 'completed' immediately
          // after moveFile, so 100% is fine and expected.
          const pct = total > 0 ? Math.round(totalWritten / total * 100) : 0;
          dispatch(updateDownloadProgress(trackKey, pct, totalWritten, totalWritten));
        },
      });

      activeJobIdRef.current = task_.jobId;
      const result = await task_.promise;
      clearStall();
      activeJobIdRef.current = null;

      // Guard: track may have been cancelled mid-download.
      if (!queueRef.current[trackKey]) return;

      const sc = responseStatusCode ?? result.statusCode;
      if (sc === 206) {
        // Partial content — merge range file onto temp.
        await mergeChunked(tempPath, rangePath);
        await unlink(rangePath).catch(() => {});
      } else if (sc === 200 && startByte > 0) {
        // Server ignored Range header — full response landed in rangePath.
        await unlink(tempPath).catch(() => {});
        await moveFile(rangePath, tempPath);
      } else if (sc !== 200) {
        throw new Error(`HTTP ${sc}`);
      }

      // Size sanity check.
      const finalStat = await stat(tempPath);
      if (Number(finalStat.size) < 100_000) {
        throw new Error(`File too small: ${finalStat.size} bytes`);
      }

      // Download lyrics companion file.
      await downloadLyricsOnly(audioUrl, displayName, { skipDirectorySetup: true }).catch(() => {});

      // Atomic rename to final path.
      await moveFile(tempPath, finalPath);

      // Register in Redux and analytics.
      const entry = {
        relativePath,
        artistDisplayName: displayName,
        baniTitle,
        baniId,
        sizeMB: sizeMB ?? 0,
        hasLyrics: false,
        downloadedAt: Date.now(),
      };
      dispatch(addDownloadEntry(entry));
      trackTrackDownload(baniId, displayName, baniTitle);
      dispatch(updateDownloadStatus(trackKey, 'completed'));
      logMessage(`Download complete: ${fileName}`);

      setTimeout(() => {
        dispatch(removeDownloadQueueEntry(trackKey));
      }, 2000);
    } catch (err) {
      clearStall();
      cancelActiveJob();
      logError(`Download error for ${displayName}: ${err?.message}`);
      if (!queueRef.current[trackKey]) return;
      const current   = queueRef.current[trackKey];
      const retryCount = (current?.retryCount ?? 0) + 1;
      if (retryCount >= 3) {
        dispatch(updateDownloadStatus(trackKey, 'failed', { errorMessage: err?.message, retryCount }));
      } else {
        dispatch(updateDownloadStatus(trackKey, 'queued', { retryCount }));
        setTimeout(() => {
          if (queueRef.current[trackKey]?.status === 'queued') {
            // Re-trigger the processor by no-op status update.
            dispatch(updateDownloadStatus(trackKey, 'queued', { retryCount }));
          }
        }, RETRY_DELAYS[Math.min(retryCount - 1, 2)]);
      }
    } finally {
      processingRef.current = false;
      activeKeyRef.current  = null;
    }
  };

  // ── Queue processor — runs on every queue change ───────────────────────────
  useEffect(() => {
    if (processingRef.current) return;

    const queued = Object.values(downloadQueue).find((t) => t.status === 'queued');
    if (!queued) return;

    const { isConnected, type } = networkRef.current;

    if (!isConnected) {
      dispatch(updateDownloadStatus(queued.trackKey, 'paused_no_network'));
      return;
    }
    if (type !== 'wifi' && downloadWifiOnly) {
      dispatch(updateDownloadStatus(queued.trackKey, 'paused_wifi_only'));
      return;
    }

    processingRef.current = true;
    activeKeyRef.current  = queued.trackKey;
    downloadWithResume(queued);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downloadQueue, downloadWifiOnly]);

  // ── NetInfo listener ───────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(({ isConnected, type }) => {
      networkRef.current = { isConnected: Boolean(isConnected), type: type ?? 'unknown' };

      if (!isConnected) {
        if (activeKeyRef.current) {
          cancelActiveJob();
          dispatch(updateDownloadStatus(activeKeyRef.current, 'paused_no_network'));
          processingRef.current = false;
          activeKeyRef.current = null;
        }
        // Pause any queued entries too.
        Object.values(queueRef.current).forEach((t) => {
          if (t.status === 'queued') {
            dispatch(updateDownloadStatus(t.trackKey, 'paused_no_network'));
          }
        });
      } else if (type !== 'wifi' && wifiOnlyRef.current) {
        if (activeKeyRef.current) {
          cancelActiveJob();
          dispatch(updateDownloadStatus(activeKeyRef.current, 'paused_wifi_only'));
          processingRef.current = false;
          activeKeyRef.current = null;
        }
        Object.values(queueRef.current).forEach((t) => {
          if (t.status === 'queued') {
            dispatch(updateDownloadStatus(t.trackKey, 'paused_wifi_only'));
          }
        });
      } else {
        // Connected and allowed — requeue anything paused.
        dispatch(requeuePausedDownloads(['paused_no_network', 'paused_wifi_only']));
      }
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When wifiOnly is turned OFF, resume wifi-only-paused items.
  useEffect(() => {
    if (!downloadWifiOnly) {
      const { isConnected } = networkRef.current;
      if (isConnected) {
        dispatch(requeuePausedDownloads(['paused_wifi_only']));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downloadWifiOnly]);

  // ── AppState listener (DOZE recovery) ─────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && activeKeyRef.current) {
        // Native job likely died in background — cancel and re-queue so the
        // engine picks it up fresh (temp file preserved for resume).
        cancelActiveJob();
        const key = activeKeyRef.current;
        dispatch(updateDownloadStatus(key, 'queued'));
        processingRef.current = false;
        activeKeyRef.current = null;
      }
    });
    return () => sub.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearStall();
      cancelActiveJob();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

export default useGlobalDownloadManager;
