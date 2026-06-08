import { useEffect, useRef, useCallback } from "react";
import { AppState } from "react-native";
import { logError, trackBaniCompleted } from "@common";
import {
  insertReadSession,
  upsertDailyActivity,
  incrementBaniReadCount,
  enqueueAnalyticsWrite,
} from "../../database/analytics";

const useReadingSession = ({ baniId, baniTitle, navigation }) => {
  const startTimeRef = useRef(null);

  // Synchronous — captures timestamps and queues DB work; returns instantly.
  const saveSession = useCallback(() => {
    if (!startTimeRef.current) return;
    const start = startTimeRef.current;
    startTimeRef.current = null;

    const endTime = Date.now();
    const durationSeconds = Math.round((endTime - start) / 1000);
    if (durationSeconds <= 0) return;

    const today = new Date().toISOString().slice(0, 10);
    enqueueAnalyticsWrite(async () => {
      try {
        await Promise.all([
          insertReadSession({
            bani_id: baniId,
            bani_title: baniTitle ?? null,
            start_time: start,
            end_time: endTime,
            duration_seconds: durationSeconds,
            completed: false,
          }),
          upsertDailyActivity({
            date: today,
            reading_seconds_delta: durationSeconds,
            listening_seconds_delta: 0,
          }),
          incrementBaniReadCount(baniId, baniTitle ?? null),
        ]);
        trackBaniCompleted(baniId, baniTitle, durationSeconds).catch(() => {});
      } catch (err) {
        logError(new Error(`useReadingSession save failed: ${err?.message || err}`));
      }
    });
  }, [baniId, baniTitle]);

  const startSession = useCallback(() => {
    if (startTimeRef.current) return;
    startTimeRef.current = Date.now();
  }, []);

  // focus → start, blur → save (covers navigate-away and navigate-back)
  useEffect(() => {
    const unsubFocus = navigation.addListener("focus", startSession);
    const unsubBlur = navigation.addListener("blur", saveSession);
    return () => {
      unsubFocus();
      unsubBlur();
    };
  }, [navigation, startSession, saveSession]);

  // App background → save, foreground → restart
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        saveSession();
      } else if (state === "active") {
        startSession();
      }
    });
    return () => subscription.remove();
  }, [saveSession, startSession]);

  // Unmount cleanup (e.g. hardware back)
  useEffect(() => {
    return () => {
      saveSession();
    };
  }, [saveSession]);
};

export default useReadingSession;
