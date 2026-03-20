import { constant, showErrorToast, STRINGS } from "@common";

const SAVIYE_BANI_ID = 6;
const SAVIYE_JARNAIL_TRACK_URL =
  "https://banidb.blob.core.windows.net/audios/BhaiJarnailSingh/saviye.mp3";
const SAVIYE_PRIMARY_TRACK = {
  bani_id: SAVIYE_BANI_ID,
  track_id: 6001,
  track_url: SAVIYE_JARNAIL_TRACK_URL,
  track_length_seconds: 1709,
  track_size_mb: 27.5,
  artist_name: "Bhai Jarnail Singh Ji",
  artist_id: 4,
};
const SAVIYE_FALLBACK_MANIFEST = {
  status: "success",
  data: [SAVIYE_PRIMARY_TRACK],
};

const JARNAIL_ARTIST_ID = 4;
const INDERMOHAN_ARTIST_ID = 8;
const INDERMOHAN_ARTIST_NAME = "Indermohan Kaur UK";
const ALLOWED_ARTIST_NAME_KEYWORDS = ["jarnail", "indermohan"];
const ALLOWED_ARTIST_URL_KEYWORDS = ["bhaijarnailsingh", "indermohankauruk"];
const INDERMOHAN_LYRICS_URL_BY_TRACK_URL = {
  "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/JapjiSahib.mp3":
    "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/JapjiSahib.json",
  "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/AnandSahib.mp3":
    "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/AnandSahib.json",
  "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/ChaupaiSahib.mp3":
    "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/ChaupaiSahib.json",
  "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/JaapSahib.mp3":
    "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/JaapSahib.json",
  "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/TavParsadSwayiye.mp3":
    "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/TavParsadSwayiye.json",
};

const INDERMOHAN_TRACKS_BY_BANI = {
  2: [
    {
      bani_id: 2,
      track_id: 2002,
      track_url: "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/JapjiSahib.mp3",
      track_length_seconds: 0,
      track_size_mb: 44.11,
      artist_name: INDERMOHAN_ARTIST_NAME,
      artist_id: INDERMOHAN_ARTIST_ID,
      lyrics_url: "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/JapjiSahib.json",
    },
  ],
  4: [
    {
      bani_id: 4,
      track_id: 2004,
      track_url: "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/JaapSahib.mp3",
      track_length_seconds: 0,
      track_size_mb: 44.61,
      artist_name: INDERMOHAN_ARTIST_NAME,
      artist_id: INDERMOHAN_ARTIST_ID,
      lyrics_url: "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/JaapSahib.json",
    },
  ],
  6: [
    {
      bani_id: 6,
      track_id: 2006,
      track_url:
        "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/TavParsadSwayiye.mp3",
      track_length_seconds: 0,
      track_size_mb: 8.69,
      artist_name: INDERMOHAN_ARTIST_NAME,
      artist_id: INDERMOHAN_ARTIST_ID,
      lyrics_url:
        "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/TavParsadSwayiye.json",
    },
  ],
  9: [
    {
      bani_id: 9,
      track_id: 2009,
      track_url:
        "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/ChaupaiSahib.mp3",
      track_length_seconds: 0,
      track_size_mb: 10.24,
      artist_name: INDERMOHAN_ARTIST_NAME,
      artist_id: INDERMOHAN_ARTIST_ID,
      lyrics_url:
        "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/ChaupaiSahib.json",
    },
  ],
  10: [
    {
      bani_id: 10,
      track_id: 2010,
      track_url: "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/AnandSahib.mp3",
      track_length_seconds: 0,
      track_size_mb: 33.14,
      artist_name: INDERMOHAN_ARTIST_NAME,
      artist_id: INDERMOHAN_ARTIST_ID,
      lyrics_url: "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/AnandSahib.json",
    },
  ],
};

const normalize = (value) => (value || "").toString().trim().toLowerCase();

const isAllowedArtist = ({ artistId, artistName, trackUrl }) => {
  const normalizedArtistName = normalize(artistName);
  const normalizedTrackUrl = normalize(trackUrl);
  const numericArtistId = Number(artistId);

  if (numericArtistId === JARNAIL_ARTIST_ID) {
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

const attachLyricsUrlIfAvailable = (track) => {
  const normalizedTrackUrl = normalize(track?.track_url);

  if (normalizedTrackUrl.includes("indermohankauruk")) {
    const mappedLyricsUrl = INDERMOHAN_LYRICS_URL_BY_TRACK_URL[track.track_url];
    const fallbackLyricsUrl =
      track?.track_url && /\.mp3$/i.test(track.track_url)
        ? track.track_url.replace(/\.mp3$/i, ".json")
        : null;

    return {
      ...track,
      // Prefer explicit map, otherwise infer mp3->json so newly uploaded matching
      // JSON files become sync-scroll ready without another app patch.
      lyrics_url: mappedLyricsUrl || track?.lyrics_url || fallbackLyricsUrl,
    };
  }

  return track;
};

const mergeIndermohanTracksForBani = (baniId, tracks) => {
  const extras = INDERMOHAN_TRACKS_BY_BANI[Number(baniId)] || [];

  if (!extras.length) {
    return tracks;
  }

  const existingTrackUrls = new Set(tracks.map((track) => normalize(track?.track_url)));
  const missingExtras = extras.filter(
    (track) => !existingTrackUrls.has(normalize(track?.track_url))
  );

  return [...tracks, ...missingExtras];
};

const getInjectedManifestForBani = (baniId) => {
  const extras = (INDERMOHAN_TRACKS_BY_BANI[Number(baniId)] || []).map(attachLyricsUrlIfAvailable);

  if (!extras.length) {
    return null;
  }

  return {
    status: "success",
    data: extras,
  };
};

const applyManifestOverrides = (baniId, data) => {
  if (!data?.data || !Array.isArray(data.data)) {
    return data;
  }

  let nextTracks = data.data;

  if (Number(baniId) === SAVIYE_BANI_ID) {
    const restTracks = nextTracks
      .map((track) => {
        const artistName = normalize(track?.artist_name);
        const trackUrl = normalize(track?.track_url);
        const isJarnailTrack =
          track?.artist_id === 4 ||
          artistName.includes("jarnail") ||
          trackUrl.includes("bhaijarnailsingh");

        if (isJarnailTrack) {
          return {
            ...track,
            track_url: SAVIYE_JARNAIL_TRACK_URL,
          };
        }
        return track;
      })
      .filter((track) => normalize(track?.track_url) !== normalize(SAVIYE_JARNAIL_TRACK_URL));

    // Keep your provided URL as the primary source for bani 6.
    nextTracks = [SAVIYE_PRIMARY_TRACK, ...restTracks];
  }

  nextTracks = nextTracks
    .filter((track) =>
      isAllowedArtist({
        artistId: track?.artist_id,
        artistName: track?.artist_name,
        trackUrl: track?.track_url,
      })
    )
    .map(attachLyricsUrlIfAvailable);

  nextTracks = mergeIndermohanTracksForBani(baniId, nextTracks).map(attachLyricsUrlIfAvailable);

  return {
    ...data,
    data: nextTracks,
  };
};

// Common API configuration
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

// Generic API request function with real AbortController timeout
// Note: the `timeout` key in fetch options is NOT a valid Web API parameter — it does nothing.
// We use AbortController to enforce a real 15-second ceiling.
const makeApiRequest = async (endpoint, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout
  try {
    const config = getApiConfig();
    const fullUrl = `${config.baseUrl}${endpoint}`;

    const response = await fetch(fullUrl, {
      method: "GET",
      headers: config.headers,
      signal: controller.signal,
      ...options,
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // AbortError means we timed out; other errors are network failures
    showErrorToast(STRINGS.NETWORK_ERROR);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

// Artist data mapper
const mapArtistData = (artist) => ({
  key: artist.artist_id.toString(),
  title: artist.display_name,
  artist_id: artist.artist_id,
  display_name: artist.display_name,
  description: artist.description,
});

export const fetchManifest = async (baniId) => {
  const data = await makeApiRequest(`/banis/${baniId}`);

  if (!data?.data?.length) {
    if (Number(baniId) === SAVIYE_BANI_ID) {
      const fallbackData = applyManifestOverrides(baniId, SAVIYE_FALLBACK_MANIFEST);
      return fallbackData?.data?.length ? fallbackData : null;
    }

    const injectedManifest = getInjectedManifestForBani(baniId);
    if (injectedManifest?.data?.length) {
      return injectedManifest;
    }

    return null;
  }

  const filteredData = applyManifestOverrides(baniId, data);

  if (!filteredData?.data?.length) {
    return null;
  }

  return filteredData;
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

    return allowedArtists;
  }
  showErrorToast(STRINGS.COULD_NOT_LOAD_AUDIO_ARTISTS);
  return null;
};
