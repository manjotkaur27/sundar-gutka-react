import { constant, actions, updateReminders, logError } from "@common";

// Cross-device restore for the dashboard (KHALIS_API.md §3 → GET /dashboard/latest).
// Fetches the latest snapshot and applies the user-setup blocks (profile, layout,
// nitnem, reminders) back into Redux. The analytics blocks (streaks/totals/month)
// are returned for the caller to seed SQLite if it's a fresh install.
//
// Auth: the contract requires a Bearer JWT. Pass { token } once SSO is live; with
// the backend's DEV_AUTH_BYPASS on, the call works without one.

const latestUrl = () => `${constant.DASHBOARD_API_BASE_URL || ""}/dashboard/latest`;

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

export default getDashboardLatest;
