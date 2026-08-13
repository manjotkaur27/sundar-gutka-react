import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import DeviceInfo from "react-native-device-info";
import { useStore, useDispatch, useSelector } from "react-redux";
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

// The same key accountScope clears on an account change, so a signing-in
// account restores its own snapshot. Imported rather than re-declared — two
// copies of this string is how the purge and the restore drift apart.
import { DASHBOARD_RESTORED_KEY as RESTORED_KEY } from "../services/dashboard/syncKeys";
// Exported so the header can show a "last synced" readout for testing.
export const LAST_PUSH_KEY = "@dashboard_last_push";
// NOT a "once a day" cap — this only dedupes the near-simultaneous blur+background
// fire when the user backgrounds the app while the Dashboard is focused (both
// listeners land in the same tick). A full-day throttle meant real same-day
// activity (e.g. reading more banis after the first push) never reached the
// cloud until the next day, so a same-day reinstall would restore stale totals.
const PUSH_COOLDOWN_MS = 60 * 1000;

// Account dashboard sync orchestration. Restores the signed-in account's latest
// snapshot once, and pushes a daily snapshot on blur/background.
//
// BOTH halves require a session. The endpoints are auth-only, so running them
// signed out earns a 401 on every blur and every Dashboard mount and achieves
// nothing. Restore re-arms when the user signs in: accountScope clears the
// restore marker on an account change, and `status` in the dependency list is
// what makes this effect notice.
const useDashboardSync = () => {
  const store = useStore();
  const dispatch = useDispatch();
  const status = useSelector((state) => state.auth?.status);
  const account = useSelector((state) => state.auth?.user?.email ?? null);
  const signedIn = status === "signedIn";
  // WHICH account this session has already restored for — not merely "have we
  // restored". A boolean here is set once and never cleared, so after the first
  // restore every later run early-returned: signing out and back in re-ran the
  // effect, hit the guard, and left the dashboard empty until the app was
  // killed and the ref recreated. Keying it on the account makes each new
  // account its own restore, and `null` while signed out re-arms it.
  const restoredForRef = useRef(null);
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
        if (!signedIn) {
          // Signed out: forget what we restored, so the next sign-in restores
          // again even if it is the same account returning.
          restoredForRef.current = null;
          return;
        }
        if (restoredForRef.current === account) return;
        if (await AsyncStorage.getItem(RESTORED_KEY)) return;
        const payload = await getDashboardLatest();
        if (!active) return;
        if (payload) {
          // Marked BEFORE applying, not after. The restore overwrites user
          // preferences with the snapshot's — including `reminders.enabled`
          // (see applyDashboardRestore). If anything inside it threw, the
          // marker below was never written, so the next launch restored again
          // and silently re-applied the snapshot's reminder state over
          // whatever the user had just set. Once we have a payload the restore
          // has had its one attempt, so it must not run a second time.
          await AsyncStorage.setItem(RESTORED_KEY, "1");
          restoredForRef.current = account;
          // The language is needed to resolve each restored reminder's bani
          // name out of the local database — the payload carries only IDs.
          await applyDashboardRestore(payload, dispatch, {
            reschedule: true,
            transliterationLanguage: store.getState().transliterationLanguage,
          });
          await seedAnalyticsFromSnapshot(payload);
        } else {
          // Mark restored on a 404 too (first run on this device) so we don't
          // retry every launch.
          await AsyncStorage.setItem(RESTORED_KEY, "1");
          restoredForRef.current = account;
        }
      } catch (err) {
        logError(err);
      } finally {
        if (active) setRestoreTick((t) => t + 1);
      }
    })();
    return () => {
      active = false;
    };
    // `account` as well as `signedIn`: switching straight from one account to
    // another changes the email without `signedIn` ever going false, and that
    // still needs its own restore.
  }, [dispatch, signedIn, account]);

  // Push a snapshot on every blur/background, cooldown-deduped (see
  // PUSH_COOLDOWN_MS above). Signed-in only: the endpoint is auth-only.
  const pushNow = useCallback(async () => {
    try {
      if (!signedIn) return;
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
        // Metadata, and the key the server uses to adopt snapshots pushed
        // before this user had an account. No longer the sync identity.
        deviceId: await DeviceInfo.getUniqueId(),
      });
      const res = await pushDashboardCache(body);
      // `unauthorized` is a normal state (token lapsed while the app sat open),
      // not a failure worth logging on every backgrounding.
      if (res?.ok) await AsyncStorage.setItem(LAST_PUSH_KEY, String(Date.now()));
    } catch (err) {
      logError(err);
    }
  }, [store, signedIn]);

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
