import AsyncStorage from "@react-native-async-storage/async-storage";

// Date-aware (device-local) 24h cache for once-a-day dashboard content
// (Today's Vaak, Word of the Day). A cached entry is considered "fresh" only
// while the device-local calendar date matches the date it was written on, so
// the content rolls over at local midnight and survives going offline within
// the same day. We key by local date (not a raw timestamp) so timezone changes
// resolve correctly — what the user sees is "today" in their own timezone.

export const localDateStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(
    2,
    "0"
  )}`;

// Returns the cached payload only if it was written for `dateKey` (defaults to
// today in device-local time). Callers that key on a specific timezone (e.g. the
// vaak, which rolls over in IST) pass their own date string.
export const readFreshCache = async (key, dateKey = localDateStr()) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.date === dateKey ? parsed.data : null;
  } catch (_) {
    return null;
  }
};

// Returns the cached entry { date, data } regardless of age (caller decides).
export const readAnyCache = async (key) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
};

export const writeCache = async (key, data, dateKey = localDateStr()) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ date: dateKey, data }));
  } catch (_) {
    // Non-fatal — cache is best-effort.
  }
};
