import { Platform } from "react-native";
import notifee, {
  TriggerType,
  RepeatFrequency,
  AndroidImportance,
  AndroidNotificationSetting,
  AuthorizationStatus,
} from "@notifee/react-native";
import { FallBack } from "./components";
import constant from "./constant";
import { logError, logMessage } from "./firebase/crashlytics";

/**
 * Whether the OS will let us schedule a reminder at an exact time.
 *
 * ANDROID 12+ ONLY. `SCHEDULE_EXACT_ALARM` is declared (notifee merges it into
 * the manifest) but, for an app targeting SDK 33 or higher on Android 14+, it
 * is NOT granted on install — the user has to turn "Alarms & reminders" on
 * themselves. Until they do, `createTriggerNotification` does not schedule
 * anything and does not throw, so every reminder silently never fires.
 *
 * That was the bug: `dumpsys alarm` showed ZERO alarms registered for the app
 * while reminders appeared switched on in Settings.
 *
 * iOS has no equivalent — a scheduled UNNotificationRequest needs only the
 * notification permission — so this is true there and the caller carries on.
 *
 * @see https://notifee.app/react-native/docs/triggers
 * @see https://developer.android.com/about/versions/14/changes/schedule-exact-alarms
 */
export const canScheduleExactAlarms = async () => {
  if (Platform.OS !== "android") return true;
  try {
    const settings = await notifee.getNotificationSettings();
    return settings.android?.alarm === AndroidNotificationSetting.ENABLED;
  } catch (error) {
    logError(error);
    // Assume we can, and let the scheduling attempt be the judge — better to
    // try and fail than to block reminders because a settings read broke.
    return true;
  }
};

/** Opens the system "Alarms & reminders" screen. Android-only; a no-op on iOS. */
export const openExactAlarmSettings = async () => {
  if (Platform.OS !== "android") return;
  try {
    await notifee.openAlarmPermissionSettings();
  } catch (error) {
    logError(error);
  }
};

/**
 * Parse a time string like "h:m A" (e.g. "9:30 AM") into a future timestamp (ms).
 * Uses native Date instead of moment.js to avoid bundling that large library (~270 KB).
 */
const parseTimeString = (timeStr) => {
  const [timePart, meridiem] = timeStr.trim().split(" ");
  const [hoursRaw, minutes] = timePart.split(":").map(Number);
  let hours = hoursRaw % 12;
  if (meridiem && meridiem.toUpperCase() === "PM") hours += 12;
  const now = new Date();
  const result = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
  return result.getTime();
};

/**
 * The reminder sound as iOS wants it.
 *
 * iOS DOES NOT SUPPORT MP3 for notification sounds. `UNNotificationSound`
 * accepts Linear PCM / MA4 / µLaw / aLaw in an aiff, wav or caf container, and
 * notifee's own iOS docs list the same three. Hand it an `.mp3` and it does not
 * error — it silently plays the DEFAULT tone, which is why the custom reminder
 * sound appears to be ignored on iPhone while working on Android.
 *
 * The app ships `waheguru_soul.mp3` / `wake_up_jap.mp3`, used as-is on Android
 * (where mp3 in `res/raw` is fine) and swapped to `.caf` here. THE .caf FILES
 * MUST BE ADDED TO THE iOS BUNDLE for this to do anything — until they are,
 * iOS falls back to the default tone exactly as it does today, so this is safe
 * to ship ahead of them. To generate, on a Mac:
 *
 *   afconvert -d LEI16 -f caff -c 1 waheguru_soul.mp3 waheguru_soul.caf
 *
 * then add both to the Xcode target's Copy Bundle Resources.
 *
 * @see https://notifee.app/react-native/docs/ios/behaviour
 */
export const iosSoundName = (sound) => {
  if (!sound || sound === constant.DEFAULT.toLowerCase()) return "default";
  return sound.replace(/\.[^.]+$/, ".caf");
};

export const createReminder = async (notification, sound) => {
  const channelName =
    sound !== constant.DEFAULT.toLowerCase() ? sound.split(".")[0] : constant.SOUND.toLowerCase();
  const androidChannel = {
    channelId: channelName,
    smallIcon: "ic_launcher_foreground",
    pressAction: {
      id: "default",
      launchActivity: "default", // This should match your configured activity
      mainComponent: "default", // Ensure your activity is correctly referenced
    },
  };

  const currentTime = Date.now();
  let notificationTime = parseTimeString(notification.time);
  if (notificationTime < currentTime) {
    notificationTime += 24 * 60 * 60 * 1000; // add one day in milliseconds
  }
  const trigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: notificationTime,
    repeatFrequency: RepeatFrequency.DAILY,
    // Fire even when the device has dozed off. Without this a reminder set for
    // an early hour lands whenever the phone next wakes up, which for a Nitnem
    // reminder is the difference between useful and pointless. Android-only
    // key; notifee ignores it on iOS.
    alarmManager: { allowWhileIdle: true },
  };

  try {
    // Create notification
    await notifee.createTriggerNotification(
      {
        title: notification.title,
        body: notification.time,
        data: {
          id: notification.id.toString(),
          gurmukhi: notification.gurmukhi,
          translit: String(notification.translit) || "",
        },
        android: androidChannel,
        ios: {
          badgeCount: 1,
          // Not `sound` — iOS cannot play the .mp3 the Android channel uses.
          sound: iosSoundName(sound),
        },
      },
      trigger
    );
  } catch (error) {
    logError(error);
    logMessage("createReminder: Failed to create reminder");
    FallBack();
  }
};

/**
 * Rewrites the pending schedule without disturbing anything already on screen.
 *
 * `updateReminders` calls `cancelAllNotifications()`, which clears DELIVERED
 * notifications as well as pending triggers. That is right when the user has
 * just changed a setting, but wrong for the periodic re-arm: it would wipe the
 * reminder currently sitting in the shade before the user had read it. This
 * cancels only the TRIGGERS.
 *
 * Silent by design — it runs on app launch, where a permission prompt would be
 * ambush. If exact alarms are not permitted it simply does nothing; the
 * Settings screen is where the user is asked.
 *
 * @returns {Promise<number>} how many reminders were re-armed.
 */
export const rearmReminders = async (sound, remindersList) => {
  if (!(await canScheduleExactAlarms())) return 0;

  let reminders;
  try {
    reminders = JSON.parse(remindersList).filter((item) => item.enabled);
  } catch (error) {
    logError(error);
    return 0;
  }
  if (reminders.length === 0) return 0;

  await notifee.cancelTriggerNotifications();
  await Promise.all(reminders.map((reminder) => createReminder(reminder, sound)));
  return reminders.length;
};

export const resetBadgeCount = async () => {
  await notifee.setBadgeCount(0);
};

// NET-04: Return the scheduled notification IDs so callers can use them
export const getScheduleNotifications = async () => {
  return notifee.getTriggerNotificationIds();
};

export const removeAllDeliveredNotifications = async () => {
  resetBadgeCount();
  await notifee.cancelDisplayedNotification();
};

export const cancelAllReminders = async () => {
  resetBadgeCount();
  await notifee.cancelAllNotifications();
};

export const updateReminders = async (remindersOn, sound, remindersList) => {
  await cancelAllReminders();
  const channels = [
    {
      id: constant.SOUND,
      name: constant.REMINDERS_DEFAULT,
      sound: constant.DEFAULT.toLowerCase(),
    },
    {
      id: constant.WAHEGURU_SOUL,
      name: constant.REMINDERS_WAHEGURU_SOUL,
      sound: constant.WAHEGURU_SOUL,
    },
    {
      id: constant.WAKE_UP_JAP,
      name: constant.REMINDERS_WAKE_UP,
      sound: constant.WAKE_UP_JAP,
    },
  ];

  const channelCreationPromises = channels.map((channel) =>
    notifee.createChannel({
      id: channel.id,
      name: channel.name,
      sound: channel.sound,
      description: constant.ALERT_DESCRIPTION,
      importance: AndroidImportance.HIGH,
    })
  );

  await Promise.all(channelCreationPromises);

  if (!remindersOn) return { scheduled: 0, blocked: false };

  const array = JSON.parse(remindersList);
  const reminders = array.filter((item) => item.enabled); // Filter only enabled reminders

  // Nothing to schedule — don't send the user to a permission screen for it.
  if (reminders.length === 0) return { scheduled: 0, blocked: false };

  // Ask BEFORE scheduling. Without the exact-alarm permission every
  // createTriggerNotification below is a silent no-op, so the app would report
  // reminders as on while the OS had none registered.
  if (!(await canScheduleExactAlarms())) {
    logMessage("updateReminders: exact alarms not permitted; nothing scheduled");
    return { scheduled: 0, blocked: true };
  }

  await Promise.all(reminders.map((reminder) => createReminder(reminder, sound)));
  return { scheduled: reminders.length, blocked: false };
};

// Explicitly prompt for notification permission (Android 13+ POST_NOTIFICATIONS /
// iOS alert). Used before the first download so the foreground-service download
// notification is actually visible instead of silently denied.
export const requestNotificationPermission = async () => {
  try {
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
  } catch (_) {
    return false;
  }
};

/**
 * Whether the app may post notifications.
 *
 * Reads the CURRENT state and only prompts when it has to. Both parts matter —
 * this function had two separate ways of hanging forever, and each one made the
 * Reminders switch impossible to turn on:
 *
 *  1. It began by awaiting
 *     `PermissionsAndroid.check("BROADCAST_CLOSE_SYSTEM_DIALOGS")`. That
 *     permission is signature-level and is NOT declared in this app's manifest,
 *     and its result was only ever used to write a log line — it never affected
 *     the return value. The check never settled.
 *
 *  2. With that removed, `notifee.requestPermission()` then hung on its own.
 *     It does not resolve on Android 13+ when the permission is ALREADY
 *     granted (invertase/notifee#609, #1237), which is the normal case for any
 *     returning user. `getNotificationSettings()` is a plain read and always
 *     resolves, so the prompt is now reached only when genuinely needed.
 *
 * Both were verified on device: `handleReminders` logged on every tap while the
 * line after this call never did, first stopping at (1) and then at (2).
 * Turning reminders OFF always worked because that path returns before here.
 */
export const checkPermissions = async () => {
  const current = await notifee.getNotificationSettings();
  if (current.authorizationStatus >= AuthorizationStatus.AUTHORIZED) return true;
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
};

// FEAT-04: Use ic_launcher_foreground (not background_splash) for the correct Android notification icon
export const displayNotification = async () => {
  await notifee.displayNotification({
    title: "Test Notification",
    body: "This is a test notification.",
    android: { channelId: constant.SOUND, smallIcon: "ic_launcher_foreground" },
  });
};
