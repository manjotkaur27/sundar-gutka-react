import {
  downloadFile,
  stopDownload,
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
  const { skipDirectorySetup = false, targetDirectory = "main" } = options;
  const baseDirectory = targetDirectory === "prefetch" ? PREFETCH_AUDIO_DIRECTORY : AUDIO_DIRECTORY;
  const { artistName, fileName, fullAudioPath, audioRelativePath } = buildTrackPaths(
    url,
    baseDirectory
  );

  if (!skipDirectorySetup) {
    await ensureArtistDirectory(artistName, baseDirectory);
  }

  const audioFileExists = await exists(fullAudioPath);
  if (audioFileExists) {
    logMessage(`Audio already downloaded: ${fileName}`);
    return { relativePath: audioRelativePath, alreadyExists: true, downloaded: false, jobId: null };
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
export const downloadTrack = async (url, trackTitle) => {
  try {
    const { artistName, fileName, jsonFileName } = buildTrackPaths(url);

    await ensureArtistDirectory(artistName);

    const audioResult = await downloadAudioOnly(url, trackTitle, { skipDirectorySetup: true });
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
