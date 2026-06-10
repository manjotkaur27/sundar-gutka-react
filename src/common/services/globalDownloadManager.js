import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  createDownloadTask,
  getExistingDownloadTasks,
  completeHandler,
  setConfig,
} from '@kesha-antonov/react-native-background-downloader';
import NetInfo from '@react-native-community/netinfo';
import { exists, stat, unlink, readDir, getFSInfo } from 'react-native-fs';
import { logError, logMessage, trackTrackDownload, requestNotificationPermission, STRINGS } from '@common';
import {
  updateDownloadStatus,
  updateDownloadProgress,
  removeDownloadQueueEntry,
  requeuePausedDownloads,
  addDownloadEntry,
  enqueueDownload,
} from '../actions';
import {
  AUDIO_DIRECTORY_PATH,
  downloadLyricsOnly,
  ensureArtistDirectory,
} from '../../ReaderScreen/components/AudioPlayer/utils/audioDownloader';

// ─────────────────────────────────────────────────────────────────────────────
// Native background download engine.
//
// The transfer lifecycle (resume across network drops, retry, and continuing
// while the app is backgrounded OR terminated by the OS) is owned entirely by
// the native layer — iOS URLSession background, Android DownloadManager + a
// foreground service. This hook is a thin coordinator that:
//   1. starts native tasks for Redux queue entries that are 'queued',
//   2. mirrors native begin/progress/done/error events back into Redux for the UI,
//   3. re-attaches to in-flight / completed tasks on every app start.
//
// Redux (downloadQueue / downloadRegistry) is the source of truth for the UI;
// native is the source of truth for transfer state. We reconcile on mount and on
// every native event.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_PARALLEL         = 3;
const MIN_VALID_BYTES      = 100_000;   // a real bani m4a is always well over 100 KB
const RETRY_DELAYS         = [5_000, 15_000, 45_000];
const COMPLETED_CLEANUP_MS = 2_000;

// If a 'downloading' task emits no progress event for this long we treat it
// as stalled and force-restart it (stop + re-queue for a clean fresh task).
// 20 s covers TCP handshake + server TTFB on a slow connection without
// false-positives on fast networks.
const STALL_TIMEOUT_MS = 20_000;

// When resuming a previously paused task, the native layer must re-establish a
// TCP connection from scratch — TCP keepalives on mobile expire in 1-5 min, so
// the OS has almost certainly torn down the socket. Re-handshake + TLS on a
// congested mobile network can take 15-30 s. Using the standard 20 s timeout
// here would cause the watchdog to fire on a legitimately slow reconnect and
// restart the download from byte 0 (new task ID = new native state = no range
// request). 60 s gives sufficient headroom for any real mobile network; once
// the first progress event fires, the timer resets to the standard 20 s.
const RESUME_STARTUP_TIMEOUT_MS = 60_000;

// trackKey is the artist-relative path ("artist/file.m4a"). Native task ids must
// avoid path separators (used in notification ids / native keys), so derive a
// flat id and keep the real key in metadata for the reverse lookup.
//
// The id is salted per attempt (`…_<base36 time>`) so a re-download never reuses
// the id of a previously COMPLETED task. The native lib persists a per-id record
// (bytes = total, state = DONE); reusing that id after the file was deleted makes
// the ResumableDownloader attempt a stale resume/range against a missing file —
// it stalls in the begin phase (notification shows no progress) then restarts
// from zero. A fresh id always downloads cleanly from byte 0.
//
// Safe: coordinator keys by trackKey everywhere; id is only used at creation and
// in completeHandler(task.id).
const taskIdForKey = (trackKey) =>
  `dl_${trackKey.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now().toString(36)}`;

const parseUrl = (url) => {
  const parts = url.split('/');
  return { artistName: parts[parts.length - 2], fileName: parts[parts.length - 1] };
};

const pctOf = (downloaded, total) =>
  total > 0 ? Math.min(100, Math.max(0, Math.round((downloaded / total) * 100))) : 0;

// Remove ".tmp_*" / "*_range" files written by the previous react-native-fs engine.
const cleanupLegacyTempFiles = async () => {
  if (!(await exists(AUDIO_DIRECTORY_PATH).catch(() => false))) return;
  const artists = await readDir(AUDIO_DIRECTORY_PATH).catch(() => []);
  await Promise.all(
    artists
      .filter((a) => a.isDirectory?.())
      .map(async (artist) => {
        const files = await readDir(artist.path).catch(() => []);
        await Promise.all(
          files
            .filter((f) => f.name.startsWith('.tmp_') || f.name.endsWith('_range'))
            .map((f) => unlink(f.path).catch(() => {}))
        );
      })
  );
};

// Applies the native download config — notably notification grouping, which MUST
// be enabled for the bani name (per-task groupName) to be used as the download
// notification's title. Uses current STRINGS so wording is localized.
const applyDownloadConfig = () => {
  setConfig({
    progressInterval: 500,
    maxParallelDownloads: MAX_PARALLEL,
    showNotificationsEnabled: true,
    notificationsGrouping: {
      // Grouping OFF: each download is a standalone notification. (Grouping adds a
      // "Sundar Gutka" summary that collapses over and masks the per-bani title.)
      // Our patch makes the title use groupName regardless of this flag.
      enabled: false,
      mode: 'individual',
      texts: {
        downloadTitle: 'Sundar Gutka',
        downloadStarting: STRINGS.DOWNLOADING,
        downloadProgress: `${STRINGS.DOWNLOADING} {progress}%`,
        downloadFinished: STRINGS.DOWNLOAD_COMPLETE ?? 'Download complete',
        groupTitle: 'Sundar Gutka',
        groupText: '{count}',
      },
    },
  });
};

// Imperative bridge so the UI (DownloadButton) can pause/resume the engine's
// live native tasks, which live inside the hook. The hook installs the real
// implementations on mount; before that they are safe no-ops. State still flows
// back through Redux for rendering.
export const downloadControls = {
  pause: async (_trackKey) => {},
  resume: async (_trackKey) => {},
};

const useGlobalDownloadManager = () => {
  const dispatch = useDispatch();
  const downloadQueue = useSelector((s) => s.downloadQueue);
  const downloadWifiOnly = useSelector((s) => s.downloadWifiOnly);
  const downloadRegistry = useSelector((s) => s.downloadRegistry);
  const language = useSelector((s) => s.language); // re-apply localized notification texts on change

  // Refs so the long-lived native callbacks always read current values.
  const queueRef = useRef(downloadQueue);
  const wifiOnlyRef = useRef(downloadWifiOnly);
  const registryRef = useRef(downloadRegistry);
  // Conservative default: treat network as UNKNOWN (not connected, not WiFi).
  // The queue processor gates on `networkReady` and won't process any entries
  // until we've fetched the real state with NetInfo.fetch() on mount.
  // This closes the race where the queue processor runs before the
  // NetInfo.addEventListener callback fires its first event — which would
  // otherwise let cellular users start downloads against a stale isWifi=true.
  const networkRef = useRef({ isConnected: false, isWifi: false });
  const dispatchRef = useRef(dispatch);
  // trackKey -> native DownloadTask. Prevents double-starting a live task.
  const activeTasksRef = useRef(new Map());
  // trackKeys whose startTask() is mid-flight (async gap before activeTasksRef
  // is populated) — closes the double-start race when the processor re-runs.
  const startingRef = useRef(new Set());
  // Ask for notification permission once, the first time a real download starts.
  const notifPermAskedRef = useRef(false);
  // Guarantee the native notification/grouping config is applied before the
  // first download (app-mount setConfig can no-op if the bridge wasn't ready).
  const configAppliedRef = useRef(false);
  // trackKey -> stall-detection timer id. Cleared on every progress event;
  // fires if no bytes flow for STALL_TIMEOUT_MS while status is 'downloading'.
  const stallTimersRef = useRef(new Map());
  // Becomes true once we've resolved the real initial network state via
  // NetInfo.fetch(). The queue processor won't start any downloads before this.
  const [networkReady, setNetworkReady] = useState(false);

  useEffect(() => { queueRef.current = downloadQueue; }, [downloadQueue]);
  useEffect(() => { wifiOnlyRef.current = downloadWifiOnly; }, [downloadWifiOnly]);
  useEffect(() => { registryRef.current = downloadRegistry; }, [downloadRegistry]);
  useEffect(() => { dispatchRef.current = dispatch; }, [dispatch]);

  // ── Stall detection helpers ────────────────────────────────────────────────
  const clearStallTimer = (trackKey) => {
    const t = stallTimersRef.current.get(trackKey);
    if (t) {
      clearTimeout(t);
      stallTimersRef.current.delete(trackKey);
    }
  };

  // Arm (or re-arm) a stall watchdog for a downloading task.
  // If the timer fires it means the native layer stopped emitting progress for
  // delayMs while we thought the task was active — force-restart it.
  // Pass RESUME_STARTUP_TIMEOUT_MS on the first arm after a pause/resume; after
  // that the progress handler re-arms with the default 20 s.
  const armStallTimer = (trackKey, delayMs = STALL_TIMEOUT_MS) => {
    clearStallTimer(trackKey);
    const t = setTimeout(() => {
      stallTimersRef.current.delete(trackKey);
      const status = queueRef.current[trackKey]?.status;
      if (status !== 'downloading') return; // may have been paused/completed

      logError(`Stall detected for ${trackKey} — force-restarting`);
      const task = activeTasksRef.current.get(trackKey);
      if (task) {
        task.stop().catch(() => {});
        activeTasksRef.current.delete(trackKey);
      }
      // Re-queue with retryCount intact — the engine will start a fresh task.
      dispatchRef.current(updateDownloadStatus(trackKey, 'queued'));
    }, delayMs);
    stallTimersRef.current.set(trackKey, t);
  };

  // Install the imperative pause/resume controls used by the UI.
  useEffect(() => {
    downloadControls.pause = async (trackKey) => {
      clearStallTimer(trackKey);
      const task = activeTasksRef.current.get(trackKey);
      // Mark paused first so the queue processor won't treat it as restartable.
      dispatchRef.current(updateDownloadStatus(trackKey, 'paused_user'));
      if (task) await task.pause().catch(() => {});
    };

    downloadControls.resume = async (trackKey) => {
      const task = activeTasksRef.current.get(trackKey);
      if (task) {
        dispatchRef.current(updateDownloadStatus(trackKey, 'downloading'));
        // Use the longer startup timeout — TCP re-establishment after a user pause
        // can take 15-30 s on mobile. The timer resets to 20 s on the first
        // progress event, so a fast connection is still caught quickly.
        armStallTimer(trackKey, RESUME_STARTUP_TIMEOUT_MS);
        try {
          await task.resume();
        } catch (_) {
          // resume() threw — the native handle is definitely dead. Force-restart.
          clearStallTimer(trackKey);
          activeTasksRef.current.delete(trackKey);
          dispatchRef.current(updateDownloadStatus(trackKey, 'queued'));
        }
      } else {
        // No live task (e.g. app was killed while paused) — re-queue; the native
        // layer will start a fresh task since there is no handle to resume.
        dispatchRef.current(updateDownloadStatus(trackKey, 'queued'));
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Failure → retry with backoff, then 'failed' ────────────────────────────
  const handleFailure = (trackKey, message) => {
    clearStallTimer(trackKey);
    activeTasksRef.current.delete(trackKey);
    const current = queueRef.current[trackKey];
    if (!current) return;
    const retryCount = (current.retryCount ?? 0) + 1;
    if (retryCount >= 3) {
      dispatchRef.current(updateDownloadStatus(trackKey, 'failed', { errorMessage: message, retryCount }));
      return;
    }
    dispatchRef.current(updateDownloadStatus(trackKey, 'paused_retry', { retryCount }));
    setTimeout(() => {
      if (queueRef.current[trackKey]?.status === 'paused_retry') {
        dispatchRef.current(updateDownloadStatus(trackKey, 'queued', { retryCount }));
      }
    }, RETRY_DELAYS[Math.min(retryCount - 1, 2)]);
  };

  // ── Finalize (idempotent) ──────────────────────────────────────────────────
  // Runs when a download completes — from the live `done` event, OR on the next
  // app start for downloads that finished while the app was terminated. Safe to
  // call more than once for the same track.
  const finalizeDownload = async (meta) => {
    const { trackKey, audioUrl, displayName, baniTitle, baniId, sizeMB, relativePath, finalPath } = meta;
    clearStallTimer(trackKey);
    try {
      // Already registered (e.g. finalized on a previous launch) → just clean up.
      if (registryRef.current[relativePath]) {
        dispatchRef.current(removeDownloadQueueEntry(trackKey));
        return;
      }

      // The native layer only moves the file to `destination` once complete, so
      // its presence + size is our integrity check.
      if (!(await exists(finalPath))) throw new Error('Completed file missing on disk');
      const { size } = await stat(finalPath);
      if (Number(size) < MIN_VALID_BYTES) {
        await unlink(finalPath).catch(() => {});
        throw new Error(`File too small: ${size} bytes`);
      }

      // Companion lyrics file (small; best-effort, JS-thread fetch).
      await downloadLyricsOnly(audioUrl, displayName, { skipDirectorySetup: true }).catch(() => {});

      dispatchRef.current(addDownloadEntry({
        relativePath,
        artistDisplayName: displayName,
        baniTitle,
        baniId,
        sizeMB: sizeMB ?? 0,
        hasLyrics: false,
        downloadedAt: Date.now(),
      }));
      trackTrackDownload(baniId, displayName, baniTitle);
      dispatchRef.current(updateDownloadStatus(trackKey, 'completed'));
      logMessage(`Download complete: ${relativePath}`);

      setTimeout(() => dispatchRef.current(removeDownloadQueueEntry(trackKey)), COMPLETED_CLEANUP_MS);
    } catch (err) {
      logError(`Finalize failed for ${displayName}: ${err?.message}`);
      handleFailure(trackKey, err?.message);
    } finally {
      activeTasksRef.current.delete(trackKey);
    }
  };

  // ── Wire native task events → Redux ────────────────────────────────────────
  const attachHandlers = (task, meta) => {
    task
      .begin(() => {
        dispatchRef.current(updateDownloadStatus(meta.trackKey, 'downloading'));
        dispatchRef.current(updateDownloadProgress(meta.trackKey, 0, 0, 0));
        // Arm stall watchdog: if no progress fires within STALL_TIMEOUT_MS we
        // force-restart. This catches the "stuck begin" scenario where the native
        // layer returned DONE for a stale task id and then did nothing.
        armStallTimer(meta.trackKey);
      })
      .progress(({ bytesDownloaded, bytesTotal }) => {
        // Re-arm on every tick — the watchdog only fires if bytes stop flowing.
        armStallTimer(meta.trackKey);
        dispatchRef.current(
          updateDownloadProgress(meta.trackKey, pctOf(bytesDownloaded, bytesTotal), bytesDownloaded, bytesDownloaded)
        );
      })
      .done(() => {
        finalizeDownload(meta).finally(() => {
          // Required so iOS releases the background URLSession; harmless on Android.
          try { completeHandler(task.id); } catch (_) { /* best effort */ }
        });
      })
      .error(({ error }) => {
        logError(`Native download error for ${meta.displayName}: ${error}`);
        handleFailure(meta.trackKey, error);
      });
  };

  // ── Start one queued entry as a native background task ─────────────────────
  const startTask = async (entry) => {
    const { trackKey, audioUrl } = entry;
    if (activeTasksRef.current.has(trackKey) || startingRef.current.has(trackKey)) return;
    startingRef.current.add(trackKey);

    const { artistName, fileName } = parseUrl(audioUrl);
    const relativePath = `${artistName}/${fileName}`;
    const finalPath = `${AUDIO_DIRECTORY_PATH}/${relativePath}`;
    const meta = {
      trackKey,
      audioUrl,
      displayName: entry.displayName,
      baniTitle: entry.baniTitle,
      baniNameUni: entry.baniNameUni,
      baniId: entry.baniId,
      sizeMB: entry.sizeMB ?? 0,
      relativePath,
      finalPath,
      // The native UIDT job reads groupName from the METADATA JSON
      // (UIDTDownloadJobService.onStartJob) and our patch uses it as the
      // notification title. Bani name (Punjabi) + artist (English), mirroring
      // the now-playing media notification, language-independent. We deliberately
      // omit groupId so the lib treats each as a standalone notification (no
      // "Sundar Gutka" group-summary masking the per-bani title).
      groupName: [entry.baniNameUni || entry.baniTitle, entry.displayName]
        .filter(Boolean)
        .join('  •  ') || 'Sundar Gutka',
    };

    try {
      // Already fully downloaded (e.g. re-enqueued) → finalize immediately.
      if (await exists(finalPath)) {
        const { size } = await stat(finalPath);
        if (Number(size) >= MIN_VALID_BYTES) {
          await finalizeDownload(meta);
          return;
        }
        await unlink(finalPath).catch(() => {});
      }

      // Low-storage guard: never start a download that can't fit (with headroom).
      // Avoids a partial write that fails late and wastes bandwidth.
      if (meta.sizeMB > 0) {
        const fsInfo = await getFSInfo().catch(() => null);
        const needBytes = meta.sizeMB * 1024 * 1024 * 1.1; // 10% headroom
        if (fsInfo && Number(fsInfo.freeSpace) < needBytes) {
          throw new Error('NOT_ENOUGH_STORAGE');
        }
      }

      await ensureArtistDirectory(artistName);

      // Ask for notification permission once — the download runs in a foreground
      // service whose progress notification is only visible if granted (Android 13+).
      if (!notifPermAskedRef.current) {
        notifPermAskedRef.current = true;
        requestNotificationPermission().catch(() => {});
      }

      dispatchRef.current(updateDownloadStatus(trackKey, 'downloading'));

      // Guarantee the notification grouping config is applied on the native side
      // before the first download — the app-mount setConfig can silently no-op if
      // the native bridge wasn't ready yet, and grouping must be ON for the bani
      // name (groupName) to be used as the notification title.
      if (!configAppliedRef.current) {
        configAppliedRef.current = true;
        applyDownloadConfig();
      }

      // Always allow metered at the OS level — full speed on any connection.
      // "WiFi-only" is enforced in JS (the queue processor / NetInfo gate won't
      // START a download on cellular when the setting is on), so the native
      // metered restriction is unnecessary and only risks DownloadManager/UIDT
      // parking the transfer ("waiting for WiFi") on networks Android flags metered.
      const task = createDownloadTask({
        id: taskIdForKey(trackKey),
        url: audioUrl,
        destination: finalPath,
        metadata: meta,
        isAllowedOverMetered: true,
        isAllowedOverRoaming: true,
      });
      activeTasksRef.current.set(trackKey, task);
      attachHandlers(task, meta);
      task.start();
    } catch (err) {
      logError(`Failed to start download for ${meta.displayName}: ${err?.message}`);
      if (err?.message === 'NOT_ENOUGH_STORAGE') {
        // Terminal — retrying won't free space. Surface a clear, final error.
        activeTasksRef.current.delete(trackKey);
        dispatchRef.current(updateDownloadStatus(trackKey, 'failed', {
          errorMessage: 'NOT_ENOUGH_STORAGE',
          retryCount: 3,
        }));
      } else {
        handleFailure(trackKey, err?.message);
      }
    } finally {
      startingRef.current.delete(trackKey);
    }
  };

  // ── Native config — MUST run before the queue processor so notification
  // grouping (which lets the bani name show as the notification title) is
  // enabled before any download starts. Re-applied on language change so the
  // notification wording stays localized.
  useEffect(() => {
    applyDownloadConfig();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // ── Queue processor — starts allowed 'queued' entries ─────────────────────
  // Gated on `networkReady`: we must not start any download before the initial
  // NetInfo.fetch() on mount resolves, otherwise the conservative default
  // (isWifi=false) would wrongly pause everything on WiFi, or (if we used the
  // old optimistic default isWifi=true) silently start cellular downloads.
  useEffect(() => {
    if (!networkReady) return;

    const { isConnected, isWifi } = networkRef.current;
    const queued = Object.values(downloadQueue).filter((t) => t.status === 'queued');
    if (queued.length === 0) return;

    if (!isConnected) {
      queued.forEach((t) => dispatch(updateDownloadStatus(t.trackKey, 'paused_no_network')));
      return;
    }
    if (!isWifi && downloadWifiOnly) {
      queued.forEach((t) => dispatch(updateDownloadStatus(t.trackKey, 'paused_wifi_only')));
      return;
    }
    queued.forEach((entry) => startTask(entry));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downloadQueue, downloadWifiOnly, networkReady]);

  // ── Initial network state fetch (runs once on mount) ──────────────────────
  // We MUST resolve the real network state before the queue processor can act.
  // NetInfo.addEventListener fires asynchronously; until it fires, networkRef
  // would be at its conservative default (isWifi=false, isConnected=false).
  // Fetching synchronously on mount lets us flip `networkReady` immediately,
  // which unblocks the queue processor with accurate data.
  //
  // The subscriber registered below will keep networkRef accurate after this.
  useEffect(() => {
    let mounted = true;
    NetInfo.fetch().then(({ isConnected, type }) => {
      if (!mounted) return;
      networkRef.current = { isConnected: Boolean(isConnected), isWifi: type === 'wifi' };
      setNetworkReady(true);
    }).catch(() => {
      if (!mounted) return;
      // If the fetch fails (very rare — bridge not ready), assume connected so
      // downloads aren't silently stuck forever; the subscriber will correct it.
      networkRef.current = { isConnected: true, isWifi: true };
      setNetworkReady(true);
    });
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── App-start reattach — the killer feature ────────────────────────────────
  // Reconnect to tasks that kept running (or completed) while the app was
  // terminated. Native is the source of truth; we heal Redux to match.
  useEffect(() => {
    let cancelled = false;

    const reattach = async () => {
      const existing = await getExistingDownloadTasks().catch((err) => {
        logError(`Reattach failed: ${err?.message}`);
        return [];
      });
      if (cancelled) return;

      await Promise.all(existing.map(async (task) => {
        const meta = task.metadata && task.metadata.trackKey ? task.metadata : null;
        if (!meta) {
          // Unknown task (no metadata) — stop it so it doesn't linger.
          await task.stop().catch(() => {});
          return;
        }
        // Ensure a Redux queue entry exists for the UI.
        if (!queueRef.current[meta.trackKey]) {
          dispatch(enqueueDownload({
            trackKey: meta.trackKey,
            audioUrl: meta.audioUrl,
            displayName: meta.displayName,
            baniTitle: meta.baniTitle,
            baniId: meta.baniId,
            sizeMB: meta.sizeMB,
          }));
        }

        if (task.state === 'DONE') {
          attachHandlers(task, meta);
          await finalizeDownload(meta);
          try { completeHandler(task.id); } catch (_) { /* best effort */ }
          return;
        }

        activeTasksRef.current.set(meta.trackKey, task);
        attachHandlers(task, meta);

        // Respect an explicit user pause across app restarts: keep it paused and
        // don't flip it to 'downloading'.
        if (queueRef.current[meta.trackKey]?.status === 'paused_user') {
          if (task.state !== 'PAUSED') await task.pause().catch(() => {});
          return;
        }

        dispatch(updateDownloadStatus(meta.trackKey, 'downloading'));
        if (task.state === 'PAUSED' && networkRef.current.isConnected) {
          // Use the longer startup timeout — the native task may need a full TCP
          // re-handshake after an OS kill or extended pause; 60 s avoids a false
          // positive restart on a slow-reconnecting mobile connection.
          armStallTimer(meta.trackKey, RESUME_STARTUP_TIMEOUT_MS);
          await task.resume().catch(() => {
            // resume() failed — native handle is dead; force a fresh start.
            clearStallTimer(meta.trackKey);
            activeTasksRef.current.delete(meta.trackKey);
            dispatchRef.current(updateDownloadStatus(meta.trackKey, 'queued'));
          });
        }
      }));
    };

    reattach();
    cleanupLegacyTempFiles().catch(() => {});

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Network listener ───────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(({ isConnected, type }) => {
      const isWifi = type === 'wifi';
      networkRef.current = { isConnected: Boolean(isConnected), isWifi };

      if (!isConnected) {
        // Connection dropped: pause all stall timers so they don't fire while
        // offline (the native layer will resume automatically when connectivity
        // returns; false-positive force-restarts waste bytes on partial files).
        Object.values(queueRef.current).forEach((t) => {
          if (t.status === 'downloading') clearStallTimer(t.trackKey);
          if (t.status === 'queued') dispatch(updateDownloadStatus(t.trackKey, 'paused_no_network'));
        });
      } else if (!isWifi && wifiOnlyRef.current) {
        // WiFi dropped to cellular (or connection switched) while wifi-only is ON.
        // Pause both queued entries AND any actively-downloading native tasks so
        // no metered bytes flow. `task.pause()` preserves the partial file so the
        // download resumes from where it left off when WiFi returns.
        Object.values(queueRef.current).forEach((t) => {
          if (t.status === 'queued') {
            dispatch(updateDownloadStatus(t.trackKey, 'paused_wifi_only'));
          } else if (t.status === 'downloading') {
            // Clear stall timer first — the task is being intentionally paused,
            // not stalled, so the watchdog must not fire on the paused handle.
            clearStallTimer(t.trackKey);
            const task = activeTasksRef.current.get(t.trackKey);
            if (task) task.pause().catch(() => {});
            dispatch(updateDownloadStatus(t.trackKey, 'paused_wifi_only'));
          }
        });
      } else {
        // Network (back) — re-arm stall timers for tasks that were mid-flight
        // and re-queue any network-paused entries.
        Object.values(queueRef.current).forEach((t) => {
          if (t.status === 'downloading') armStallTimer(t.trackKey);
        });
        dispatch(requeuePausedDownloads(['paused_no_network', 'paused_wifi_only']));
      }
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When WiFi-only is turned OFF while on cellular, release the gate.
  useEffect(() => {
    if (!downloadWifiOnly && networkRef.current.isConnected) {
      dispatch(requeuePausedDownloads(['paused_wifi_only']));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downloadWifiOnly]);

  // Clean up all stall timers on unmount (defensive; this hook is mounted for
  // the full app lifetime so in practice this never fires).
  useEffect(() => () => {
    stallTimersRef.current.forEach((t) => clearTimeout(t));
    stallTimersRef.current.clear();
  }, []);
};

export default useGlobalDownloadManager;
