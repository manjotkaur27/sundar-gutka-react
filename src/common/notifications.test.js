import { Platform } from "react-native";
import notifee, { AndroidNotificationSetting } from "@notifee/react-native";
import { canScheduleExactAlarms, iosSoundName, rearmReminders, updateReminders } from "./notifications";

// Reminders silently never fired: on Android 12+ the exact-alarm permission is
// not granted on install, and without it `createTriggerNotification` schedules
// nothing AND throws nothing. `dumpsys alarm` showed zero alarms registered
// while the app's own Settings screen showed reminders as on.
//
// These pin the two halves of the fix — that we ask first, and that we report
// back when the answer is no — because neither is visible from the UI.

jest.mock("@notifee/react-native", () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn().mockResolvedValue("ch"),
    createTriggerNotification: jest.fn().mockResolvedValue(undefined),
    cancelAllNotifications: jest.fn().mockResolvedValue(undefined),
    cancelTriggerNotifications: jest.fn().mockResolvedValue(undefined),
    setBadgeCount: jest.fn().mockResolvedValue(undefined),
    getNotificationSettings: jest.fn(),
  },
  TriggerType: { TIMESTAMP: 0 },
  RepeatFrequency: { DAILY: 1 },
  AndroidImportance: { HIGH: 4 },
  AndroidNotificationSetting: { ENABLED: 1, DISABLED: 0 },
  AuthorizationStatus: { AUTHORIZED: 1 },
}));

jest.mock("./components", () => ({ FallBack: jest.fn() }));
jest.mock("./firebase/crashlytics", () => ({ logError: jest.fn(), logMessage: jest.fn() }));

const reminder = (over = {}) => ({
  key: 1,
  id: 1,
  gurmukhi: "g",
  translit: "t",
  enabled: true,
  title: "Time for Japji",
  time: "5:30 AM",
  ...over,
});

const listOf = (...items) => JSON.stringify(items);

const allowAlarms = (allowed) =>
  notifee.getNotificationSettings.mockResolvedValue({
    android: {
      alarm: allowed ? AndroidNotificationSetting.ENABLED : AndroidNotificationSetting.DISABLED,
    },
  });

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = "android";
});

describe("exact-alarm permission gate", () => {
  it("reports blocked and schedules NOTHING when the OS has not granted it", async () => {
    allowAlarms(false);
    const result = await updateReminders(true, "default", listOf(reminder()));

    expect(result).toEqual({ scheduled: 0, blocked: true });
    // The whole point: no silent partial success.
    expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
  });

  it("schedules every enabled reminder once granted", async () => {
    allowAlarms(true);
    const result = await updateReminders(
      true,
      "default",
      listOf(reminder(), reminder({ key: 2, time: "6:00 PM" }))
    );

    expect(result).toEqual({ scheduled: 2, blocked: false });
    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(2);
  });

  it("skips disabled reminders", async () => {
    allowAlarms(true);
    const result = await updateReminders(
      true,
      "default",
      listOf(reminder(), reminder({ key: 2, enabled: false }))
    );

    expect(result.scheduled).toBe(1);
    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(1);
  });

  it("does not send the user to a permission screen when there is nothing to schedule", async () => {
    allowAlarms(false);
    const result = await updateReminders(true, "default", listOf(reminder({ enabled: false })));

    expect(result).toEqual({ scheduled: 0, blocked: false });
  });

  it("clears the schedule when reminders are switched off, without prompting", async () => {
    allowAlarms(false);
    const result = await updateReminders(false, "default", listOf(reminder()));

    expect(result).toEqual({ scheduled: 0, blocked: false });
    expect(notifee.cancelAllNotifications).toHaveBeenCalled();
    expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
  });

  it("is an Android-only concept — iOS never blocks", async () => {
    Platform.OS = "ios";
    // Deliberately the DISABLED answer: iOS has no exact-alarm permission, so
    // reading one must not gate scheduling there.
    allowAlarms(false);

    expect(await canScheduleExactAlarms()).toBe(true);
    const result = await updateReminders(true, "default", listOf(reminder()));
    expect(result).toEqual({ scheduled: 1, blocked: false });
  });

  it("assumes permitted if the settings read itself fails", async () => {
    notifee.getNotificationSettings.mockRejectedValue(new Error("bridge died"));
    // Better to try and fail than to block reminders on a broken read.
    expect(await canScheduleExactAlarms()).toBe(true);
  });
});

describe("the scheduled trigger", () => {
  beforeEach(() => allowAlarms(true));

  it("fires daily, and while the device is dozing", async () => {
    await updateReminders(true, "default", listOf(reminder()));

    const [, trigger] = notifee.createTriggerNotification.mock.calls[0];
    expect(trigger.repeatFrequency).toBe(1); // DAILY
    // Without allowWhileIdle an early-morning Nitnem reminder lands whenever
    // the phone next wakes up, which is useless for its purpose.
    expect(trigger.alarmManager).toEqual({ allowWhileIdle: true });
  });

  it("rolls a time that has already passed today on to tomorrow", async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 15, 12, 0, 0));
    await updateReminders(true, "default", listOf(reminder({ time: "5:30 AM" })));

    const [, trigger] = notifee.createTriggerNotification.mock.calls[0];
    expect(new Date(trigger.timestamp).getDate()).toBe(16);
    jest.useRealTimers();
  });

  it("posts to a channel that was actually created", async () => {
    await updateReminders(true, "default", listOf(reminder()));

    const created = notifee.createChannel.mock.calls.map(([ch]) => ch.id);
    const [notification] = notifee.createTriggerNotification.mock.calls[0];
    // A notification posted to a channel id that does not exist is dropped by
    // Android without an error, so this pairing has to hold.
    expect(created).toContain(notification.android.channelId);
  });

  it("uses the matching sound channel when a custom sound is chosen", async () => {
    await updateReminders(true, "waheguru_soul.mp3", listOf(reminder()));

    const created = notifee.createChannel.mock.calls.map(([ch]) => ch.id);
    const [notification] = notifee.createTriggerNotification.mock.calls[0];
    expect(notification.android.channelId).toBe("waheguru_soul");
    expect(created).toContain("waheguru_soul");
    // iOS cannot play mp3 — it gets the .caf name instead.
    expect(notification.ios.sound).toBe("waheguru_soul.caf");
  });
});

describe("iOS sound names", () => {
  // iOS silently plays the DEFAULT tone for an unsupported format rather than
  // erroring, so a wrong extension here is invisible until someone notices the
  // custom sound never plays on an iPhone.
  it("swaps the Android mp3 for the iOS caf", () => {
    expect(iosSoundName("waheguru_soul.mp3")).toBe("waheguru_soul.caf");
    expect(iosSoundName("wake_up_jap.mp3")).toBe("wake_up_jap.caf");
  });

  it("leaves the system default alone", () => {
    expect(iosSoundName("default")).toBe("default");
    expect(iosSoundName("")).toBe("default");
    expect(iosSoundName(undefined)).toBe("default");
  });
});

describe("re-arming on app foreground", () => {
  // RepeatFrequency.DAILY is reported not to repeat on Android (notifee #601,
  // closed stale, repo archived). Re-arming on every launch is the safety net.
  beforeEach(() => allowAlarms(true));

  it("rewrites the pending triggers", async () => {
    const n = await rearmReminders("default", listOf(reminder(), reminder({ key: 2 })));
    expect(n).toBe(2);
    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(2);
  });

  it("cancels only TRIGGERS, never what is already on screen", async () => {
    await rearmReminders("default", listOf(reminder()));
    expect(notifee.cancelTriggerNotifications).toHaveBeenCalled();
    // cancelAllNotifications would dismiss the reminder the user is reading.
    expect(notifee.cancelAllNotifications).not.toHaveBeenCalled();
  });

  it("is silent when exact alarms are not permitted", async () => {
    allowAlarms(false);
    expect(await rearmReminders("default", listOf(reminder()))).toBe(0);
    expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
  });

  it("survives corrupt stored reminders", async () => {
    expect(await rearmReminders("default", "{not json")).toBe(0);
  });
});
