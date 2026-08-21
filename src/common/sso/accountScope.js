// Keeps on-device data belonging to the account that is actually signed in.
//
// Signing out used to clear only the Keychain token and the `auth` slice, so
// everything that makes up "your dashboard" — SQLite sessions, streaks,
// bookmarks, nitnem, layout, reminders — survived into the next person's
// session. Signing in as B showed A's reading history: wrong, and a privacy leak
// rather than merely a stale-cache bug.
//
// The first fix for that was to DELETE the history on every account change,
// including a plain sign-out. That is what made a much worse bug possible: sign
// out, read for a few minutes, sign back in, and the device held a near-empty
// store which the sync layer then treated as the account's truth and pushed
// over real history. An account lost a streak and every completed bani that way.
//
// So the HISTORY is no longer deleted — it is SCOPED. Each account has its own
// SQLite file (see database/analytics/accountDb), signing out detaches instead
// of destroying, and signing back in finds everything still there, including
// whatever had not been pushed yet. Account B never opens account A's file, so
// the privacy property survives without deleting anything.
//
// PREFERENCES — layout, reminders, nitnem, bookmarks — are still reset on an
// account CHANGE. They are small, single-valued and restored from the account's
// own snapshot, so resetting them costs nothing and keeps the boundary simple.
// They persist under one redux-persist key, which is why they are not scoped the
// same way.

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  useAnalyticsAccount,
  getAllDailyActivity,
  getAllReadSessions,
  getAllAudioSessions,
  getAllBaniReadCounts,
  upsertDailyActivity,
  insertReadSession,
  insertAudioSession,
  incrementBaniReadCount,
  clearAllAnalyticsData,
} from "../../database/analytics";
import {
  DASHBOARD_RESTORED_KEY,
  DASHBOARD_LAST_PUSH_KEY,
  DASHBOARD_APPLIED_AT_KEY,
  DASHBOARD_LOCAL_MUTATED_AT_KEY,
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
  // Deliberately does NOT touch the analytics database any more. Switching
  // accounts changes which FILE is open (switchAnalyticsAccount below); the
  // outgoing account's history stays exactly where it is.
  dispatch(clearUserData());

  // A's reminders are already scheduled with the OS. Redux forgetting them does
  // not unschedule them — without this, B keeps getting A's notifications.
  await cancelAllReminders();

  // DASHBOARD_APPLIED_AT_KEY goes with them: it records how fresh the LAST
  // ACCOUNT's applied snapshot was. Left behind, the incoming account's own
  // snapshot could look older than it and be skipped as "nothing new".
  // DASHBOARD_LOCAL_MUTATED_AT_KEY goes too: the purge has just deleted the
  // data that timestamp described, so leaving it would tell the incoming
  // account that this device holds newer changes than the cloud — and its own
  // snapshot would be discarded in favour of nothing.
  await AsyncStorage.multiRemove([
    DASHBOARD_LAST_PUSH_KEY,
    RESTORED_TOP_BANIS_KEY,
    DASHBOARD_APPLIED_AT_KEY,
    DASHBOARD_LOCAL_MUTATED_AT_KEY,
  ]);

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
 * Point the analytics database at `email`'s own file, first carrying over any
 * activity recorded while signed out.
 *
 * Signed-out reading lands in the anonymous store because there is no account to
 * attribute it to yet. Whoever signs in next claims it: the rows are ADDED to
 * that account's days (they are genuinely additional activity, not a competing
 * copy of the same day), and then cleared from the anonymous store so a second
 * sign-in cannot add them twice.
 *
 * Ordering is add-then-clear on purpose. Interrupted between the two, the worst
 * case is that a day is counted twice — recoverable, and visibly wrong. Clearing
 * first would lose the reading outright, which is not.
 */
export const switchAnalyticsAccount = async (email) => {
  let carried = null;
  try {
    // Read while the ANONYMOUS store is still the open one.
    //
    // ALL FIVE tables, not just the day rows. Carrying only `daily_activity`
    // left the streak summary, the session histories and the read counts behind
    // in the anonymous store — and because that store is the pre-accounts
    // database, signing out then showed the previous account's streak and
    // most-read lists on a dashboard that was supposed to be empty.
    if (email) {
      carried = {
        days: await getAllDailyActivity(),
        reads: await getAllReadSessions(),
        audio: await getAllAudioSessions(),
        counts: await getAllBaniReadCounts(),
      };
    }
  } catch (err) {
    logError(new Error(`SSO accountScope: reading signed-out activity failed: ${err?.message}`));
    carried = null;
  }

  await useAnalyticsAccount(email);

  const total =
    (carried?.days?.length ?? 0) +
    (carried?.reads?.length ?? 0) +
    (carried?.audio?.length ?? 0) +
    (carried?.counts?.length ?? 0);
  if (!email || total === 0) return 0;

  try {
    // Days are ADDED as deltas: signed-out reading is genuinely extra activity
    // for that date, not a competing copy of it.
    await Promise.all(
      (carried.days ?? []).map((row) =>
        upsertDailyActivity({
          date: row.date,
          reading_seconds_delta: row.reading_seconds ?? 0,
          listening_seconds_delta: row.listening_seconds ?? 0,
        })
      )
    );
    // Sessions are individual facts, so they are re-inserted as they were. The
    // summary is not carried at all — it is DERIVED (computeStreaks rebuilds the
    // streak from the day rows, and the all-time totals are summed from these
    // session tables), so copying it would only risk double counting.
    await Promise.all(
      (carried.reads ?? []).map((r) =>
        insertReadSession({
          bani_id: r.bani_id,
          bani_title: r.bani_title ?? null,
          start_time: r.start_time,
          end_time: r.end_time,
          duration_seconds: r.duration_seconds ?? 0,
          completed: !!r.completed,
        })
      )
    );
    await Promise.all(
      (carried.audio ?? []).map((r) =>
        insertAudioSession({
          audio_id: r.audio_id ?? null,
          bani_id: r.bani_id,
          bani_title: r.bani_title ?? null,
          artist_id: r.artist_id ?? null,
          artist_name: r.artist_name ?? null,
          duration_played: r.duration_played ?? 0,
          completed: !!r.completed,
        })
      )
    );
    await Promise.all(
      (carried.counts ?? []).flatMap((r) =>
        Array.from({ length: Math.max(0, r.read_count ?? 0) }, () =>
          incrementBaniReadCount(r.bani_id, r.bani_title ?? null)
        )
      )
    );
  } catch (err) {
    // Nothing was cleared, so everything is still in the anonymous store and the
    // next sign-in will try again. Leave it.
    logError(new Error(`SSO accountScope: carrying signed-out activity failed: ${err?.message}`));
    return 0;
  }

  try {
    // Empty the anonymous store completely. Everything in it now lives in the
    // account, and leaving any of it behind is what made a signed-out dashboard
    // show the previous account's numbers.
    await useAnalyticsAccount(null);
    await clearAllAnalyticsData();
  } catch (err) {
    logError(new Error(`SSO accountScope: clearing signed-out activity failed: ${err?.message}`));
  } finally {
    await useAnalyticsAccount(email);
  }
  return total;
};

/**
 * Called on every session change. Resets PREFERENCES only when the account
 * actually differs, always points the database at the right account, then
 * records the new owner.
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

    // Unconditional: the database must follow the session even when the account
    // has not CHANGED — a relaunch starts on the anonymous store and has to be
    // pointed at the signed-in account before anything reads or writes.
    await switchAnalyticsAccount(email);

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
