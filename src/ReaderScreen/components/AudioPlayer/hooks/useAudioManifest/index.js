import { useState, useEffect } from "react";
import { DocumentDirectoryPath, exists } from "react-native-fs";
import { useSelector, useDispatch } from "react-redux";
import { actions, logError, STRINGS } from "@common";
import { fetchManifest } from "@service";

const ALLOWED_ARTIST_IDS = [4];
const ALLOWED_ARTIST_NAME_KEYWORDS = ["jarnail", "indermohan"];
const ALLOWED_ARTIST_URL_KEYWORDS = ["bhaijarnailsingh", "indermohankauruk"];
const EMERGENCY_MANIFEST_BY_BANI = {
  9: {
    status: "success",
    data: [
      {
        bani_id: 9,
        track_id: 2009,
        track_url: "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/ChaupaiSahib.mp3",
        track_length_seconds: 0,
        track_size_mb: 10.24,
        artist_name: "Indermohan Kaur UK",
        artist_id: 8,
        lyrics_url: "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/ChaupaiSahib.json",
      },
    ],
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

const useAudioManifest = (baniID) => {
  const [tracks, setTracks] = useState([]);
  const [currentPlaying, setCurrentPlaying] = useState(null);
  const [isTracksLoading, setIsLoading] = useState(false);
  const [manifestError, setManifestError] = useState(null);
  const defaultAudio = useSelector((state) => state.defaultAudio);

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
            ? item.track_url.replace(".mp3", ".json")
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

  const getEmergencyManifest = () => EMERGENCY_MANIFEST_BY_BANI[Number(baniID)] || null;

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
        const fullLocalPath = downloadedTrack
          ? `${DocumentDirectoryPath}/audio/${downloadedTrack.audioUrl}`
          : null;
        const lyricsUrlPath =
          downloadedTrack && downloadedTrack.lyricsUrl
            ? `${DocumentDirectoryPath}/audio/${downloadedTrack.lyricsUrl}`
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

        if (downloadedTrack && hasAudio) {
          return {
            ...apiTrack,
            audioUrl: fullLocalPath,
            // If local lyrics are missing, keep remote lyricsUrl for sync-scroll.
            lyricsUrl: downloadedTrack.lyricsUrl && hasLyrics ? lyricsUrlPath : apiTrack.lyricsUrl,
            remoteUrl: apiTrack.audioUrl,
            isLocallyDownloaded: true,
          };
        }

        // Fallback to remote API track when local file is missing
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

    // Check if user has a preferred audio for this bani
    if (defaultAudio[baniID]) {
      // Find track with matching artist ID
      const defaultTrack = trackList.find(
        (track) => track.artistID.toString() === defaultAudio[baniID].artistID.toString()
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
      const cachedManifest = _manifestApiCache.get(baniID);
      const hasNonEmptyCachedData =
        cachedManifest && Array.isArray(cachedManifest.data) && cachedManifest.data.length > 0;

      if (!forceRefresh && hasNonEmptyCachedData) {
        manifest = cachedManifest;
      } else {
        manifest = await fetchManifest(baniID);
        if (manifest && Array.isArray(manifest.data) && manifest.data.length > 0) {
          _manifestApiCache.set(baniID, manifest);
        }
      }

      // Map API data to tracks
      let mappedData = mapApiDataToTracks(manifest);
      if (!mappedData || mappedData.length === 0) {
        mappedData = mapApiDataToTracks(getEmergencyManifest());
      }
      // Get downloaded tracks from Redux
      const downloadedTracks = audioManifest[baniID];
      // Merge downloaded tracks with API tracks if available
      if (downloadedTracks && downloadedTracks.length > 0) {
        mappedData = await mergeDownloadedTracks(mappedData, downloadedTracks);
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
  }, [baniID, isRehydrated]);

  return {
    tracks,
    currentPlaying,
    setCurrentPlaying,
    isTracksLoading,
    addTrackToManifest,
    isTrackDownloaded,
    manifestError,
    refetchManifest: () => fetchAudioManifest(true),
  };
};

export default useAudioManifest;
