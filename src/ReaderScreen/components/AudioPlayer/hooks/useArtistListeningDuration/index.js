import { useEffect, useRef } from "react";
import { useNavigation } from "@react-navigation/native";
import { trackBaniListen } from "@common";

/**
 * Tracks actual listening time per artist using wall-clock timestamps.
 * Independent of seeking — only counts time the audio was genuinely playing.
 *
 * @param {string|number} baniID
 * @param {string} baniTitle
 * @param {boolean} isPlaying
 * @param {Object} currentPlaying - track object with displayName, id, trackLengthSec
 */
const useArtistListeningDuration = (baniID, baniTitle, isPlaying, currentPlaying) => {
  const navigation = useNavigation();
  const trackedArtistRef = useRef(null);
  const trackedTrackIdRef = useRef(null);
  const playStartTimeRef = useRef(null);

  const currentArtist = currentPlaying?.displayName;
  const currentTrackId = currentPlaying?.id;
  const currentTrackLengthSec = currentPlaying?.trackLengthSec;

  const trackDuration = async () => {
    if (trackedArtistRef.current && playStartTimeRef.current) {
      // Clear refs synchronously before the async call so concurrent callers
      // (blur listener + isPlaying→false effect) can't both pass this guard.
      const startTime = playStartTimeRef.current;
      const artist = trackedArtistRef.current;
      playStartTimeRef.current = null;
      trackedArtistRef.current = null;
      trackedTrackIdRef.current = null;
      const finalDuration = Math.floor((Date.now() - startTime) / 1000);
      if (finalDuration > 0) {
        try {
          await trackBaniListen(baniID, baniTitle, artist, finalDuration, currentTrackLengthSec);
        } catch (_) {
          // Silently fail — analytics must never crash the app
        }
      }
    }
  };

  useEffect(() => {
    // If artist or track changed, flush the previous session
    if (
      trackedArtistRef.current &&
      playStartTimeRef.current &&
      (trackedArtistRef.current !== currentArtist || trackedTrackIdRef.current !== currentTrackId)
    ) {
      (async () => {
        await trackDuration();
      })();
    }

    // Start tracking when playback begins for a new artist/track
    if (currentArtist && currentTrackId && isPlaying) {
      if (
        trackedArtistRef.current !== currentArtist ||
        trackedTrackIdRef.current !== currentTrackId
      ) {
        trackedArtistRef.current = currentArtist;
        trackedTrackIdRef.current = currentTrackId;
        playStartTimeRef.current = Date.now();
      }
    }

    // Flush when playback stops
    if (!isPlaying && trackedArtistRef.current && playStartTimeRef.current) {
      (async () => {
        await trackDuration();
      })();
    }
  }, [isPlaying, currentArtist, currentTrackId, baniID]);

  // Flush when user navigates away
  useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
      if (trackedArtistRef.current && playStartTimeRef.current) {
        (async () => {
          await trackDuration();
        })();
      }
    });
    return unsubscribe;
  }, [navigation]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (trackedArtistRef.current && playStartTimeRef.current) {
        (async () => {
          await trackDuration();
        })();
      }
    };
  }, []);
};

export default useArtistListeningDuration;
