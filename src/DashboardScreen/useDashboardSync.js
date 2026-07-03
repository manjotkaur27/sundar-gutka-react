import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import DeviceInfo from "react-native-device-info";
import { useStore, useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { logError } from "@common";
import {
  getDashboardLatest,
  applyDashboardRestore,
  seedAnalyticsFromSnapshot,
  buildCachePayload,
  pushDashboardCache,
} from "../services/dashboard";

const RESTORED_KEY = "@dashboard_restored_v1";
const LAST_PUSH_KEY = "@dashboard_last_push";
const DAY_MS = 24 * 60 * 60 * 1000;

// Per-device dashboard sync orchestration. Restores once on a fresh install (from
// this device's latest snapshot) and pushes a daily snapshot on blur/background.
// Public + deviceId-keyed (no auth), so it always runs — there is no login. The
// stable device id (DeviceInfo.getUniqueId()) is the key; restore only works while
// that id is stable (a random reset would orphan the old snapshot).
const useDashboardSync = () => {
  const store = useStore();
  const dispatch = useDispatch();
  const restoredRef = useRef(false);

  // Restore once (fresh install / new device) from this device's latest snapshot.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (restoredRef.current) return;
        if (await AsyncStorage.getItem(RESTORED_KEY)) return;
        const deviceId = await DeviceInfo.getUniqueId();
        const payload = await getDashboardLatest({ deviceId });
        if (!active) return;
        if (payload) {
          await applyDashboardRestore(payload, dispatch, { reschedule: true });
          await seedAnalyticsFromSnapshot(payload);
        }
        // Mark restored even on a 404 (first run on this device) so we don't retry every launch.
        await AsyncStorage.setItem(RESTORED_KEY, "1");
        restoredRef.current = true;
      } catch (err) {
        logError(err);
      }
    })();
    return () => {
      active = false;
    };
  }, [dispatch]);

  // Push a snapshot, throttled to once per day. Same-day re-syncs would just
  // overwrite server-side (last-write-wins), so once a day is enough. Always runs —
  // there is no login gate.
  const pushNow = useCallback(async () => {
    try {
      const lastRaw = await AsyncStorage.getItem(LAST_PUSH_KEY);
      if (lastRaw && Date.now() - Number(lastRaw) < DAY_MS) return;
      const body = await buildCachePayload({
        state: store.getState(),
        version: DeviceInfo.getVersion(),
        deviceId: await DeviceInfo.getUniqueId(),
      });
      const res = await pushDashboardCache(body);
      if (res?.ok) await AsyncStorage.setItem(LAST_PUSH_KEY, String(Date.now()));
    } catch (err) {
      logError(err);
    }
  }, [store]);

  // Push when leaving the dashboard (focus-effect cleanup = blur).
  useFocusEffect(
    useCallback(
      () => () => {
        pushNow();
      },
      [pushNow]
    )
  );

  // Push when the app goes to background.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "background") pushNow();
    });
    return () => sub.remove();
  }, [pushNow]);
};

export default useDashboardSync;
