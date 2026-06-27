import { constant, actions, updateReminders, logError } from "@common";
import {
  getOrCreateSummary,
  getDailyActivity,
  getTopReadBanis,
  getTopListenedBanis,
  getRecentReadBanis,
  getRecentListenedBanis,
  getCompletedBanisCount,
  getReadingListeningTotals,
  upsertDailyActivity,
  updateSummary,
} from "../../database/analytics";

// Cross-device dashboard sync (KHALIS_API.md §3): push (POST /dashboard/cache) and
// restore (GET /dashboard/latest). Restore applies the user-setup blocks (profile,
// layout, nitnem, reminders) into Redux and seeds analytics SQLite from the snapshot.
//
// Auth: both endpoints require a Bearer JWT. Pass { token } from getAuthToken(); the
// sync stays dormant (no-op) while that returns null (no SSO yet).

const latestUrl = () =>
  constant.DASHBOARD_LATEST_API_URL || `${constant.DASHBOARD_API_BASE_URL || ""}/dashboard/latest`;
const syncUrl = () =>
  constant.DASHBOARD_SYNC_API_URL || `${constant.DASHBOARD_API_BASE_URL || ""}/dashboard/cache`;

const fetchLatest = async (token) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(latestUrl(), {
      signal: controller.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (res.status === 404) return { notFound: true };
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { data: await res.json() };
  } finally {
    clearTimeout(timeoutId);
  }
};

// Returns the snapshot `payload` (KHALIS shape), or null for a fresh account (404).
export const getDashboardLatest = async ({ token } = {}) => {
  const { notFound, data } = await fetchLatest(token);
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
export const applyDashboardRestore = async (payload, dispatch, { reschedule = false } = {}) => {
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
    const items = payload.reminders.items.map((it) => ({
      key: it.baaniId,
      id: it.baaniId,
      enabled: !!it.enabled,
      time: to12h(it.time),
      gurmukhi: "",
      translit: "",
      title: "",
    }));
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

// ─── Restore: seed analytics SQLite from the snapshot ────────────────────────
// Intended for a fresh install (empty analytics) — the restore-once flag prevents
// re-running, so upsertDailyActivity's additive semantics don't double-count.
export const seedAnalyticsFromSnapshot = async (payload) => {
  if (!payload) return;
  try {
    const { month, streaks, totals } = payload;
    if (month?.key && Array.isArray(month.days)) {
      await Promise.all(
        month.days.map(([day, r = 0, l = 0]) =>
          upsertDailyActivity({
            date: `${month.key}-${String(day).padStart(2, "0")}`,
            reading_seconds_delta: r,
            listening_seconds_delta: l,
          })
        )
      );
    }
    const fields = {};
    if (streaks?.current != null) fields.current_streak = streaks.current;
    if (streaks?.longest != null) fields.longest_streak = streaks.longest;
    if (totals?.daysActive != null) fields.total_days_active = totals.daysActive;
    if (totals?.readingSeconds != null) fields.total_reading_seconds = totals.readingSeconds;
    if (totals?.listeningSeconds != null) fields.total_listening_seconds = totals.listeningSeconds;
    if (totals?.audioSessions != null) fields.total_audio_sessions = totals.audioSessions;
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

  const [summary, monthRows, topRead, topListen, recentRead, recentListen, banisCompleted, totals] =
    await Promise.all([
      getOrCreateSummary(),
      getDailyActivity(year, month),
      getTopReadBanis(5),
      getTopListenedBanis(5),
      getRecentReadBanis(1),
      getRecentListenedBanis(1),
      getCompletedBanisCount(),
      getReadingListeningTotals(),
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

  const lastRead = recentRead?.[0];
  const lastListen = recentListen?.[0];

  const payload = {
    lastVisitedBaaniId: state.currentBani?.id ?? null,
    streaks: { current: summary?.current_streak ?? 0, longest: summary?.longest_streak ?? 0 },
    month: { key: monthKey, days },
    read: {
      top5: (topRead || []).map((r) => [r.bani_id, r.session_count ?? 0]),
      last: lastRead ? { baaniId: lastRead.bani_id } : null,
    },
    listen: {
      top5: (topListen || []).map((r) => [r.bani_id, r.session_count ?? 0]),
      last: lastListen ? { baaniId: lastListen.bani_id } : null,
    },
    totals: {
      banisCompleted: banisCompleted ?? 0,
      readingSeconds: totals?.total_reading_seconds ?? 0,
      listeningSeconds: totals?.total_listening_seconds ?? 0,
      daysActive: summary?.total_days_active ?? 0,
      audioSessions: summary?.total_audio_sessions ?? 0,
    },
    nitnem: {
      selectedBaaniIds: state.todaysNitnem?.selectedBaniIds ?? [],
      completed: trimmedCompleted,
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

// POSTs a cache body. No-op (returns { skipped: true }) without a token, so the
// whole sync stays dormant until SSO is live.
export const pushDashboardCache = async (body, token) => {
  if (!token) return { skipped: true };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(syncUrl(), {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { ok: true, data: await res.json() };
  } finally {
    clearTimeout(timeoutId);
  }
};

export default getDashboardLatest;
