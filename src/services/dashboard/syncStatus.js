import { useEffect, useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { constant } from "@common";

// A visible record of what sync actually DID, rather than what it was supposed
// to do.
//
// The header has shown "last synced: never" for accounts that clearly had local
// data, and there was no way to tell why: `pushNow` caught every failure and
// sent it to `logError`, which reports to Crashlytics and nowhere the person
// holding the phone can see. "Never" could equally mean the push was skipped
// before it started (not signed in, restore gate closed, still inside the
// cooldown), or that it ran and the server refused it — and those need opposite
// fixes.
//
// So each attempt records its OUTCOME here, and the header renders it. This is
// diagnostic scaffolding, not a feature: once the cause is known it can be
// reduced to the timestamp it replaced.

const STATUS_KEY = "@dashboard_sync_status_v1";

// Reasons a push never reached the network. Kept as plain strings so the
// readout is legible on screen without a lookup table.
export const SKIP_SIGNED_OUT = "signed-out";
export const SKIP_NOT_RESTORED = "restore-pending";
export const SKIP_COOLDOWN = "cooldown";
// The snapshot is byte-identical to the last one we pushed. Like a cooldown,
// this is a healthy outcome rather than a failure — there was simply nothing to
// send — so the header does not report it.
export const SKIP_UNCHANGED = "unchanged";
// The snapshot carried no history at all. Refused rather than sent: this is the
// shape local state has for a moment after an account switch wipes SQLite, and
// uploading it overwrites the account's real history with nothing.
export const SKIP_EMPTY = "empty-local";
// A restore is mid-flight. Local state is being rewritten right now, so anything
// built from it would be a half-applied snapshot.
export const SKIP_RESTORING = "restoring";

// Subscribers to "the sync status changed".
//
// Without this the header read the status once per screen focus, so a push that
// finished twenty seconds after the user put the phone down changed nothing on
// screen. The readout then said "never" long after a successful sync — which is
// indistinguishable from sync being broken, and sent us looking for a bug in
// the wrong half of the system.
const listeners = new Set();
let cached = null;

const notify = () => listeners.forEach((fn) => fn());

export const subscribeSyncStatus = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** Synchronous snapshot for useSyncExternalStore. Null until the first read. */
export const getSyncStatusSnapshot = () => cached;

const read = async () => {
  try {
    const raw = await AsyncStorage.getItem(STATUS_KEY);
    cached = raw ? JSON.parse(raw) : {};
    return cached;
  } catch (_) {
    return cached ?? {};
  }
};

const write = async (next) => {
  try {
    cached = next;
    await AsyncStorage.setItem(STATUS_KEY, JSON.stringify(next));
  } catch (_) {
    /* diagnostics must never break sync */
  } finally {
    notify();
  }
};

/**
 * Records the outcome of a push attempt, including one that never left.
 *
 * The last SUCCESS and the last ATTEMPT are kept apart on purpose. Holding one
 * field meant a skipped attempt — a cooldown, which is the overwhelmingly
 * common case, since every backgrounding tries again — erased the record of the
 * push that had genuinely succeeded a few minutes earlier. The header then read
 * "never (cooldown)" on a device that had in fact synced, which is worse than
 * useless: it reports a failure that did not happen.
 */
export const recordPush = async (outcome) => {
  const prev = await read();
  const next = { ...prev, attempt: { at: Date.now(), ...outcome } };
  if (outcome?.ok) next.push = { at: Date.now(), ...outcome };
  await write(next);
};

/** Records the outcome of a pull attempt. */
export const recordPull = async (outcome) => {
  const prev = await read();
  await write({ ...prev, pull: { at: Date.now(), ...outcome } });
};

export const readSyncStatus = read;

/**
 * Live sync status. Re-renders the caller whenever an attempt is recorded,
 * rather than only when the screen happens to refocus.
 *
 * The stale readout was its own bug: a push that succeeded while the user sat
 * on the Dashboard left the label reading "never", which looks exactly like
 * sync being broken and is why we went hunting in the wrong place.
 */
export const useSyncStatus = () => {
  const status = useSyncExternalStore(
    subscribeSyncStatus,
    getSyncStatusSnapshot,
    getSyncStatusSnapshot
  );
  // Prime the cache on first mount; every later change arrives via the store.
  useEffect(() => {
    if (status === null) read();
  }, [status]);
  return status ?? {};
};

/**
 * One short line for the header. Deliberately terse — it sits under the date.
 *
 * Shows the PUSH, because that is the direction the user's own work travels and
 * the one that was silently failing; the pull is appended only when it did not
 * simply succeed, so a healthy device reads as a plain timestamp.
 */
export const formatSyncStatus = (status, formatDateTime, neverLabel) => {
  const { push, attempt, pull } = status ?? {};

  // The timestamp is the last SUCCESS, so it never goes backwards once a device
  // has synced. A cooldown skip is not a failure and is not worth reporting on
  // top of it — it just means we synced recently enough.
  const line = push ? formatDateTime(new Date(push.at)) : neverLabel;

  // Everything below is DIAGNOSTIC and off in release builds. See
  // constant.SYNC_DIAGNOSTICS for why: "never (HTTP 500)" is the right thing to
  // show a developer and the wrong thing to show someone reading their nitnem.
  if (!constant.SYNC_DIAGNOSTICS) return line;

  const benign = attempt?.skipped === SKIP_COOLDOWN || attempt?.skipped === SKIP_UNCHANGED;
  const failed = attempt && !attempt.ok && !benign ? attempt : null;
  let detailed = line;
  if (failed) {
    const reason =
      failed.skipped ?? (failed.status ? `HTTP ${failed.status}` : failed.error) ?? "failed";
    detailed += ` (${reason})`;
  }

  if (pull && pull.status && pull.status !== "ok") detailed += ` · pull ${pull.status}`;
  return detailed;
};

export default readSyncStatus;
