import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import DeviceInfo from "react-native-device-info";
import { useStore, useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { logError } from "@common";
import {
  getAuthToken,
  getDashboardLatest,
  applyDashboardRestore,
  seedAnalyticsFromSnapshot,
  buildCachePayload,
  pushDashboardCache,
} from "../services/dashboard";

const RESTORED_KEY = "@dashboard_restored_v1";
const LAST_PUSH_KEY = "@dashboard_last_push";
const DAY_MS = 24 * 60 * 60 * 1000;

// Cross-device dashboard sync orchestration (KHALIS_API.md §3).
// Restores once on a fresh install and pushes a daily snapshot on blur/background.
// Entirely gated on getAuthToken(): while it returns null (no SSO yet) every path
// no-ops, so this is dormant but ready to activate when auth lands.
const useDashboardSync = () => {
  const store = useStore();
  const dispatch = useDispatch();
  const restoredRef = useRef(false);

  // Restore once (fresh install / new device), when authenticated.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = await getAuthToken();
        if (!token || restoredRef.current) return;
        if (await AsyncStorage.getItem(RESTORED_KEY)) return;
        const payload = await getDashboardLatest({ token });
        if (!active) return;
        if (payload) {
          await applyDashboardRestore(payload, dispatch, { reschedule: true });
          await seedAnalyticsFromSnapshot(payload);
        }
        // Mark restored even on a 404 (fresh account) so we don't retry every launch.
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

  // Push a snapshot, throttled to once per day, when authenticated.
  const pushNow = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;
      const lastRaw = await AsyncStorage.getItem(LAST_PUSH_KEY);
      if (lastRaw && Date.now() - Number(lastRaw) < DAY_MS) return;
      const body = await buildCachePayload({
        state: store.getState(),
        version: DeviceInfo.getVersion(),
        deviceId: await DeviceInfo.getUniqueId(),
      });
      const res = await pushDashboardCache(body, token);
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
