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
const SAVIYE_JARNAIL_TRACK_URL = `${BLOB_BASE}/BhaiJarnailSingh/Saviye.m4a`;
const SAVIYE_PRIMARY_TRACK = {
  bani_id: SAVIYE_BANI_ID,
  track_id: 6001,
  track_url: SAVIYE_JARNAIL_TRACK_URL,
  track_length_seconds: 207,
  track_size_mb: 3.23,
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
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/JapjiSahib.m4a`,
      track_length_seconds: 981,
      track_size_mb: 15.23,
      artist_name: "Bhai Jarnail Singh Ji",
      artist_id: JARNAIL_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/japji-sahib.json`,
    },
  ],
  4: [
    {
      bani_id: 4,
      track_id: 1004,
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/JaapSahib.m4a`,
      track_length_seconds: 987,
      track_size_mb: 15.36,
      artist_name: "Bhai Jarnail Singh Ji",
      artist_id: JARNAIL_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/jaap-sahib.json`,
    },
  ],
  6: [
    {
      bani_id: 6,
      track_id: 1006,
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/Saviye.m4a`,
      track_length_seconds: 207,
      track_size_mb: 3.23,
      artist_name: "Bhai Jarnail Singh Ji",
      artist_id: JARNAIL_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/saviye.json`,
    },
  ],
  9: [
    {
      bani_id: 9,
      track_id: 1009,
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/ChaupaiSahib.m4a`,
      track_length_seconds: 317,
      track_size_mb: 4.95,
      artist_name: "Bhai Jarnail Singh Ji",
      artist_id: JARNAIL_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/chopai-sahib.json`,
    },
  ],
  10: [
    {
      bani_id: 10,
      track_id: 1010,
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/AnandSahib.m4a`,
      track_length_seconds: 784,
      track_size_mb: 12.18,
      artist_name: "Bhai Jarnail Singh Ji",
      artist_id: JARNAIL_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/anand-sahib.json`,
    },
  ],
  21: [
    {
      bani_id: 21,
      track_id: 1021,
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/RehrasSahib.m4a`,
      track_length_seconds: 1335,
      track_size_mb: 20.49,
      artist_name: "Bhai Jarnail Singh Ji",
      artist_id: JARNAIL_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/Rehras-sahib.json`,
    },
  ],
  23: [
    {
      bani_id: 23,
      track_id: 1023,
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/KirtanSohaila.m4a`,
      track_length_seconds: 333,
      track_size_mb: 5.03,
      artist_name: "Bhai Jarnail Singh Ji",
      artist_id: JARNAIL_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/kirtan-sohaila.json`,
    },
  ],
};

// ─── Complete Indermohan Kaur UK track map ────────────────────────────────────
// All files confirmed present in Azure Blob (M4A + JSON).
// track_ids in the 2xxx range.
const INDERMOHAN_TRACKS_BY_BANI = {
  2: [
    {
      bani_id: 2,
      track_id: 2002,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/JapjiSahib.m4a`,
      track_length_seconds: 1156,
      track_size_mb: 17.94,
      artist_name: INDERMOHAN_ARTIST_NAME,
      artist_id: INDERMOHAN_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/IndermohanKaurUK/JapjiSahib.json`,
    },
  ],
  4: [
    {
      bani_id: 4,
      track_id: 2004,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/JaapSahib.m4a`,
      track_length_seconds: 1170,
      track_size_mb: 18.18,
      artist_name: INDERMOHAN_ARTIST_NAME,
      artist_id: INDERMOHAN_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/IndermohanKaurUK/JaapSahib.json`,
    },
  ],
  6: [
    {
      bani_id: 6,
      track_id: 2006,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/TavParsadSwayiye.m4a`,
      track_length_seconds: 227,
      track_size_mb: 3.52,
      artist_name: INDERMOHAN_ARTIST_NAME,
      artist_id: INDERMOHAN_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/IndermohanKaurUK/TavParsadSwayiye.json`,
    },
  ],
  9: [
    {
      bani_id: 9,
      track_id: 2009,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/ChaupaiSahib.m4a`,
      track_length_seconds: 268,
      track_size_mb: 4.17,
      artist_name: INDERMOHAN_ARTIST_NAME,
      artist_id: INDERMOHAN_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/IndermohanKaurUK/ChaupaiSahib.json`,
    },
  ],
  10: [
    {
      bani_id: 10,
      track_id: 2010,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/AnandSahib.m4a`,
      track_length_seconds: 869,
      track_size_mb: 13.48,
      artist_name: INDERMOHAN_ARTIST_NAME,
      artist_id: INDERMOHAN_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/IndermohanKaurUK/AnandSahib.json`,
    },
  ],
  21: [
    {
      bani_id: 21,
      track_id: 2021,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/RehrasSahib.m4a`,
      track_length_seconds: 1145,
      track_size_mb: 17.80,
      artist_name: INDERMOHAN_ARTIST_NAME,
      artist_id: INDERMOHAN_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/IndermohanKaurUK/RehrasSahib.json`,
    },
  ],
  23: [
    {
      bani_id: 23,
      track_id: 2023,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/KirtanSohaila.m4a`,
      track_length_seconds: 239,
      track_size_mb: 3.71,
      artist_name: INDERMOHAN_ARTIST_NAME,
      artist_id: INDERMOHAN_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/IndermohanKaurUK/KirtanSohaila.json`,
    },
  ],
};

// ─── Giani Gurdev Singh track map ────────────────────────────────────────────
// All files confirmed present in Azure Blob (M4A + JSON).
// track_ids in the 3xxx range.
const GURDEV_TRACKS_BY_BANI = {
  2: [
    {
      bani_id: 2,
      track_id: 3002,
      track_url: `${BLOB_BASE}/GianiGurdevSingh/JapjiSahib.m4a`,
      track_length_seconds: 1257,
      track_size_mb: 19.69,
      artist_name: GURDEV_ARTIST_NAME,
      artist_id: GURDEV_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/GianiGurdevSingh/JapjiSahib.json`,
    },
  ],
  4: [
    {
      bani_id: 4,
      track_id: 3004,
      track_url: `${BLOB_BASE}/GianiGurdevSingh/JaapSahib.m4a`,
      track_length_seconds: 1281,
      track_size_mb: 20.06,
      artist_name: GURDEV_ARTIST_NAME,
      artist_id: GURDEV_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/GianiGurdevSingh/JaapSahib.json`,
    },
  ],
  6: [
    {
      bani_id: 6,
      track_id: 3006,
      track_url: `${BLOB_BASE}/GianiGurdevSingh/TavParsadSwayiye.m4a`,
      track_length_seconds: 237,
      track_size_mb: 3.71,
      artist_name: GURDEV_ARTIST_NAME,
      artist_id: GURDEV_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/GianiGurdevSingh/TavParsadSwayiye.json`,
    },
  ],
  9: [
    {
      bani_id: 9,
      track_id: 3009,
      track_url: `${BLOB_BASE}/GianiGurdevSingh/ChaupaiSahib.m4a`,
      track_length_seconds: 378,
      track_size_mb: 5.90,
      artist_name: GURDEV_ARTIST_NAME,
      artist_id: GURDEV_ARTIST_ID,
      lyrics_url: `${BLOB_BASE}/GianiGurdevSingh/ChaupaiSahib.json`,
    },
  ],
  10: [
    {
      bani_id: 10,
      track_id: 3010,
      track_url: `${BLOB_BASE}/GianiGurdevSingh/AnandSahib.m4a`,
      track_length_seconds: 994,
      track_size_mb: 15.52,
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
 * Priority: explicit map entry → existing field → audio-ext→json inference.
 */
const attachLyricsUrlIfAvailable = (track) => {
  if (!track?.track_url) return track;

  // For tracks that already have lyrics_url set (all our static maps have it),
  // just return as-is.
  if (track.lyrics_url) return track;

  // Fallback: infer lyrics URL from .m4a audio URL
  const fallbackLyricsUrl = /\.m4a$/i.test(track.track_url)
    ? track.track_url.replace(/\.m4a$/i, ".json")
    : null;

  return { ...track, lyrics_url: fallbackLyricsUrl };
};

/**
 * Merge a static per-bani track list into an existing tracks array.
 * For artists we have static data for, our static tracks REPLACE any API tracks
 * (the API may still return stale MP3 URLs that no longer exist on the blob).
 * Tracks for artists NOT in the static map are kept as-is from the API.
 */
const mergeStaticTracksForBani = (baniId, tracks, staticMap) => {
  const extras = staticMap[Number(baniId)] || [];
  if (!extras.length) return tracks;

  // Collect artist_ids covered by this static map for this bani
  const staticArtistIds = new Set(extras.map((t) => Number(t.artist_id)));

  // Drop any API tracks whose artist is covered by our static map —
  // our static data has the correct M4A URLs and sizes.
  const filtered = tracks.filter((t) => !staticArtistIds.has(Number(t?.artist_id)));

  return [...filtered, ...extras];
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

  // ── Filter to allowed artists only and enforce M4A extension ────────────
  nextTracks = nextTracks
    .filter((track) =>
      isAllowedArtist({
        artistId: track?.artist_id,
        artistName: track?.artist_name,
        trackUrl: track?.track_url,
      })
    )
    .map((track) => {
      // Force all API tracks to .m4a since we deleted MP3s from the Azure Blob.
      // Fixes streaming 404s for tracks that aren't in our static maps.
      if (track?.track_url) {
        return { ...track, track_url: track.track_url.replace(/\.mp3$/i, ".m4a") };
      }
      return track;
    })
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
