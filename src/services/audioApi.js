import { constant, showErrorToast, STRINGS } from "@common";

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
    return null;
  }
  return data;
};

export const fetchArtists = async () => {
  const data = await makeApiRequest("/artists");

  if (data?.status === "success" && data.data) {
    return data.data.map(mapArtistData);
  }
  showErrorToast(STRINGS.COULD_NOT_LOAD_AUDIO_ARTISTS);
  return null;
};
