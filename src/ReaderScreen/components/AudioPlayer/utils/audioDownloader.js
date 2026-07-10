import {
  downloadFile,
  exists,
  stat,
  DocumentDirectoryPath,
  unlink,
  mkdir,
  readDir,
  readFile,
  writeFile,
} from "react-native-fs";
import { logError, logMessage } from "@common";
import { checkIsJsonRemoteExists } from "./checkHelper";
import BUNDLED_LYRICS from "../assets/lyrics/bundledLyrics";

/**
 * Audio Downloader Utility
 *
 * Handles downloading audio tracks with progress tracking and file management
 */

// Audio files directory
const AUDIO_DIRECTORY = `${DocumentDirectoryPath}/audio`;
const PREFETCH_AUDIO_DIRECTORY = `${DocumentDirectoryPath}/audio_prefetch`;
const PREFETCH_INDEX_PATH = `${PREFETCH_AUDIO_DIRECTORY}/.prefetch-index.json`;
// Dedicated cache for the tiny (~200KB) 15-second preview clips. Kept separate
// from the full-track caches so previews are never evicted by the full-track
// LRU and vice-versa.
//
// The `_v2` suffix intentionally abandons any clips written by earlier builds:
// a concurrent-download race could truncate a clip on disk, and a truncated
// M4A wedges ExoPlayer in Buffering forever on Android. Bumping the directory
// guarantees every device re-downloads clean clips via the now race-free
// downloader, with no reinstall or manual cache-clear needed.
const LEGACY_PREVIEW_AUDIO_DIRECTORY = `${DocumentDirectoryPath}/audio_preview`;
const PREVIEW_AUDIO_DIRECTORY = `${DocumentDirectoryPath}/audio_preview_v2`;
// Best-effort one-time cleanup of the abandoned v1 directory (guarded so the
// unlink is attempted at most once per app session).
let legacyPreviewCleanupDone = false;

/**
 * Generate safe filename from URL and track info
 */
const generateFilename = (url) => {
  try {
    // Extract filename from URL or generate one
    const urlParts = url.split("/");
    const artistName = urlParts[urlParts.length - 2];
    const fileName = urlParts[urlParts.length - 1];
    return { artistName, fileName };
  } catch (error) {
    // Fallback to simple filename
    return { artistName: null, fileName: null };
  }
};

const ensureArtistDirectory = async (artistName, baseDirectory = AUDIO_DIRECTORY) => {
  const audioDirectoryExists = await exists(baseDirectory);

  if (!audioDirectoryExists) {
    await mkdir(baseDirectory, { NSURLIsExcludedFromBackupKey: true });
  }

  const artistDirectory = `${baseDirectory}/${artistName}`;
  const artistDirectoryExists = await exists(artistDirectory);

  if (!artistDirectoryExists) {
    await mkdir(artistDirectory, { NSURLIsExcludedFromBackupKey: true });
  }
};

const buildTrackPaths = (url, baseDirectory = AUDIO_DIRECTORY) => {
  const { artistName, fileName } = generateFilename(url);
  const audioRelativePath = `${artistName}/${fileName}`;
  const fullAudioPath = `${baseDirectory}/${audioRelativePath}`;
  const jsonFileName = fileName.replace(/\.[^/.]+$/, ".json");
  const jsonRelativePath = `${artistName}/${jsonFileName}`;
  const fullJsonPath = `${AUDIO_DIRECTORY}/${jsonRelativePath}`;
  const jsonUrl = url.replace(/\.[^/.]+$/, ".json");

  return {
    artistName,
    fileName,
    audioRelativePath,
    fullAudioPath,
    jsonFileName,
    jsonRelativePath,
    fullJsonPath,
    jsonUrl,
  };
};

/**
 * Check if track is already downloaded
 */
export const isTrackDownloaded = async (url) => {
  try {
    const { artistName, fileName } = generateFilename(url);
    const audioFilePath = `${AUDIO_DIRECTORY}/${artistName}/${fileName}`;
    const jsonFileName = fileName.replace(/\.[^/.]+$/, ".json");
    const jsonFilePath = `${AUDIO_DIRECTORY}/${artistName}/${jsonFileName}`;

    const audioFileExists = await exists(audioFilePath);
    const jsonFileExists = await exists(jsonFilePath);

    return { audioFileExists, jsonFileExists };
  } catch (error) {
    logError(`Error checking if track is downloaded: ${error.message}`);
    return { audioFileExists: false, jsonFileExists: false };
  }
};

/**
 * Get local file path for downloaded track
 */
export const getLocalTrackPath = (url) => {
  const { artistName, fileName } = generateFilename(url);
  return `${artistName}/${fileName}`;
};

export const getFullLocalTrackPath = (url) => {
  const { artistName, fileName } = generateFilename(url);
  return `${AUDIO_DIRECTORY}/${artistName}/${fileName}`;
};

export const getFullPrefetchTrackPath = (url) => {
  const { artistName, fileName } = generateFilename(url);
  return `${PREFETCH_AUDIO_DIRECTORY}/${artistName}/${fileName}`;
};

/**
 * Preview clips live next to the full track on the CDN, with a `-preview`
 * suffix inserted before the extension (kept AFTER any length variant):
 *   .../AnandSahib.m4a          -> .../AnandSahib-preview.m4a
 *   .../RehrasSahib-trimmed.m4a -> .../RehrasSahib-trimmed-preview.m4a
 * Not every track has a preview clip yet, so the returned URL may 404 — callers
 * must treat a failed download as "no preview" and fall back to the full track.
 */
export const getPreviewRemoteUrl = (url) => {
  if (!url || typeof url !== "string") return null;
  if (!/\.m4a(\?|$)/i.test(url)) return null;
  // The Anand Sahib "6 Pauri" variant has no dedicated preview clip, so reuse
  // the full Anand Sahib preview:
  //   AnandSahib-6-pauri.m4a -> AnandSahib-preview.m4a
  const normalized = url.replace(/-6-pauri\.m4a(\?|$)/i, ".m4a$1");
  return normalized.replace(/\.m4a(\?|$)/i, "-preview.m4a$1");
};

export const getFullPreviewTrackPath = (previewUrl) => {
  const { artistName, fileName } = generateFilename(previewUrl);
  return `${PREVIEW_AUDIO_DIRECTORY}/${artistName}/${fileName}`;
};

// In-flight preview downloads, keyed by preview URL. Ensures the background
// reader-open prefetch and an on-tap request for the SAME clip share a single
// download instead of racing two writes to the same file (which is slow and can
// corrupt the file). A tap landing mid-prefetch simply awaits the ongoing one.
const previewDownloadsInFlight = new Map();

/**
 * Ensure the 15-second preview clip for a track is cached on disk. Returns the
 * local file path if available (already cached or freshly downloaded), or null
 * when the track has no preview clip on the CDN (404) or the download fails —
 * the caller then falls back to streaming the full track and cutting at 15s.
 */
export const ensurePreviewDownloaded = async (canonicalUrl, trackTitle = "Preview") => {
  const previewUrl = getPreviewRemoteUrl(canonicalUrl);
  // Only remote clips can be fetched; local-only tracks already play instantly.
  if (!previewUrl || !/^https?:\/\//i.test(previewUrl)) {
    return null;
  }

  // Reuse an in-flight download for the same clip. This check and the map set
  // below MUST run with no await between them — otherwise two concurrent callers
  // (the reader-open prefetch and an on-tap request for the same clip) could both
  // pass this check and both kick off a download to the SAME file, whose
  // interleaved writes truncate it on disk. A truncated clip then wedges
  // ExoPlayer in Buffering forever on the next play. The exists() fast-path
  // therefore lives INSIDE the task, after the map is claimed.
  if (previewDownloadsInFlight.has(previewUrl)) {
    return previewDownloadsInFlight.get(previewUrl);
  }

  const fullPath = getFullPreviewTrackPath(previewUrl);
  const task = (async () => {
    try {
      if (await exists(fullPath)) {
        return fullPath;
      }
      await downloadAudioOnly(previewUrl, trackTitle, { targetDirectory: "preview" });
      return (await exists(fullPath)) ? fullPath : null;
    } catch (_) {
      // 404 (no preview) or a network failure. Remove any partial file so a
      // later attempt re-downloads cleanly instead of playing a truncated clip.
      await unlink(fullPath).catch(() => {});
      return null;
    } finally {
      previewDownloadsInFlight.delete(previewUrl);
    }
  })();

  previewDownloadsInFlight.set(previewUrl, task);
  return task;
};

/**
 * Delete a cached preview clip — used to self-heal a clip that failed to play
 * (e.g. a truncated file left by an older build) so the next tap re-downloads it.
 */
export const deletePreviewClip = async (canonicalUrl) => {
  const previewUrl = getPreviewRemoteUrl(canonicalUrl);
  if (!previewUrl) {
    return;
  }
  await unlink(getFullPreviewTrackPath(previewUrl)).catch(() => {});
};

/**
 * Warm the preview cache for an entire bani so tapping any preview in the
 * AudioTrackDialog plays instantly from disk. Preview clips are ~200KB each, so
 * fetching every artist's clip on reader-open costs well under 1MB total. Runs
 * with limited concurrency, dedupes by URL, and never throws.
 */
export const prefetchPreviews = async (tracks) => {
  if (!Array.isArray(tracks) || tracks.length === 0) {
    return;
  }

  // Reclaim the abandoned v1 preview directory once per session (best-effort).
  if (!legacyPreviewCleanupDone) {
    legacyPreviewCleanupDone = true;
    unlink(LEGACY_PREVIEW_AUDIO_DIRECTORY).catch(() => {});
  }

  const seen = new Set();
  const queue = [];
  for (const track of tracks) {
    const canonical = track?.remoteUrl || track?.audioUrl;
    const previewUrl = getPreviewRemoteUrl(canonical);
    if (!previewUrl || !/^https?:\/\//i.test(previewUrl) || seen.has(previewUrl)) {
      continue;
    }
    seen.add(previewUrl);
    queue.push({ canonical, title: track?.displayName || "Preview" });
  }

  if (queue.length === 0) {
    return;
  }

  // Clips are tiny (~200KB) and a bani has at most ~3 of them, so fetch the
  // whole set in parallel — the sooner every clip is on disk, the more likely
  // it's ready before the user can tap. ensurePreviewDownloaded dedupes, so an
  // on-tap request shares whichever download is already running here.
  await Promise.all(
    queue.map((item) => ensurePreviewDownloaded(item.canonical, item.title).catch(() => {}))
  );
};

export const getLocalJsonPath = (url) => {
  const { artistName, fileName } = generateFilename(url);
  const jsonFileName = fileName.replace(/\.[^/.]+$/, ".json");
  return `${artistName}/${jsonFileName}`;
};

export const getFullLocalJsonPath = (url) => {
  const { artistName, fileName } = generateFilename(url);
  const jsonFileName = fileName.replace(/\.[^/.]+$/, ".json");
  return `${AUDIO_DIRECTORY}/${artistName}/${jsonFileName}`;
};

export const downloadAudioOnly = async (url, trackTitle, options = {}) => {
  const { skipDirectorySetup = false, targetDirectory = "main", expectedSizeMB = 0 } = options;
  const baseDirectory =
    targetDirectory === "prefetch"
      ? PREFETCH_AUDIO_DIRECTORY
      : targetDirectory === "preview"
      ? PREVIEW_AUDIO_DIRECTORY
      : AUDIO_DIRECTORY;
  const { artistName, fileName, fullAudioPath, audioRelativePath } = buildTrackPaths(
    url,
    baseDirectory
  );

  if (!skipDirectorySetup) {
    await ensureArtistDirectory(artistName, baseDirectory);
  }

  const audioFileExists = await exists(fullAudioPath);
  if (audioFileExists) {
    const expectedBytes = expectedSizeMB > 0 ? expectedSizeMB * 1024 * 1024 : 0;
    if (expectedBytes > 0) {
      const existingFileStat = await stat(fullAudioPath);
      if (Number(existingFileStat.size) < expectedBytes * 0.9) {
        await unlink(fullAudioPath).catch(() => {});
      } else {
        logMessage(`Audio already downloaded: ${fileName}`);
        return { relativePath: audioRelativePath, alreadyExists: true, downloaded: false, jobId: null };
      }
    } else {
      logMessage(`Audio already downloaded: ${fileName}`);
      return { relativePath: audioRelativePath, alreadyExists: true, downloaded: false, jobId: null };
    }
  }

  // progressDivider: 20 — fire the progress callback only once per ~5 % of file size
  // instead of on every bytes chunk, keeping the JS thread free on low-end devices.
  const audioDownloadTask = downloadFile({
    fromUrl: url,
    toFile: fullAudioPath,
    progressDivider: 20,
    begin: () => {
      logMessage(`Audio download started for: ${trackTitle}`);
    },
  });

  const jobId = audioDownloadTask.jobId;
  const audioResult = await audioDownloadTask.promise;

  // ── Strict validation: reject anything that isn't a clean 200 download ──
  if (audioResult.statusCode !== 200) {
    // Delete partial/error file so exists() never returns true for a corrupt file.
    await unlink(fullAudioPath).catch(() => {});
    throw new Error(`Audio download failed with HTTP ${audioResult.statusCode}`);
  }

  const finalAudioExists = await exists(fullAudioPath);
  if (!finalAudioExists) {
    throw new Error("Audio download completed but file was not created on disk");
  }

  // Size sanity check — a valid M4A bani audio file is always well over 100KB.
  // A file under 100KB means the download was truncated (server closed early,
  // network drop, DOZE killed the connection, etc.) or the moov atom is missing.
  const fileStat = await stat(fullAudioPath);
  if (Number(fileStat.size) < 100000) {
    await unlink(fullAudioPath).catch(() => {});
    throw new Error(`Downloaded file too small: ${fileStat.size} bytes — likely corrupt/truncated`);
  }

  logMessage(`Audio download completed: ${fileName} (${fileStat.size} bytes)`);
  return { relativePath: audioRelativePath, alreadyExists: false, downloaded: true, jobId };
};

const readPrefetchIndex = async () => {
  try {
    const indexExists = await exists(PREFETCH_INDEX_PATH);
    if (!indexExists) {
      return {};
    }
    const raw = await readFile(PREFETCH_INDEX_PATH, "utf8");
    const parsed = JSON.parse(raw || "{}");
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
    return {};
  } catch (_) {
    return {};
  }
};

const writePrefetchIndex = async (indexData) => {
  try {
    const indexDirectoryExists = await exists(PREFETCH_AUDIO_DIRECTORY);
    if (!indexDirectoryExists) {
      await mkdir(PREFETCH_AUDIO_DIRECTORY, { NSURLIsExcludedFromBackupKey: true });
    }
    await writeFile(PREFETCH_INDEX_PATH, JSON.stringify(indexData), "utf8");
  } catch (_) {
    // Best effort cache metadata write.
  }
};

export const touchPrefetchTrack = async (url) => {
  try {
    const fullPath = getFullPrefetchTrackPath(url);
    const fileExists = await exists(fullPath);
    if (!fileExists) {
      return;
    }

    const index = await readPrefetchIndex();
    index[fullPath] = Date.now();
    await writePrefetchIndex(index);
  } catch (_) {
    // Best effort cache metadata update.
  }
};

export const prunePrefetchCache = async (maxTracks = 5) => {
  try {
    const directoryExists = await exists(PREFETCH_AUDIO_DIRECTORY);
    if (!directoryExists) {
      return;
    }

    const index = await readPrefetchIndex();
    const allEntries = Object.entries(index);

    // Run all existence checks in parallel — avoids serial filesystem blocking
    // on every seek (each exists() syscall can take 5-20ms on Android flash).
    const verifiedEntries = (
      await Promise.all(
        allEntries
          .filter(([fullPath]) => fullPath !== PREFETCH_INDEX_PATH)
          .map(async ([fullPath, ts]) => {
            const fileExists = await exists(fullPath);
            return fileExists ? [fullPath, Number(ts) || 0] : null;
          })
      )
    ).filter(Boolean);

    verifiedEntries.sort((a, b) => b[1] - a[1]);
    const keepSet = new Set(verifiedEntries.slice(0, maxTracks).map(([fullPath]) => fullPath));

    const nextIndex = {};
    for (const [fullPath, ts] of verifiedEntries) {
      if (keepSet.has(fullPath)) {
        nextIndex[fullPath] = ts;
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      await unlink(fullPath).catch(() => {});
    }

    // Clean up empty artist directories if any were left behind.
    const children = await readDir(PREFETCH_AUDIO_DIRECTORY).catch(() => []);
    for (const entry of children) {
      if (!entry.isDirectory || !entry.isDirectory()) {
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      const subItems = await readDir(entry.path).catch(() => []);
      if (subItems.length === 0) {
        // eslint-disable-next-line no-await-in-loop
        await unlink(entry.path).catch(() => {});
      }
    }

    await writePrefetchIndex(nextIndex);
  } catch (error) {
    logError(`Error pruning prefetch cache: ${error?.message || error}`);
  }
};

export const downloadLyricsOnly = async (url, trackTitle, options = {}) => {
  const { skipDirectorySetup = false } = options;
  const { artistName, jsonFileName, jsonUrl, fullJsonPath, jsonRelativePath } =
    buildTrackPaths(url);

  if (!skipDirectorySetup) {
    await ensureArtistDirectory(artistName);
  }

  // ── 1. Local check first — zero network if already on disk ───────────────
  const jsonFileExists = await exists(fullJsonPath);
  if (jsonFileExists) {
    logMessage(`Lyrics already downloaded: ${jsonFileName}`);
    return {
      relativePath: jsonRelativePath,
      alreadyExists: true,
      downloaded: false,
      remoteMissing: false,
    };
  }

  // ── 2. Bundle lookup — if bundled, we know it's on Azure; skip HEAD ───────
  // ── 3. HEAD fallback — only for future tracks not yet in the bundle ───────
  const isBundled = Object.prototype.hasOwnProperty.call(BUNDLED_LYRICS, jsonUrl);
  if (!isBundled) {
    const jsonRemoteExists = await checkIsJsonRemoteExists(jsonUrl);
    if (!jsonRemoteExists) {
      logMessage(`Lyrics not available for download, skipping: ${jsonFileName}`);
      return {
        relativePath: jsonRelativePath,
        alreadyExists: false,
        downloaded: false,
        remoteMissing: true,
      };
    }
  }

  const jsonDownloadTask = downloadFile({
    fromUrl: jsonUrl,
    toFile: fullJsonPath,
    progressDivider: 20,
    begin: () => {
      logMessage(`Lyrics download started for: ${trackTitle}`);
    },
  });

  const jsonResult = await jsonDownloadTask.promise;

  if (jsonResult.statusCode !== 200) {
    logError(`Lyrics download failed with status code: ${jsonResult.statusCode}`);
  }

  const finalJsonExists = await exists(fullJsonPath);
  if (!finalJsonExists) {
    logError("Lyrics download completed but file was not created");
  }

  logMessage(`Lyrics download completed: ${jsonFileName}`);
  return {
    relativePath: jsonRelativePath,
    alreadyExists: false,
    downloaded: true,
    remoteMissing: false,
  };
};

/**
 * Download audio track with progress tracking
 */
export const downloadTrack = async (url, trackTitle, expectedSizeMB = 0) => {
  try {
    const { artistName, fileName, jsonFileName } = buildTrackPaths(url);

    await ensureArtistDirectory(artistName);

    const audioResult = await downloadAudioOnly(url, trackTitle, { skipDirectorySetup: true, expectedSizeMB });
    const lyricsResult = await downloadLyricsOnly(url, trackTitle, { skipDirectorySetup: true });
    const lyricsAvailable = !lyricsResult.remoteMissing;
    const lyricsSatisfied = lyricsAvailable
      ? lyricsResult.alreadyExists || lyricsResult.downloaded
      : true;

    if (audioResult.alreadyExists && lyricsSatisfied) {
      logMessage(`Track already downloaded${lyricsAvailable ? " with lyrics" : ""}: ${fileName}`);
      const result = {
        audioRelativePath: audioResult.relativePath,
        jsonRelativePath: lyricsAvailable ? lyricsResult.relativePath : null,
      };
      return result;
    }

    if (lyricsAvailable) {
      logMessage(`Download completed: ${fileName} and ${jsonFileName}`);
    } else {
      logMessage(`Download completed: ${fileName} (no lyrics available)`);
    }

    const result = {
      audioRelativePath:
        audioResult.alreadyExists || audioResult.downloaded ? audioResult.relativePath : null,
      jsonRelativePath: lyricsAvailable ? lyricsResult.relativePath : null,
    };
    return result;
  } catch (error) {
    logError(`Download error for ${trackTitle}: ${error.message}`);

    // Clean up partial downloads if they exist
    try {
      const fullLocalPath = getFullLocalTrackPath(url);
      const { artistName, fileName } = generateFilename(url);
      const jsonFileName = fileName.replace(/\.[^/.]+$/, ".json");
      const fullJsonPath = `${AUDIO_DIRECTORY}/${artistName}/${jsonFileName}`;

      const audioFileExists = await exists(fullLocalPath);
      const jsonFileExists = await exists(fullJsonPath);

      if (audioFileExists) {
        await unlink(fullLocalPath);
      }
      if (jsonFileExists) {
        await unlink(fullJsonPath);
      }
    } catch (cleanupError) {
      logError(`Error cleaning up failed download: ${cleanupError.message}`);
    }
    logError(`Download error for ${trackTitle}: ${error.message}`);
    return null;
  }
};
