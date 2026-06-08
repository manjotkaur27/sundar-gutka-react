import { useEffect, useRef, useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import { logError, logMessage, trackAudioStarted, trackAudioCompleted } from "@common";
import { insertAudioSession, upsertDailyActivity, enqueueAnalyticsWrite } from "../../database/analytics";

const useListeningSession = ({ baniId, baniTitle, isPlaying, currentPlayingId, artistId, artistName }) => {
  const navigation = useNavigation();

  const accumulatedRef = useRef(0);
  const playStartRef = useRef(null);
  const hasTrackedStartRef = useRef(false);

  // Keep mutable refs so saveSession never needs to be recreated on track switch
  const currentPlayingIdRef = useRef(currentPlayingId);
  const artistIdRef = useRef(artistId);
  const artistNameRef = useRef(artistName);
  useEffect(() => { currentPlayingIdRef.current = currentPlayingId; }, [currentPlayingId]);
  useEffect(() => { artistIdRef.current = artistId; }, [artistId]);
  useEffect(() => { artistNameRef.current = artistName; }, [artistName]);

  // Accumulate wall-clock time while isPlaying = true; fire analytics on first play
  useEffect(() => {
    if (isPlaying) {
      if (!hasTrackedStartRef.current) {
        hasTrackedStartRef.current = true;
        logMessage(`audio_play: id=${currentPlayingIdRef.current ?? "unknown"} artist=${artistIdRef.current ?? "unknown"}`);
        trackAudioStarted(currentPlayingIdRef.current ?? null, baniTitle ?? null, artistIdRef.current ?? null).catch(() => {});
      }
      playStartRef.current = Date.now();
    } else {
      if (playStartRef.current) {
        accumulatedRef.current += (Date.now() - playStartRef.current) / 1000;
        playStartRef.current = null;
      }
    }
  }, [isPlaying]);

  // Synchronous — flushes accumulated time and queues DB work; returns instantly.
  const saveSession = useCallback(() => {
    if (playStartRef.current) {
      accumulatedRef.current += (Date.now() - playStartRef.current) / 1000;
      playStartRef.current = null;
    }
    const durationSeconds = Math.round(accumulatedRef.current);
    accumulatedRef.current = 0;

    if (durationSeconds <= 0) return;

    const today = new Date().toISOString().slice(0, 10);
    enqueueAnalyticsWrite(async () => {
      try {
        await Promise.all([
          insertAudioSession({
            audio_id: currentPlayingIdRef.current ?? null,
            bani_id: baniId,
            bani_title: baniTitle ?? null,
            artist_id: artistIdRef.current ?? null,
            artist_name: artistNameRef.current ?? null,
            duration_played: durationSeconds,
            completed: false,
          }),
          upsertDailyActivity({
            date: today,
            reading_seconds_delta: 0,
            listening_seconds_delta: durationSeconds,
          }),
        ]);
        trackAudioCompleted(durationSeconds, artistIdRef.current ?? null).catch(() => {});
      } catch (err) {
        logError(new Error(`useListeningSession save failed: ${err?.message || err}`));
      }
    });
  }, [baniId, baniTitle]);

  // Audio plays through app background — only save when leaving the screen
  useEffect(() => {
    const unsubBlur = navigation.addListener("blur", saveSession);
    return () => {
      unsubBlur();
      saveSession();
    };
  }, [navigation, saveSession]);
};

export default useListeningSession;
