import AsyncStorage from "@react-native-async-storage/async-storage";
import { constant, actions, updateReminders, logError, STRINGS } from "@common";
import { getBaniList } from "@database";
import {
  getOrCreateSummary,
  getDailyActivity,
  getTopReadBanis,
  getTopListenedBanis,
  getRecentReadBanis,
  getRecentListenedBanis,
  getAllTimeTotals,
  setDailyActivity,
  updateSummary,
} from "../../database/analytics";

// Per-device dashboard sync: push (POST /dashboard/cache) and restore
// (GET /dashboard/latest?deviceId=). Restore applies the user-setup blocks (profile,
// layout, nitnem, reminders) into Redux and seeds analytics SQLite from the snapshot.
//
// Public + deviceId-keyed (no auth): the stable device id (DeviceInfo.getUniqueId())
// is the only key, so sync always runs — there is no login. Per-device, not
// per-account: device A can't see device B's data (the tradeoff until SSO lands).
// userId stays null, reserved for future SSO.

const latestUrl = () =>
  constant.DASHBOARD_LATEST_API_URL || `${constant.DASHBOARD_API_BASE_URL || ""}/dashboard/latest`;
const syncUrl = () =>
  constant.DASHBOARD_SYNC_API_URL || `${constant.DASHBOARD_API_BASE_URL || ""}/dashboard/cache`;

const fetchLatest = async (deviceId) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${latestUrl()}?deviceId=${encodeURIComponent(deviceId)}`, {
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
    });
    if (res.status === 404) return { notFound: true };
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { data: await res.json() };
  } finally {
    clearTimeout(timeoutId);
  }
};

// Returns this device's snapshot `payload`, or null when the device has never synced
// (404). The backend responds { syncedAt, payload }.
export const getDashboardLatest = async ({ deviceId } = {}) => {
  const { notFound, data } = await fetchLatest(deviceId);
  if (notFound) return null;
  return data?.payload ?? null;
};

// The contract stores reminder times as 24h "HH:mm"; the local scheduler
// (notifications.js parseTimeString) expects "h:mm A". Convert so a restored
// "18:00" schedules at 6 PM, not 6 AM.
const to12h = (t) => {
  if (!t) return t;
  if (/[ap]m\s*$/i.test(t)) return t; // already "h:mm A"
  const [hRaw, mRaw = "0"] = String(t).split(":");
  let hr = Number(hRaw);
  if (Number.isNaN(hr)) return t;
  const min = String(Number(mRaw) || 0).padStart(2, "0");
  const meridiem = hr >= 12 ? "PM" : "AM";
  hr %= 12;
  if (hr === 0) hr = 12;
  return `${hr}:${min} ${meridiem}`;
};

// Applies the user-setup blocks of a restored payload into Redux.
// reschedule=false by default: notifications are device-local and permission-gated,
// so the caller should reschedule (after a permission check) when appropriate.
// Returns the list of blocks that were applied.
export const applyDashboardRestore = async (
  payload,
  dispatch,
  { reschedule = false, transliterationLanguage = undefined } = {}
) => {
  const applied = [];
  if (!payload || !dispatch) return applied;

  if (payload.profile && typeof payload.profile.name === "string") {
    dispatch(actions.setUserProfile({ name: payload.profile.name }));
    applied.push("profile");
  }

  if (payload.layout && Array.isArray(payload.layout.order)) {
    dispatch(
      actions.setDashboardLayout({
        order: payload.layout.order,
        hidden: Array.isArray(payload.layout.hidden) ? payload.layout.hidden : [],
      })
    );
    applied.push("layout");
  }

  if (payload.nitnem) {
    dispatch(
      actions.restoreNitnem({
        selectedBaniIds: payload.nitnem.selectedBaaniIds,
        completed: payload.nitnem.completed,
      })
    );
    applied.push("nitnem");
  }

  if (payload.reminders && Array.isArray(payload.reminders.items)) {
    const enabled = !!payload.reminders.enabled;
    const sound = payload.reminders.sound || "";

    // The server stores a reminder as an ID and a time — the bani's NAMES live
    // in the local database, not in the payload. These three fields were being
    // filled with empty strings, which meant a restored reminder rendered with
    // a blank name in Settings and fired a notification with no title.
    //
    // A failed lookup must not lose the reminder: the times are the part the
    // user actually set, so on any database error the names stay empty and the
    // Reminder Options screen backfills them on its next visit.
    let byId = new Map();
    try {
      const list = await getBaniList(transliterationLanguage);
      byId = new Map(list.map((b) => [b.id, b]));
    } catch (err) {
      logError(err);
    }

    const items = payload.reminders.items.map((it) => {
      const bani = byId.get(it.baaniId);
      const translit = bani?.translit || "";
      return {
        key: it.baaniId,
        id: it.baaniId,
        enabled: !!it.enabled,
        time: to12h(it.time),
        gurmukhi: bani?.gurmukhi || "",
        translit,
        title: translit ? `${STRINGS.time_for} ${translit}` : "",
      };
    });
    const json = JSON.stringify(items);
    dispatch(actions.setReminderBanis(json));
    dispatch(actions.toggleReminders(enabled));
    if (sound) dispatch(actions.setReminderSound(sound));
    if (reschedule) {
      try {
        await updateReminders(enabled, sound, json);
      } catch (err) {
        logError(err);
      }
    }
    applied.push("reminders");
  }

  return applied;
};

// Raw per-session tables (bani_read_history/audio_history) are device-local
// and never restored from a cloud snapshot — only the aggregates are. So
// "top read/listened banis" and "continue reading/listening" (which query
// those raw tables directly) go blank right after a reinstall for a
// returning user with real cloud history, indistinguishable from a genuinely
// new user. Cache the snapshot's own read/listen (top5 + last) here so those
// UI sections can fall back to it when the live query is empty, instead of
// showing a false "you've never read/listened to anything" state.
const RESTORED_TOP_BANIS_KEY = "@restored_top_banis_v1";

// Returns { read: {top5,last}, listen: {top5,last} } as captured at the last
// restore, or null if there's no restored snapshot (e.g. a genuinely new
// user, or nothing was ever synced). Callers should only use this as a
// fallback when their own live query returns empty.
export const getRestoredTopBanis = async () => {
  try {
    const raw = await AsyncStorage.getItem(RESTORED_TOP_BANIS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
};

// ─── Restore: seed analytics SQLite from the snapshot ────────────────────────
// Intended for a fresh install (empty analytics). Uses setDailyActivity
// (overwrite, not additive) so a repeat restore before the next cloud push
// (e.g. reinstalling twice) can't double-count a day — unlike upsertDailyActivity,
// which real sessions use and which correctly accumulates multiple same-day
// sessions.
export const seedAnalyticsFromSnapshot = async (payload) => {
  if (!payload) return;
  try {
    const { month, streaks, totals, read, listen } = payload;
    if (read || listen) {
      AsyncStorage.setItem(
        RESTORED_TOP_BANIS_KEY,
        JSON.stringify({ read: read ?? null, listen: listen ?? null })
      ).catch(() => {});
    }
    let lastActiveDate = null;
    if (month?.key && Array.isArray(month.days) && month.days.length) {
      await Promise.all(
        month.days.map(([day, r = 0, l = 0]) =>
          setDailyActivity({
            date: `${month.key}-${String(day).padStart(2, "0")}`,
            reading_seconds: r,
            listening_seconds: l,
          })
        )
      );
      // The streak engine treats a missing last_active_date as "never active",
      // which would immediately zero out a freshly-restored current_streak the
      // next time it runs. Derive it from the latest restored day so it doesn't.
      const latestDay = Math.max(...month.days.map(([day]) => day));
      lastActiveDate = `${month.key}-${String(latestDay).padStart(2, "0")}`;
    }
    const fields = {};
    if (streaks?.current != null) fields.current_streak = streaks.current;
    if (streaks?.longest != null) fields.longest_streak = streaks.longest;
    if (totals?.daysActive != null) fields.total_days_active = totals.daysActive;
    if (totals?.readingSeconds != null) fields.total_reading_seconds = totals.readingSeconds;
    if (totals?.listeningSeconds != null) fields.total_listening_seconds = totals.listeningSeconds;
    if (totals?.audioSessions != null) fields.total_audio_sessions = totals.audioSessions;
    if (totals?.banisCompleted != null) fields.total_banis_read = totals.banisCompleted;
    if (lastActiveDate) fields.last_active_date = lastActiveDate;
    if (Object.keys(fields).length) await updateSummary(fields);
  } catch (err) {
    logError(new Error(`seedAnalyticsFromSnapshot failed: ${err?.message || err}`));
  }
};

// ─── Push: build + POST the snapshot ─────────────────────────────────────────
// The app stores reminder times as "h:mm A"; the contract wants 24h "HH:mm".
const to24h = (t) => {
  const m = String(t || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})\s*([ap]m)?$/i);
  if (!m) return t;
  let hr = Number(m[1]);
  const meridiem = m[3] ? m[3].toLowerCase() : "";
  if (meridiem === "pm" && hr < 12) hr += 12;
  if (meridiem === "am" && hr === 12) hr = 0;
  return `${String(hr).padStart(2, "0")}:${m[2]}`;
};

// Builds the POST /dashboard/cache body from Redux state + analytics. version and
// deviceId are passed in (gathered via react-native-device-info at the call site) so
// this stays unit-testable without native modules.
export const buildCachePayload = async ({ state, version, deviceId, userId = null }) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  const [summary, monthRows, topRead, topListen, recentRead, recentListen, allTimeTotals] =
    await Promise.all([
      getOrCreateSummary(),
      getDailyActivity(year, month),
      getTopReadBanis(5),
      getTopListenedBanis(5),
      getRecentReadBanis(1),
      getRecentListenedBanis(1),
      // Restore baseline (set once at restore) + live (this install only) — so
      // "all time" survives a reinstall instead of resetting to whatever this
      // install alone has recorded since.
      getAllTimeTotals(),
    ]);

  const days = (monthRows || []).map((r) => [
    Number(String(r.date).slice(8, 10)),
    r.reading_seconds ?? 0,
    r.listening_seconds ?? 0,
  ]);

  let reminderItems = [];
  try {
    const parsed = state.reminderBanis ? JSON.parse(state.reminderBanis) : [];
    reminderItems = parsed.map((it) => ({
      baaniId: it.id,
      time: to24h(it.time),
      enabled: !!it.enabled,
    }));
  } catch (_) {
    reminderItems = [];
  }

  // Keep only the most recent ~60 days of completion history.
  const completed = state.todaysNitnem?.completed || {};
  const trimmedCompleted = {};
  Object.keys(completed)
    .sort()
    .slice(-60)
    .forEach((d) => {
      trimmedCompleted[d] = completed[d];
    });

  // All-time count of days with at least one nitnem completion recorded. (Not
  // "days the full nitnem was completed" — that requires knowing how many
  // banis were selected on each past day, which isn't tracked, so comparing
  // against today's selection count made this silently read 0 for anyone
  // whose selection has changed size over time, even with real completions
  // on record.)
  const nitnemCompletedCount = Object.values(completed).filter(
    (doneIds) => Array.isArray(doneIds) && doneIds.length > 0
  ).length;

  const lastRead = recentRead?.[0];
  const lastListen = recentListen?.[0];

  const payload = {
    lastVisitedBaaniId: state.currentBani?.id ?? null,
    streaks: { current: summary?.current_streak ?? 0, longest: summary?.longest_streak ?? 0 },
    month: { key: monthKey, days },
    read: {
      // [baaniId, sessionCount, totalReadingSeconds]
      top5: (topRead || []).map((r) => [r.bani_id, r.session_count ?? 0, r.total_seconds ?? 0]),
      last: lastRead ? { baaniId: lastRead.bani_id } : null,
    },
    listen: {
      // [baaniId, sessionCount, totalListeningSeconds]
      top5: (topListen || []).map((r) => [r.bani_id, r.session_count ?? 0, r.total_seconds ?? 0]),
      last: lastListen ? { baaniId: lastListen.bani_id } : null,
    },
    totals: {
      banisCompleted: allTimeTotals.banisCompleted,
      readingSeconds: allTimeTotals.readingSeconds,
      listeningSeconds: allTimeTotals.listeningSeconds,
      daysActive: summary?.total_days_active ?? 0,
      audioSessions: allTimeTotals.audioSessions,
    },
    nitnem: {
      selectedBaaniIds: state.todaysNitnem?.selectedBaniIds ?? [],
      completed: trimmedCompleted,
      completedCount: nitnemCompletedCount,
    },
    profile: { name: state.userProfile?.name ?? "" },
    reminders: {
      enabled: !!state.isReminders,
      sound: state.reminderSound || "",
      items: reminderItems,
    },
    layout: {
      order: state.dashboardLayout?.order ?? [],
      hidden: state.dashboardLayout?.hidden ?? [],
    },
  };

  return { version, capturedAt: now.toISOString(), deviceId, userId, payload };
};

// POSTs a cache body (public, no auth). 201 on the day's first sync, 200 {updated:true}
// on a same-day re-sync (last-write-wins). deviceId in the body is the only key.
export const pushDashboardCache = async (body) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(syncUrl(), {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { ok: true, data: await res.json() };
  } finally {
    clearTimeout(timeoutId);
  }
};

export default getDashboardLatest;
