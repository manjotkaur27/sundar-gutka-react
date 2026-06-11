import { logError, constant } from "@common";
import { getDayActivity, getOrCreateSummary, updateSummary } from "../database/analytics";

// Returns YYYY-MM-DD in the device's local timezone
const getLocalDate = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// Returns the number of calendar days between two YYYY-MM-DD strings (a - b)
const diffDays = (a, b) => {
  if (!a || !b) return Infinity;
  const msPerDay = 86400000;
  return Math.round((new Date(a) - new Date(b)) / msPerDay);
};

const dayQualifies = (row) => {
  if (!row) return false;
  return (
    (row.reading_seconds ?? 0) >= constant.MIN_READ_SESSION_SECONDS ||
    (row.listening_seconds ?? 0) >= constant.MIN_LISTEN_SESSION_SECONDS
  );
};

export const computeStreaks = async () => {
  try {
    const today = getLocalDate();
    const summary = await getOrCreateSummary();
    if (!summary) return;

    const { current_streak, longest_streak, total_days_active, last_active_date } = summary;

    // Already processed today and today already qualifies — nothing to recalculate
    if (last_active_date === today) return;

    const dayGap = diffDays(today, last_active_date);

    // If user missed more than 1 day, the streak is broken regardless of today
    const streakBroken = dayGap > 1;

    // Check whether today already has qualifying activity
    // (user may have read before the app went to background and returned)
    const todayRow = await getDayActivity(today);
    const todayQualifies = dayQualifies(todayRow);

    let newStreak = streakBroken ? 0 : current_streak;
    let newTotalDaysActive = total_days_active ?? 0;
    let newLastActive = last_active_date;

    if (todayQualifies) {
      // Extend streak from yesterday (gap=1) or start fresh (gap>1 or first ever)
      newStreak = dayGap === 1 ? newStreak + 1 : 1;
      newLastActive = today;
      // Only count a new active day if this date wasn't already the last active
      if (last_active_date !== today) {
        newTotalDaysActive += 1;
      }
    }

    const newLongest = Math.max(newStreak, longest_streak ?? 0);

    const fields = {
      current_streak: newStreak,
      longest_streak: newLongest,
      total_days_active: newTotalDaysActive,
      last_active_date: newLastActive,
    };

    await updateSummary(fields);
  } catch (err) {
    logError(new Error(`computeStreaks failed: ${err?.message || err}`));
  }
};
