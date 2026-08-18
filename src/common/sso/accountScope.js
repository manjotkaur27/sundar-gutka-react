// Keeps on-device data belonging to the account that is actually signed in.
//
// Signing out used to clear only the Keychain token and the `auth` slice, so
// everything that actually makes up "your dashboard" — SQLite sessions, streaks,
// bookmarks, nitnem, layout, reminders — survived into the next person's
// session. Signing in as B showed A's reading history: wrong, and a privacy leak
// rather than merely a stale-cache bug.
//
// This module owns the boundary: remember which account the on-device data
// belongs to, and wipe it when that changes.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearAllAnalyticsData } from "../../database/analytics";
import {
  DASHBOARD_RESTORED_KEY,
  DASHBOARD_LAST_PUSH_KEY,
  RESTORED_TOP_BANIS_KEY,
} from "../../services/dashboard/syncKeys";
import { clearUserData } from "../actions";
import constant from "../constant";
import { logError } from "../firebase/crashlytics";
import { cancelAllReminders } from "../notifications";

// Which account the data currently on this device belongs to. Email, because
// that is what the backend resolves an SSO token to (its auth guard upserts the
// user row on email — nameID is never read server-side), so the two stay
// consistent when sync becomes account-keyed.
const LAST_ACCOUNT_KEY = "@sso_last_account_v1";

export const readLastAccount = async () => {
  try {
    return await AsyncStorage.getItem(LAST_ACCOUNT_KEY);
  } catch (err) {
    logError(new Error(`SSO accountScope.readLastAccount failed: ${err?.message || err}`));
    return null;
  }
};

export const writeLastAccount = async (email) => {
  try {
    if (email) await AsyncStorage.setItem(LAST_ACCOUNT_KEY, email);
    else await AsyncStorage.removeItem(LAST_ACCOUNT_KEY);
  } catch (err) {
    logError(new Error(`SSO accountScope.writeLastAccount failed: ${err?.message || err}`));
  }
};

/** Case/whitespace-insensitive, so "A@x.com" and "a@x.com " are one account. */
const normalise = (email) => (typeof email === "string" ? email.trim().toLowerCase() : null);

/**
 * True when `email` is a different account from the one this device's data
 * belongs to. A signed-out device (`email` null) counts as a change only if
 * there was an account before — otherwise every launch of a never-signed-in app
 * would purge.
 */
export const isAccountChange = (email, lastAccount) => {
  const next = normalise(email);
  const prev = normalise(lastAccount);
  if (!next && !prev) return false;
  return next !== prev;
};

/**
 * Wipe everything that belongs to a person rather than to this phone.
 *
 * Deliberately NOT wiped: downloaded audio (real files on disk — clearing the
 * registry would orphan them), and every display preference (theme, font size,
 * language). Those describe how this phone is set up, not who is holding it.
 */
export const purgeLocalUserData = async (dispatch) => {
  // SQLite first: it is the source of truth for streaks and the calendar, so a
  // failure here matters more than the rest and should surface before we start
  // reporting success.
  await clearAllAnalyticsData();

  dispatch(clearUserData());

  // A's reminders are already scheduled with the OS. Redux forgetting them does
  // not unschedule them — without this, B keeps getting A's notifications.
  await cancelAllReminders();

  await AsyncStorage.multiRemove([DASHBOARD_LAST_PUSH_KEY, RESTORED_TOP_BANIS_KEY]);

  if (constant.SSO_ACCOUNT_SCOPED_SYNC) {
    // Backend keys snapshots on the account: clear the marker so the signing-in
    // account restores its OWN snapshot.
    await AsyncStorage.removeItem(DASHBOARD_RESTORED_KEY);
  } else {
    // Backend still keys on deviceId. Restoring here would fetch this DEVICE's
    // latest snapshot — i.e. hand the new account the previous account's data
    // and recreate the exact bug this purge exists to fix. Setting the marker
    // suppresses the restore so the new account starts genuinely empty.
    await AsyncStorage.setItem(DASHBOARD_RESTORED_KEY, "1");
  }
};

/**
 * Called on every session change. Purges only when the account actually
 * differs, then records the new owner.
 *
 * A FIRST sign-in is the exception. There is no previous account whose data
 * needs protecting — only whatever the person did on this device before they
 * signed in, which is their own. That is claimed, not destroyed, so a nitnem
 * arranged signed-out survives the sign-in that gives it somewhere to live.
 * Every later change of account still purges in full.
 *
 * Returns true if a purge happened (useful for tests and logging).
 */
export const applyAccountScope = async (email, dispatch) => {
  try {
    const last = await readLastAccount();
    if (!isAccountChange(email, last)) return false;
    if (!normalise(last) && normalise(email)) {
      await writeLastAccount(normalise(email));
      return false;
    }
    await purgeLocalUserData(dispatch);
    await writeLastAccount(email ? normalise(email) : null);
    return true;
  } catch (err) {
    // A failed purge must not block sign-in, but it does mean stale data may be
    // on screen — report it rather than swallowing it silently.
    logError(new Error(`SSO accountScope.applyAccountScope failed: ${err?.message || err}`));
    return false;
  }
};
