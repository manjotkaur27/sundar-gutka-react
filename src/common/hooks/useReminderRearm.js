import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useSelector } from "react-redux";
import { logError } from "../firebase/crashlytics";
import { rearmReminders } from "../notifications";

/**
 * Re-arms the reminder schedule whenever the app comes to the foreground.
 *
 * WHY THIS EXISTS. `RepeatFrequency.DAILY` is reported not to repeat on Android:
 * the notification fires on the day it was set and never again. The issue was
 * closed as stale and the notifee repository was archived in April 2026, so no
 * fix is coming from the library.
 *   https://github.com/invertase/notifee/issues/601
 *
 * Rewriting the schedule on every foreground means the worst case is that a
 * reminder is one launch stale, rather than silently dead after day one. It is a
 * safety net, not a substitute for the repeat — if the repeat works, this is a
 * cheap no-op that rewrites the same times.
 *
 * The obvious hole: a user who never opens the app never re-arms. Nothing in the
 * JS layer can close that, and it is exactly why this is worth flagging rather
 * than quietly relying on.
 *
 * DELIVERED notifications are deliberately left alone — see `rearmReminders`.
 */
const useReminderRearm = () => {
  const isReminders = useSelector((state) => state.isReminders);
  const reminderSound = useSelector((state) => state.reminderSound);
  const reminderBanis = useSelector((state) => state.reminderBanis);

  // Read through a ref so the AppState listener is attached once rather than
  // being torn down and rebuilt every time a reminder is edited.
  const latest = useRef({ isReminders, reminderSound, reminderBanis });
  latest.current = { isReminders, reminderSound, reminderBanis };

  useEffect(() => {
    const run = () => {
      const { isReminders: on, reminderSound: sound, reminderBanis: list } = latest.current;
      if (!on || !list) return;
      rearmReminders(sound, list).catch(logError);
    };

    // Once on mount (cold start), then on every return to the foreground.
    run();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") run();
    });
    return () => sub.remove();
  }, []);
};

export default useReminderRearm;
