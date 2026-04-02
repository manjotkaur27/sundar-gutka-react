import { constant, showErrorToast, STRINGS } from "@common";

// ─── Base URL ────────────────────────────────────────────────────────────────
const BLOB_BASE = "https://banidb.blob.core.windows.net/audios";

// ─── Artist IDs ──────────────────────────────────────────────────────────────
const JARNAIL_ARTIST_ID = 4;
const INDERMOHAN_ARTIST_ID = 8;
const GURDEV_ARTIST_ID = 9;

const INDERMOHAN_ARTIST_NAME = "Indermohan Kaur UK";
const GURDEV_ARTIST_NAME = "Giani Gurdev Singh";

// Keywords used by the filter gate
const ALLOWED_ARTIST_NAME_KEYWORDS = ["jarnail", "indermohan", "gurdev"];
const ALLOWED_ARTIST_URL_KEYWORDS = [
  "bhaijarnailsingh",
  "indermohankauruk",
  "gianigurdevsingh",
];

// ─── Saviye (bani 6) Jarnail track override ──────────────────────────────────
const SAVIYE_BANI_ID = 6;
const SAVIYE_JARNAIL_TRACK_URL = `${BLOB_BASE}/BhaiJarnailSingh/saviye.mp3`;
const SAVIYE_PRIMARY_TRACK = {
  bani_id: SAVIYE_BANI_ID,
  track_id: 6001,
  track_url: SAVIYE_JARNAIL_TRACK_URL,
  track_length_seconds: 0,
  track_size_mb: 4.08,
  artist_name: "Bhai Jarnail Singh Ji",
  artist_id: JARNAIL_ARTIST_ID,
  lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/saviye.json`,
};
const SAVIYE_FALLBACK_MANIFEST = {
  status: "success",
  data: [SAVIYE_PRIMARY_TRACK],
};

// ─── Complete Jarnail Singh track map (bani_id → track) ──────────────────────
// All files confirmed present in Azure Blob (GET.txt).
// track_ids in the 1xxx range to avoid collisions.
const JARNAIL_TRACKS_BY_BANI = {
  2: [
    {
      bani_id: 2,
      track_id: 1002,
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/japji-sahib.mp3`,
      track_length_seconds: 0,
      track_size_mb: 18.61,
      artist_name: "Bhai Jarnail Singh Ji",
      artist_id: JARNAIL_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/japji-sahib.json`,
    },
  ],
  4: [
    {
      bani_id: 4,
      track_id: 1004,
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/jaap-sahib.mp3`,
      track_length_seconds: 0,
      track_size_mb: 19.91,
      artist_name: "Bhai Jarnail Singh Ji",
      artist_id: JARNAIL_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/jaap-sahib.json`,
    },
  ],
  6: [
    {
      bani_id: 6,
      track_id: 1006,
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/saviye.mp3`,
      track_length_seconds: 0,
      track_size_mb: 4.08,
      artist_name: "Bhai Jarnail Singh Ji",
      artist_id: JARNAIL_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/saviye.json`,
    },
  ],
  9: [
    {
      bani_id: 9,
      track_id: 1009,
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/chopai-sahib.mp3`,
      track_length_seconds: 0,
      track_size_mb: 6.22,
      artist_name: "Bhai Jarnail Singh Ji",
      artist_id: JARNAIL_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/chopai-sahib.json`,
    },
  ],
  10: [
    {
      bani_id: 10,
      track_id: 1010,
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/anand-sahib.mp3`,
      track_length_seconds: 0,
      track_size_mb: 15.71,
      artist_name: "Bhai Jarnail Singh Ji",
      artist_id: JARNAIL_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/anand-sahib.json`,
    },
  ],
  21: [
    {
      bani_id: 21,
      track_id: 1021,
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/Rehras-sahib.mp3`,
      track_length_seconds: 0,
      track_size_mb: 11.28,
      artist_name: "Bhai Jarnail Singh Ji",
      artist_id: JARNAIL_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/Rehras-sahib.json`,
    },
  ],
  23: [
    {
      bani_id: 23,
      track_id: 1023,
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/kirtan-sohaila.mp3`,
      track_length_seconds: 0,
      track_size_mb: 2.76,
      artist_name: "Bhai Jarnail Singh Ji",
      artist_id: JARNAIL_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/kirtan-sohaila.json`,
    },
  ],
};

// ─── Complete Indermohan Kaur UK track map ────────────────────────────────────
// All files confirmed present in Azure Blob (GET.txt).
// track_ids in the 2xxx range.
const INDERMOHAN_TRACKS_BY_BANI = {
  2: [
    {
      bani_id: 2,
      track_id: 2002,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/JapjiSahib.mp3`,
      track_length_seconds: 0,
      track_size_mb: 44.11,
      artist_name: INDERMOHAN_ARTIST_NAME,
      artist_id: INDERMOHAN_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/IndermohanKaurUK/JapjiSahib.json`,
    },
  ],
  4: [
    {
      bani_id: 4,
      track_id: 2004,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/JaapSahib.mp3`,
      track_length_seconds: 0,
      track_size_mb: 44.61,
      artist_name: INDERMOHAN_ARTIST_NAME,
      artist_id: INDERMOHAN_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/IndermohanKaurUK/JaapSahib.json`,
    },
  ],
  6: [
    {
      bani_id: 6,
      track_id: 2006,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/TavParsadSwayiye.mp3`,
      track_length_seconds: 0,
      track_size_mb: 8.69,
      artist_name: INDERMOHAN_ARTIST_NAME,
      artist_id: INDERMOHAN_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/IndermohanKaurUK/TavParsadSwayiye.json`,
    },
  ],
  9: [
    {
      bani_id: 9,
      track_id: 2009,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/ChaupaiSahib.mp3`,
      track_length_seconds: 0,
      track_size_mb: 10.24,
      artist_name: INDERMOHAN_ARTIST_NAME,
      artist_id: INDERMOHAN_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/IndermohanKaurUK/ChaupaiSahib.json`,
    },
  ],
  10: [
    {
      bani_id: 10,
      track_id: 2010,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/AnandSahib.mp3`,
      track_length_seconds: 0,
      track_size_mb: 33.14,
      artist_name: INDERMOHAN_ARTIST_NAME,
      artist_id: INDERMOHAN_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/IndermohanKaurUK/AnandSahib.json`,
    },
  ],
  21: [
    {
      bani_id: 21,
      track_id: 2021,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/RehrasSahib.mp3`,
      track_length_seconds: 0,
      track_size_mb: 43.67,
      artist_name: INDERMOHAN_ARTIST_NAME,
      artist_id: INDERMOHAN_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/IndermohanKaurUK/RehrasSahib.json`,
    },
  ],
  23: [
    {
      bani_id: 23,
      track_id: 2023,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/KirtanSohaila.mp3`,
      track_length_seconds: 0,
      track_size_mb: 9.11,
      artist_name: INDERMOHAN_ARTIST_NAME,
      artist_id: INDERMOHAN_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/IndermohanKaurUK/KirtanSohaila.json`,
    },
  ],
};

// ─── Giani Gurdev Singh track map ────────────────────────────────────────────
// All files confirmed present in Azure Blob (MP3s + JSONs).
// track_ids in the 3xxx range.
const GURDEV_TRACKS_BY_BANI = {
  2: [
    {
      bani_id: 2,
      track_id: 3002,
      track_url: `${BLOB_BASE}/GianiGurdevSingh/JapjiSahib.mp3`,
      track_length_seconds: 1257, // (~20m57s based on 20.1 MB)
      track_size_mb: 19.18,
      artist_name: GURDEV_ARTIST_NAME,
      artist_id: GURDEV_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/GianiGurdevSingh/JapjiSahib.json`,
    },
  ],
  4: [
    {
      bani_id: 4,
      track_id: 3004,
      track_url: `${BLOB_BASE}/GianiGurdevSingh/JaapSahib.mp3`,
      track_length_seconds: 1280, // (~21m20s based on 20.4 MB)
      track_size_mb: 19.54,
      artist_name: GURDEV_ARTIST_NAME,
      artist_id: GURDEV_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/GianiGurdevSingh/JaapSahib.json`,
    },
  ],
  6: [
    {
      bani_id: 6,
      track_id: 3006,
      track_url: `${BLOB_BASE}/GianiGurdevSingh/TavParsadSwayiye.mp3`,
      track_length_seconds: 237, // (~3m57s based on 3.8 MB)
      track_size_mb: 3.62,
      artist_name: GURDEV_ARTIST_NAME,
      artist_id: GURDEV_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/GianiGurdevSingh/TavParsadSwayiye.json`,
    },
  ],
  9: [
    {
      bani_id: 9,
      track_id: 3009,
      track_url: `${BLOB_BASE}/GianiGurdevSingh/ChaupaiSahib.mp3`,
      track_length_seconds: 378,
      track_size_mb: 5.77,
      artist_name: GURDEV_ARTIST_NAME,
      artist_id: GURDEV_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/GianiGurdevSingh/ChaupaiSahib.json`,
    },
  ],
  10: [
    {
      bani_id: 10,
      track_id: 3010,
      track_url: `${BLOB_BASE}/GianiGurdevSingh/AnandSahib.mp3`,
      track_length_seconds: 994,
      track_size_mb: 15.17,
      artist_name: GURDEV_ARTIST_NAME,
      artist_id: GURDEV_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/GianiGurdevSingh/AnandSahib.json`,
    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const normalize = (value) => (value || "").toString().trim().toLowerCase();

const isAllowedArtist = ({ artistId, artistName, trackUrl }) => {
  const normalizedArtistName = normalize(artistName);
  const normalizedTrackUrl = normalize(trackUrl);
  const numericArtistId = Number(artistId);

  if (
    numericArtistId === JARNAIL_ARTIST_ID ||
    numericArtistId === INDERMOHAN_ARTIST_ID ||
    numericArtistId === GURDEV_ARTIST_ID
  ) {
    return true;
  }

  const matchedByArtistName = ALLOWED_ARTIST_NAME_KEYWORDS.some((keyword) =>
    normalizedArtistName.includes(keyword)
  );
  const matchedByTrackUrl = ALLOWED_ARTIST_URL_KEYWORDS.some((keyword) =>
    normalizedTrackUrl.includes(keyword)
  );

  return matchedByArtistName || matchedByTrackUrl;
};

/**
 * Attach a lyrics_url to a track if one can be resolved.
 * Priority: explicit map entry → existing field → mp3→json inference.
 */
const attachLyricsUrlIfAvailable = (track) => {
  if (!track?.track_url) return track;

  // For tracks that already have lyrics_url set (all our static maps have it),
  // just return as-is.
  if (track.lyrics_url) return track;

  // Fallback: infer from mp3 URL
  const fallbackLyricsUrl = /\.mp3$/i.test(track.track_url)
    ? track.track_url.replace(/\.mp3$/i, ".json")
    : null;

  return { ...track, lyrics_url: fallbackLyricsUrl };
};

/**
 * Merge a static per-bani track list into an existing tracks array.
 * Tracks that are already present (by URL) are skipped to avoid duplicates.
 */
const mergeStaticTracksForBani = (baniId, tracks, staticMap) => {
  const extras = staticMap[Number(baniId)] || [];
  if (!extras.length) return tracks;

  const existingUrls = new Set(tracks.map((t) => normalize(t?.track_url)));
  const missing = extras.filter((t) => !existingUrls.has(normalize(t?.track_url)));

  return [...tracks, ...missing];
};

/**
 * Build an injected manifest for a bani from all static maps.
 * Used when the remote API returns nothing for this bani.
 */
const getInjectedManifestForBani = (baniId) => {
  const numericId = Number(baniId);
  const jarnailTracks = (JARNAIL_TRACKS_BY_BANI[numericId] || []).map(
    attachLyricsUrlIfAvailable
  );
  const indermohanTracks = (INDERMOHAN_TRACKS_BY_BANI[numericId] || []).map(
    attachLyricsUrlIfAvailable
  );
  const gurdevTracks = (GURDEV_TRACKS_BY_BANI[numericId] || []).map(
    attachLyricsUrlIfAvailable
  );

  const allTracks = [...jarnailTracks, ...indermohanTracks, ...gurdevTracks];

  if (!allTracks.length) return null;

  return { status: "success", data: allTracks };
};

const applyManifestOverrides = (baniId, data) => {
  if (!data?.data || !Array.isArray(data.data)) return data;

  let nextTracks = data.data;

  // ── Saviye (bani 6): pin Jarnail's Azure Blob URL as the primary ──────────
  if (Number(baniId) === SAVIYE_BANI_ID) {
    const restTracks = nextTracks
      .map((track) => {
        const artistName = normalize(track?.artist_name);
        const trackUrl = normalize(track?.track_url);
        const isJarnailTrack =
          track?.artist_id === JARNAIL_ARTIST_ID ||
          artistName.includes("jarnail") ||
          trackUrl.includes("bhaijarnailsingh");

        if (isJarnailTrack) {
          return { ...track, track_url: SAVIYE_JARNAIL_TRACK_URL };
        }
        return track;
      })
      .filter((track) => normalize(track?.track_url) !== normalize(SAVIYE_JARNAIL_TRACK_URL));

    nextTracks = [SAVIYE_PRIMARY_TRACK, ...restTracks];
  }

  // ── Filter to allowed artists only ───────────────────────────────────────
  nextTracks = nextTracks
    .filter((track) =>
      isAllowedArtist({
        artistId: track?.artist_id,
        artistName: track?.artist_name,
        trackUrl: track?.track_url,
      })
    )
    .map(attachLyricsUrlIfAvailable);

  // ── Merge all static track lists (ensures all 3 artists appear) ──────────
  nextTracks = mergeStaticTracksForBani(baniId, nextTracks, JARNAIL_TRACKS_BY_BANI);
  nextTracks = mergeStaticTracksForBani(baniId, nextTracks, INDERMOHAN_TRACKS_BY_BANI);
  nextTracks = mergeStaticTracksForBani(baniId, nextTracks, GURDEV_TRACKS_BY_BANI);

  // Re-attach lyrics for anything that came from the API without one
  nextTracks = nextTracks.map(attachLyricsUrlIfAvailable);

  return { ...data, data: nextTracks };
};

// ─── API plumbing ─────────────────────────────────────────────────────────────
const getApiConfig = () => {
  const { BASIC_AUTH_USERNAME, BASIC_AUTH_PASSWORD, REMOTE_AUDIO_API_URL } = constant;
  const credentials = btoa(`${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`);
  return {
    baseUrl: REMOTE_AUDIO_API_URL,
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
  };
};

const makeApiRequest = async (endpoint, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const config = getApiConfig();
    const fullUrl = `${config.baseUrl}${endpoint}`;

    const response = await fetch(fullUrl, {
      method: "GET",
      headers: config.headers,
      signal: controller.signal,
      ...options,
    });

    if (!response.ok) return null;

    const responseData = await response.json();
    return responseData;
  } catch (error) {
    showErrorToast(STRINGS.NETWORK_ERROR);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

const mapArtistData = (artist) => ({
  key: artist.artist_id.toString(),
  title: artist.display_name,
  artist_id: artist.artist_id,
  display_name: artist.display_name,
  description: artist.description,
});

// ─── Public API ───────────────────────────────────────────────────────────────

export const fetchManifest = async (baniId) => {
  const data = await makeApiRequest(`/banis/${baniId}`);

  if (!data?.data?.length) {
    // No remote data — build entirely from static maps
    if (Number(baniId) === SAVIYE_BANI_ID) {
      const fallbackData = applyManifestOverrides(baniId, SAVIYE_FALLBACK_MANIFEST);
      return fallbackData?.data?.length ? fallbackData : null;
    }

    const injectedManifest = getInjectedManifestForBani(baniId);
    if (injectedManifest?.data?.length) return injectedManifest;

    return null;
  }

  const filteredData = applyManifestOverrides(baniId, data);
  return filteredData?.data?.length ? filteredData : null;
};

export const fetchArtists = async () => {
  const data = await makeApiRequest("/artists");

  if (data?.status === "success" && data.data) {
    const allowedArtists = data.data
      .filter((artist) =>
        isAllowedArtist({
          artistId: artist?.artist_id,
          artistName: artist?.display_name,
          trackUrl: "",
        })
      )
      .map(mapArtistData);

    // Ensure Indermohan is always present
    const hasIndermohan = allowedArtists.some(
      (artist) => Number(artist.artist_id) === INDERMOHAN_ARTIST_ID
    );
    if (!hasIndermohan) {
      allowedArtists.push(
        mapArtistData({
          artist_id: INDERMOHAN_ARTIST_ID,
          display_name: INDERMOHAN_ARTIST_NAME,
          description: "",
        })
      );
    }

    // Ensure Giani Gurdev Singh is always present
    const hasGurdev = allowedArtists.some(
      (artist) => Number(artist.artist_id) === GURDEV_ARTIST_ID
    );
    if (!hasGurdev) {
      allowedArtists.push(
        mapArtistData({
          artist_id: GURDEV_ARTIST_ID,
          display_name: GURDEV_ARTIST_NAME,
          description: "",
        })
      );
    }

    return allowedArtists;
  }

  showErrorToast(STRINGS.COULD_NOT_LOAD_AUDIO_ARTISTS);
  return null;
};
