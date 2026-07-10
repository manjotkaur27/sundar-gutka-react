import { useCallback, useEffect, useRef, useState } from "react";
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
// Exported so the header can show a "last synced" readout for testing.
export const LAST_PUSH_KEY = "@dashboard_last_push";
// NOT a "once a day" cap — this only dedupes the near-simultaneous blur+background
// fire when the user backgrounds the app while the Dashboard is focused (both
// listeners land in the same tick). A full-day throttle meant real same-day
// activity (e.g. reading more banis after the first push) never reached the
// cloud until the next day, so a same-day reinstall would restore stale totals.
const PUSH_COOLDOWN_MS = 60 * 1000;

// Per-device dashboard sync orchestration. Restores once on a fresh install (from
// this device's latest snapshot) and pushes a daily snapshot on blur/background.
// Public + deviceId-keyed (no auth), so it always runs — there is no login. The
// stable device id (DeviceInfo.getUniqueId()) is the key; restore only works while
// that id is stable (a random reset would orphan the old snapshot).
const useDashboardSync = () => {
  const store = useStore();
  const dispatch = useDispatch();
  const restoredRef = useRef(false);
  // Bumps once the restore attempt (success, no-op, or error) has fully settled.
  // DashboardScreen watches this to force a refetch of every section — without
  // it, sections that fetch on mount (YourPractice, MonthCalendar) race the
  // restore's SQLite writes and can render whatever was there first (empty, on
  // a fresh install), with nothing ever prompting them to look again.
  const [restoreTick, setRestoreTick] = useState(0);

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
      } finally {
        if (active) setRestoreTick((t) => t + 1);
      }
    })();
    return () => {
      active = false;
    };
  }, [dispatch]);

  // Push a snapshot on every blur/background, cooldown-deduped (see
  // PUSH_COOLDOWN_MS above). Always runs — there is no login gate.
  const pushNow = useCallback(async () => {
    try {
      // Guard against a fresh-install race: if the one-time restore hasn't
      // settled yet, local SQLite is still empty/partial. Pushing now would
      // compute near-zero "all time" totals and overwrite the cloud's real
      // history with them — last-write-wins means that corruption is
      // permanent, since every future restore then pulls this bad snapshot as
      // "latest". Skip the push entirely until restore has had its turn;
      // there's another push opportunity (blur/background) once it has.
      if (!(await AsyncStorage.getItem(RESTORED_KEY))) return;
      const lastRaw = await AsyncStorage.getItem(LAST_PUSH_KEY);
      if (lastRaw && Date.now() - Number(lastRaw) < PUSH_COOLDOWN_MS) return;
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

  return restoreTick;
};

export default useDashboardSync;
