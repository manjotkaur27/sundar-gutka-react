import { useState, useEffect } from "react";
import { DocumentDirectoryPath, exists } from "react-native-fs";
import { useSelector, useDispatch } from "react-redux";
import { actions, logError, STRINGS } from "@common";
import constant from "@common/constant";
import { fetchManifest } from "@service";

const ALLOWED_ARTIST_IDS = [4, 8, 9];
const ALLOWED_ARTIST_NAME_KEYWORDS = ["jarnail", "indermohan", "gurdev"];
const ALLOWED_ARTIST_URL_KEYWORDS = ["bhaijarnailsingh", "indermohankauruk", "gianigurdevsingh"];

// Base URL for all Azure Blob audio assets
const _BLOB = "https://banidb.blob.core.windows.net/audios";

/**
 * Emergency manifests cover all supported banis for all 3 artists.
 * These are used as a last-resort when both the remote API and session cache
 * are unavailable (e.g. first launch with no network).
 */
const EMERGENCY_MANIFEST_BY_BANI = {
  2: {
    status: "success",
    data: [
      { bani_id: 2, track_id: 1002, track_url: `${_BLOB}/BhaiJarnailSingh/JapjiSahib.m4a`, track_length_seconds: 985.547, track_size_mb: 15.39, artist_name: "Bhai Jarnail Singh", artist_id: 4, lyrics_url: `${_BLOB}/BhaiJarnailSingh/japji-sahib.json` },
      { bani_id: 2, track_id: 2002, track_url: `${_BLOB}/IndermohanKaurUK/JapjiSahib.m4a`, track_length_seconds: 1156, track_size_mb: 17.94, artist_name: "Bibi Indermohan Kaur", artist_id: 8, lyrics_url: `${_BLOB}/IndermohanKaurUK/JapjiSahib.json` },
      { bani_id: 2, track_id: 3002, track_url: `${_BLOB}/GianiGurdevSingh/JapjiSahib.m4a`, track_length_seconds: 1257, track_size_mb: 19.69, artist_name: "Giani Gurdev Singh", artist_id: 9, lyrics_url: `${_BLOB}/GianiGurdevSingh/JapjiSahib.json` },
    ],
  },
  4: {
    status: "success",
    data: [
      { bani_id: 4, track_id: 1004, track_url: `${_BLOB}/BhaiJarnailSingh/JaapSahib.m4a`, track_length_seconds: 987, track_size_mb: 15.36, artist_name: "Bhai Jarnail Singh", artist_id: 4, lyrics_url: `${_BLOB}/BhaiJarnailSingh/jaap-sahib.json` },
      { bani_id: 4, track_id: 2004, track_url: `${_BLOB}/IndermohanKaurUK/JaapSahib.m4a`, track_length_seconds: 1170, track_size_mb: 18.18, artist_name: "Bibi Indermohan Kaur", artist_id: 8, lyrics_url: `${_BLOB}/IndermohanKaurUK/JaapSahib.json` },
      { bani_id: 4, track_id: 3004, track_url: `${_BLOB}/GianiGurdevSingh/JaapSahib.m4a`, track_length_seconds: 1281, track_size_mb: 20.06, artist_name: "Giani Gurdev Singh", artist_id: 9, lyrics_url: `${_BLOB}/GianiGurdevSingh/JaapSahib.json` },
    ],
  },
  6: {
    status: "success",
    data: [
      { bani_id: 6, track_id: 1006, track_url: `${_BLOB}/BhaiJarnailSingh/Saviye.m4a`, track_length_seconds: 207, track_size_mb: 3.23, artist_name: "Bhai Jarnail Singh", artist_id: 4, lyrics_url: `${_BLOB}/BhaiJarnailSingh/saviye.json` },
      { bani_id: 6, track_id: 2006, track_url: `${_BLOB}/IndermohanKaurUK/TavParsadSwayiye.m4a`, track_length_seconds: 227, track_size_mb: 3.52, artist_name: "Bibi Indermohan Kaur", artist_id: 8, lyrics_url: `${_BLOB}/IndermohanKaurUK/TavParsadSwayiye.json` },
      { bani_id: 6, track_id: 3006, track_url: `${_BLOB}/GianiGurdevSingh/TavParsadSwayiye.m4a`, track_length_seconds: 237, track_size_mb: 3.71, artist_name: "Giani Gurdev Singh", artist_id: 9, lyrics_url: `${_BLOB}/GianiGurdevSingh/TavParsadSwayiye.json` },
    ],
  },
  9: (baniLength) => {
    // Chaupai Sahib — DB flag zones:
    //   Seqs  1–42 : existsBuddhaDal only (XL-only opening Dohra — no artist recorded this)
    //   Seqs 43–146: all flags = 1 (Short / Medium / Long / XL all include these)
    //   Seqs 147–173: existsTaksal + existsBuddhaDal (Long+XL closing sections)
    //
    // Audio availability:
    //   Short / Medium → trimmed M4A (seqs 43–146), rebased timestamps
    //   Long (Taksal)  → full original M4A (seqs 43–173, all closing sections)
    //   XL (BuddhaDal) → UNAVAILABLE — no artist recorded the seqs 1–42 opening
    // Original (no-suffix) files only — no trimmed variants.
    // BJS + GGS originals cover Long (seq 1–173).
    // Indermohan's original covers Short/Medium (her recording ends at seq 146).
    // Any other length combination → empty → maafi message.

    const isShortOrMedium = baniLength !== constant.LONG && baniLength !== constant.EXTRA_LONG;
    const isXL = baniLength === constant.EXTRA_LONG;

    if (isXL) return { status: "success", data: [] };

    if (isShortOrMedium) {
      return {
        status: "success",
        data: [
          { bani_id: 9, track_id: 2009, track_url: `${_BLOB}/IndermohanKaurUK/ChaupaiSahib.m4a`, track_length_seconds: 268, track_size_mb: 4.16, artist_name: "Bibi Indermohan Kaur", artist_id: 8, lyrics_url: `${_BLOB}/IndermohanKaurUK/ChaupaiSahib.json` },
        ],
      };
    }

    // LONG
    return {
      status: "success",
      data: [
        { bani_id: 9, track_id: 1009, track_url: `${_BLOB}/BhaiJarnailSingh/ChaupaiSahib.m4a`, track_length_seconds: 317, track_size_mb: 4.94, artist_name: "Bhai Jarnail Singh", artist_id: 4, lyrics_url: `${_BLOB}/BhaiJarnailSingh/chopai-sahib.json` },
        { bani_id: 9, track_id: 3009, track_url: `${_BLOB}/GianiGurdevSingh/ChaupaiSahib.m4a`, track_length_seconds: 378, track_size_mb: 5.86, artist_name: "Giani Gurdev Singh", artist_id: 9, lyrics_url: `${_BLOB}/GianiGurdevSingh/ChaupaiSahib.json` },
      ],
    };
  },
  10: {
    status: "success",
    data: [
      { bani_id: 10, track_id: 1010, track_url: `${_BLOB}/BhaiJarnailSingh/AnandSahib.m4a`, track_length_seconds: 784, track_size_mb: 12.18, artist_name: "Bhai Jarnail Singh", artist_id: 4, lyrics_url: `${_BLOB}/BhaiJarnailSingh/anand-sahib.json` },
      { bani_id: 10, track_id: 2010, track_url: `${_BLOB}/IndermohanKaurUK/AnandSahib.m4a`, track_length_seconds: 869, track_size_mb: 13.48, artist_name: "Bibi Indermohan Kaur", artist_id: 8, lyrics_url: `${_BLOB}/IndermohanKaurUK/AnandSahib.json` },
      { bani_id: 10, track_id: 3010, track_url: `${_BLOB}/GianiGurdevSingh/AnandSahib.m4a`, track_length_seconds: 994, track_size_mb: 15.52, artist_name: "Giani Gurdev Singh", artist_id: 9, lyrics_url: `${_BLOB}/GianiGurdevSingh/AnandSahib.json` },
    ],
  },
  // Anand Sahib 6 Paudi — pauris 1–5 + pauri 40 (last) trimmed from bani 10 audio.
  // Audio files are trimmed M4As; JSON timestamps are rebased to match the trimmed audio.
  1000: {
    status: "success",
    data: [
      { bani_id: 1000, track_id: 11000, track_url: `${_BLOB}/BhaiJarnailSingh/AnandSahib-6-pauri.m4a`, track_length_seconds: 150.977, track_size_mb: 2.34, artist_name: "Bhai Jarnail Singh", artist_id: 4, lyrics_url: `${_BLOB}/BhaiJarnailSingh/anand-sahib-6-pauri.json` },
      { bani_id: 1000, track_id: 21000, track_url: `${_BLOB}/IndermohanKaurUK/AnandSahib-6-pauri.m4a`, track_length_seconds: 142.631, track_size_mb: 2.19, artist_name: "Bibi Indermohan Kaur", artist_id: 8, lyrics_url: `${_BLOB}/IndermohanKaurUK/AnandSahib-6-pauri.json` },
      { bani_id: 1000, track_id: 31000, track_url: `${_BLOB}/GianiGurdevSingh/AnandSahib-6-pauri.m4a`, track_length_seconds: 182.856, track_size_mb: 2.84, artist_name: "Giani Gurdev Singh", artist_id: 9, lyrics_url: `${_BLOB}/GianiGurdevSingh/AnandSahib-6-pauri.json` },
    ],
  },
  21: (baniLength) => {
    // Rehras Sahib — DB flag zones:
    //   Short (SGPC) -> 1, 20-169, 215-318, 487-540
    //   Medium -> 1, 12-169, 215-318, 487-563
    //   Long (Taksal) -> 1, 8-169, 175-178, 207-375, 405-416, 469-471, 473-563
    //   XL (BuddhaDal) -> 1-563 (No audio available)

    // Original (no-suffix) files only — no trimmed variants.
    // BJS + Indermohan originals cover Long only.
    // Short/Medium/XL → empty → maafi message.

    const isLong = baniLength === constant.LONG;

    if (!isLong) return { status: "success", data: [] };

    return {
      status: "success",
      data: [
        { bani_id: 21, track_id: 1021, track_url: `${_BLOB}/BhaiJarnailSingh/RehrasSahib.m4a`, track_length_seconds: 1335, track_size_mb: 20.50, artist_name: "Bhai Jarnail Singh", artist_id: 4, lyrics_url: `${_BLOB}/BhaiJarnailSingh/Rehras-sahib.json` },
        { bani_id: 21, track_id: 2021, track_url: `${_BLOB}/IndermohanKaurUK/RehrasSahib.m4a`, track_length_seconds: 1145, track_size_mb: 17.77, artist_name: "Bibi Indermohan Kaur", artist_id: 8, lyrics_url: `${_BLOB}/IndermohanKaurUK/RehrasSahib.json` },
      ],
    };
  },
  23: (baniLength) => {
    // Kirtan Sohila
    // Short/Medium: seq 32-86
    // Long: seq 1-86
    // XL: seq 1-146 (No artist has recorded up to 146)
    
    // Original (no-suffix) files only — no trimmed variants.
    // Indermohan's original covers Short/Medium (seq 33–86).
    // BJS original covers Long (seq 1–86).
    // XL → empty → maafi message.

    const isShortOrMedium = baniLength === constant.SHORT || baniLength === constant.MEDIUM;
    const isXL = baniLength === constant.EXTRA_LONG;

    if (isXL) return { status: "success", data: [] };

    if (isShortOrMedium) {
      return {
        status: "success",
        data: [
          { bani_id: 23, track_id: 2023, track_url: `${_BLOB}/IndermohanKaurUK/KirtanSohaila.m4a`, track_length_seconds: 239, track_size_mb: 3.70, artist_name: "Bibi Indermohan Kaur", artist_id: 8, lyrics_url: `${_BLOB}/IndermohanKaurUK/KirtanSohaila.json` },
        ],
      };
    }

    // LONG
    return {
      status: "success",
      data: [
        { bani_id: 23, track_id: 1023, track_url: `${_BLOB}/BhaiJarnailSingh/KirtanSohaila.m4a`, track_length_seconds: 333, track_size_mb: 5.03, artist_name: "Bhai Jarnail Singh", artist_id: 4, lyrics_url: `${_BLOB}/BhaiJarnailSingh/kirtan-sohaila.json` },
      ],
    };
  },
};

const normalize = (value) => (value || "").toString().trim().toLowerCase();

const isAllowedArtist = ({ artistID, displayName, trackUrl }) => {
  const numericArtistId = Number(artistID);
  if (ALLOWED_ARTIST_IDS.includes(numericArtistId)) {
    return true;
  }

  const normalizedDisplayName = normalize(displayName);
  const normalizedTrackUrl = normalize(trackUrl);

  const matchesName = ALLOWED_ARTIST_NAME_KEYWORDS.some((keyword) =>
    normalizedDisplayName.includes(keyword)
  );
  const matchesUrl = ALLOWED_ARTIST_URL_KEYWORDS.some((keyword) =>
    normalizedTrackUrl.includes(keyword)
  );

  return matchesName || matchesUrl;
};

// Module-level cache for raw API responses.
// Re-navigating to the same bani within a session reuses the cached response
// instead of firing another network round-trip.
const _manifestApiCache = new Map();

export const __resetManifestApiCacheForTests = () => {
  _manifestApiCache.clear();
};

/**
 * Banis whose track_url / lyrics_url must be resolved client-side based on
 * bani length (because the remote API is unaware of per-length variants).
 * For these banis the emergency manifest is ALWAYS used as the source of
 * truth for URLs, regardless of what the API returns.
 */
const BANI_IDS_WITH_LENGTH_VARIANTS = new Set([9, 21, 23]);

const useAudioManifest = (baniID) => {
  const [tracks, setTracks] = useState([]);
  const [currentPlaying, setCurrentPlaying] = useState(null);
  const [isTracksLoading, setIsLoading] = useState(true);
  const [manifestError, setManifestError] = useState(null);
  const defaultAudio = useSelector((state) => state.defaultAudio);
  const baniLength = useSelector((state) => state.baniLength);

  const dispatch = useDispatch();
  const audioManifest = useSelector((state) => state.audioManifest);
  // Gate manifest fetch on redux-persist rehydration — prevents re-downloading
  // tracks that are already on disk but whose manifest hasn't been restored yet.
  const isRehydrated = useSelector((state) => state._persist?.rehydrated);

  // Map API manifest data to our track format
  const mapApiDataToTracks = (manifest) => {
    if (!manifest?.data || manifest.data.length === 0) {
      return null;
    }

    return manifest.data
      .filter(
        (item) =>
          item != null &&
          item.track_url &&
          isAllowedArtist({
            artistID: item.artist_id,
            displayName: item.artist_name,
            trackUrl: item.track_url,
          })
      )
      .map((item) => {
        const hasExplicitLyricsUrl = Object.prototype.hasOwnProperty.call(item, "lyrics_url");
        const lyricsUrl = hasExplicitLyricsUrl
          ? item.lyrics_url
          : item.track_url
          ? item.track_url.replace(/\.m4a$/i, ".json")
            : null;

        return {
          id: item.track_id,
          track_id: item.track_id,
          artistID: item.artist_id,
          audioUrl: item.track_url,
          remoteUrl: item.track_url,
          displayName: item.artist_name,
          trackLengthSec: item.track_length_seconds,
          trackSizeMB: item.track_size_mb,
          lyricsUrl,
          isLocallyDownloaded: false,
        };
      });
  };

  const getEmergencyManifest = () => {
    const entry = EMERGENCY_MANIFEST_BY_BANI[Number(baniID)];
    if (!entry) return null;
    // Bani 9 (Chaupai Sahib) emergency manifest is a function that resolves
    // the correct track/lyrics URLs based on the current bani length setting.
    return typeof entry === "function" ? entry(baniLength) : entry;
  };

  // Merge downloaded tracks with API tracks
  const mergeDownloadedTracks = async (apiTracks, downloadedTracks) => {
    if (!apiTracks || apiTracks.length === 0) {
      // If no API data, use downloaded tracks
      if (!downloadedTracks || downloadedTracks.length === 0) {
        return [];
      }
      const validatedDownloads = await Promise.all(
        downloadedTracks.map(async (track) => {
          if (
            !isAllowedArtist({
              artistID: track.artistID,
              displayName: track.displayName,
              trackUrl: track.remoteUrl || track.audioUrl,
            })
          ) {
            return null;
          }

          const fullLocalPath = `${DocumentDirectoryPath}/audio/${track.audioUrl}`;
          const lyricsUrlPath = track.lyricsUrl
            ? `${DocumentDirectoryPath}/audio/${track.lyricsUrl}`
            : null;
          let hasAudio = false;
          let hasLyrics = true;
          try {
            hasAudio = await exists(fullLocalPath);
          } catch (error) {
            // If file existence check fails, treat as missing
            hasAudio = false;
          }
          if (lyricsUrlPath) {
            try {
              hasLyrics = await exists(lyricsUrlPath);
            } catch (error) {
              // If file existence check fails, treat as missing
              hasLyrics = false;
            }
          }
          if (!hasAudio) {
            return null;
          }

          return {
            id: track.id,
            track_id: track.track_id,
            artistID: track.artistID,
            audioUrl: fullLocalPath,
            displayName: track.displayName,
            trackLengthSec: track.trackLengthSec,
            trackSizeMB: track.trackSizeMB,
            lyricsUrl: track.lyricsUrl && hasLyrics ? lyricsUrlPath : null,
            isLocallyDownloaded: true,
          };
        })
      );

      // Filter out any missing/broken downloads
      return validatedDownloads.filter((track) => track !== null);
    }

    // Merge downloaded tracks with API tracks, falling back to remote if local file is missing
    const mergedTracks = await Promise.all(
      apiTracks.map(async (apiTrack) => {
        const downloadedTrack = downloadedTracks.find(
          (downloaded) => String(downloaded.id) === String(apiTrack.id)
        );

        // For bani-length variants, the same track_id maps to different audio
        // files depending on the selected length. If the cached entry's
        // remoteUrl doesn't match the currently expected URL, the local file
        // belongs to a different length — ignore it and stream the correct one.
        const remoteUrlMatches =
          !downloadedTrack?.remoteUrl ||
          downloadedTrack.remoteUrl === apiTrack.audioUrl;
        const validDownloadedTrack = downloadedTrack && remoteUrlMatches ? downloadedTrack : null;

        const fullLocalPath = validDownloadedTrack
          ? `${DocumentDirectoryPath}/audio/${validDownloadedTrack.audioUrl}`
          : null;
        const lyricsUrlPath =
          validDownloadedTrack && validDownloadedTrack.lyricsUrl
            ? `${DocumentDirectoryPath}/audio/${validDownloadedTrack.lyricsUrl}`
            : null;

        let hasAudio = false;
        let hasLyrics = true;
        if (fullLocalPath) {
          try {
            hasAudio = await exists(fullLocalPath);
          } catch (error) {
            // If file existence check fails, treat as missing
            hasAudio = false;
          }
        }
        if (lyricsUrlPath) {
          try {
            hasLyrics = await exists(lyricsUrlPath);
          } catch (error) {
            // If file existence check fails, treat as missing
            hasLyrics = false;
          }
        }

        if (validDownloadedTrack && hasAudio) {
          return {
            ...apiTrack,
            audioUrl: fullLocalPath,
            // If local lyrics are missing, keep remote lyricsUrl for sync-scroll.
            lyricsUrl: validDownloadedTrack.lyricsUrl && hasLyrics ? lyricsUrlPath : apiTrack.lyricsUrl,
            remoteUrl: apiTrack.audioUrl,
            isLocallyDownloaded: true,
          };
        }

        // Fallback to remote API track when local file is missing or wrong length
        return {
          ...apiTrack,
          remoteUrl: apiTrack.audioUrl,
          isLocallyDownloaded: false,
        };
      })
    );

    return mergedTracks;
  };

  // Set default track based on user preferences
  const setDefaultTrack = (trackList) => {
    if (!trackList || trackList.length === 0) {
      return;
    }

    // Determine which artistID to prefer:
    //  1. Saved user preference (defaultAudio) — primary source
    //  2. Currently playing track — used when baniLength changes while audio
    //     is active; ensures currentPlaying gets the new-length URL instantly
    const preferredArtistId =
      defaultAudio[baniID]?.artistID != null
        ? defaultAudio[baniID].artistID.toString()
        : currentPlaying?.artistID != null
        ? currentPlaying.artistID.toString()
        : null;

    if (preferredArtistId) {
      const defaultTrack = trackList.find(
        (track) => track.artistID.toString() === preferredArtistId
      );
      if (defaultTrack && defaultTrack.audioUrl) {
        setCurrentPlaying(defaultTrack);
      }
    }
  };

  const fetchAudioManifest = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setManifestError(null);

      // Use the session cache when available — avoids a round-trip every time the
      // user navigates back to the same bani. The downloaded-tracks merge still
      // runs fresh each time so local file changes are always reflected.
      let manifest;
      // Cache is keyed by baniID+baniLength so a length change always triggers
      // a fresh fetch (different track/lyrics URLs may be needed).
      const cacheKey = `${baniID}:${baniLength}`;
      const cachedManifest = _manifestApiCache.get(cacheKey);
      const hasNonEmptyCachedData =
        cachedManifest && Array.isArray(cachedManifest.data) && cachedManifest.data.length > 0;

      if (!forceRefresh && hasNonEmptyCachedData) {
        manifest = cachedManifest;
      } else {
        manifest = await fetchManifest(baniID);
        if (manifest && Array.isArray(manifest.data) && manifest.data.length > 0) {
          _manifestApiCache.set(cacheKey, manifest);
        }
      }

      // Map API data to tracks
      let mappedData;
      const emergencyManifest = getEmergencyManifest();

      if (BANI_IDS_WITH_LENGTH_VARIANTS.has(Number(baniID))) {
        // For length-variant banis (e.g. Chaupai Sahib), the emergency manifest
        // holds the authoritative, length-correct URLs. Use it directly.
        // We still map API data first (if available) for metadata consistency,
        // but always override track_url and lyrics_url from the emergency manifest.
        mappedData = mapApiDataToTracks(emergencyManifest);
      } else {
        mappedData = mapApiDataToTracks(manifest);
        if (!mappedData || mappedData.length === 0) {
          mappedData = mapApiDataToTracks(emergencyManifest);
        }
      }
      // Get downloaded tracks from Redux
      const downloadedTracks = audioManifest[baniID];
      // Merge downloaded tracks with API tracks if available
      if (downloadedTracks && downloadedTracks.length > 0) {
        const mappedDataLength = mappedData ? mappedData.length : 0;
        const isExplicitlyEmpty = BANI_IDS_WITH_LENGTH_VARIANTS.has(Number(baniID)) && mappedDataLength === 0;
        if (!isExplicitlyEmpty) {
          mappedData = await mergeDownloadedTracks(mappedData || [], downloadedTracks);
        }
      }
      // Set tracks and default playing track
      if (mappedData && mappedData.length > 0) {
        setTracks(mappedData);
        setDefaultTrack(mappedData);
        setManifestError(null);
      } else {
        setTracks([]);
      }
    } catch (error) {
      logError("Error fetching manifest:", error);
      setManifestError(error?.message || STRINGS.NETWORK_ERROR || STRINGS.PLEASE_TRY_AGAIN);
    } finally {
      setIsLoading(false);
    }
  };

  const addTrackToManifest = (track, localPath, jsonPath) => {
    const trackData = {
      id: track.id,
      track_id: track.track_id,
      artistID: track.artistID,
      audioUrl: localPath,
      displayName: track.displayName,
      trackLengthSec: track.trackLengthSec,
      trackSizeMB: track.trackSizeMB,
      lyricsUrl: jsonPath,
      remoteUrl: track.remoteUrl,
    };

    const existingTracks = audioManifest[baniID] || [];
    const trackExists = existingTracks.some(
      (existingTrack) => String(existingTrack.id) === String(trackData.id)
    );

    if (!trackExists) {
      dispatch(actions.setAudioManifest(baniID, [...existingTracks, trackData]));
    }
  };

  const isTrackDownloaded = (trackId) => {
    try {
      const existingTracks = audioManifest[baniID] || [];
      const track = existingTracks.find((t) => String(t.id) === String(trackId));

      if (!track) {
        return false;
      }

      // Check if audio is downloaded (not a remote URL)
      const isAudioDownloaded =
        track.audioUrl &&
        !track.audioUrl.startsWith("http://") &&
        !track.audioUrl.startsWith("https://");

      // Check if lyrics are downloaded (lyricsUrl exists and is not a remote URL)
      // Note: lyricsUrl can be null if lyrics aren't available remotely, which is acceptable
      const isLyricsDownloaded =
        track.lyricsUrl &&
        !track.lyricsUrl.startsWith("http://") &&
        !track.lyricsUrl.startsWith("https://");

      // Track is considered downloaded if:
      // 1. Audio is downloaded AND
      // 2. (Lyrics are downloaded OR lyrics aren't available/needed)
      return isAudioDownloaded && (isLyricsDownloaded || !track.lyricsUrl);
    } catch (error) {
      return false;
    }
  };

  useEffect(() => {
    if (baniID && isRehydrated) {
      fetchAudioManifest();
    }
  }, [baniID, isRehydrated, baniLength]);

  const isAudioUnavailableForCurrentLengthOnly =
    BANI_IDS_WITH_LENGTH_VARIANTS.has(Number(baniID)) && tracks.length === 0;

  return {
    tracks,
    currentPlaying,
    setCurrentPlaying,
    isTracksLoading,
    addTrackToManifest,
    isTrackDownloaded,
    manifestError,
    isAudioUnavailableForCurrentLengthOnly,
    refetchManifest: () => fetchAudioManifest(true),
  };
};

export default useAudioManifest;
