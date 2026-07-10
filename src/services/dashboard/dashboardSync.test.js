/* eslint-env jest */
/**
 * Tests for cross-device restore (GET /dashboard/latest):
 *  - getDashboardLatest: 404 → null, 200 → payload, error → throws
 *  - applyDashboardRestore: dispatches the right Redux actions, converts 24h
 *    reminder times to "h:mm A", and only reschedules when asked.
 */

import * as analytics from "../../database/analytics";
import {
  getDashboardLatest,
  applyDashboardRestore,
  seedAnalyticsFromSnapshot,
  buildCachePayload,
} from "./dashboardSync";

const mockUpdateReminders = jest.fn();

jest.mock("@common", () => ({
  constant: {
    DASHBOARD_API_BASE_URL: "http://api.test",
    DASHBOARD_LATEST_API_URL: "http://api.test/dashboard/latest",
    DASHBOARD_SYNC_API_URL: "http://api.test/dashboard/cache",
  },
  logError: jest.fn(),
  updateReminders: (...a) => mockUpdateReminders(...a),
  actions: {
    setUserProfile: (value) => ({ type: "SET_USER_PROFILE", value }),
    setDashboardLayout: (value) => ({ type: "SET_DASHBOARD_LAYOUT", value }),
    restoreNitnem: (value) => ({ type: "RESTORE_NITNEM", value }),
    setReminderBanis: (value) => ({ type: "SET_REMINDER_BANIS", value }),
    toggleReminders: (value) => ({ type: "TOGGLE_REMINDERS", value }),
    setReminderSound: (value) => ({ type: "SET_REMINDER_SOUND", value }),
  },
}));

jest.mock("../../database/analytics", () => ({
  getOrCreateSummary: jest.fn(),
  getDailyActivity: jest.fn(),
  getTopReadBanis: jest.fn(),
  getTopListenedBanis: jest.fn(),
  getRecentReadBanis: jest.fn(),
  getRecentListenedBanis: jest.fn(),
  getAllTimeTotals: jest.fn(),
  setDailyActivity: jest.fn(),
  updateSummary: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

const samplePayload = {
  profile: { name: "Harpreet Kaur" },
  layout: { order: ["streak", "nitnem"], hidden: ["weekChart"] },
  nitnem: { selectedBaaniIds: [2, 3, 4], completed: { "2025-06-11": [2] } },
  reminders: {
    enabled: true,
    sound: "default",
    items: [
      { baaniId: 2, time: "03:30", enabled: true },
      { baaniId: 21, time: "18:00", enabled: false },
    ],
  },
};

describe("getDashboardLatest", () => {
  it("returns null on 404 (fresh account)", async () => {
    global.fetch = jest.fn().mockResolvedValue({ status: 404, ok: false });
    await expect(getDashboardLatest()).resolves.toBeNull();
  });

  it("returns the payload on 200", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ status: 200, ok: true, json: async () => ({ payload: samplePayload }) });
    const payload = await getDashboardLatest();
    expect(payload.profile.name).toBe("Harpreet Kaur");
  });

  it("throws on a non-404 error status", async () => {
    global.fetch = jest.fn().mockResolvedValue({ status: 500, ok: false });
    await expect(getDashboardLatest()).rejects.toThrow();
  });
});

describe("applyDashboardRestore", () => {
  it("dispatches profile, layout and nitnem restores", async () => {
    const dispatch = jest.fn();
    const applied = await applyDashboardRestore(samplePayload, dispatch);

    expect(applied).toEqual(expect.arrayContaining(["profile", "layout", "nitnem", "reminders"]));

    const types = dispatch.mock.calls.map((c) => c[0].type);
    expect(types).toEqual(
      expect.arrayContaining([
        "SET_USER_PROFILE",
        "SET_DASHBOARD_LAYOUT",
        "RESTORE_NITNEM",
        "SET_REMINDER_BANIS",
        "TOGGLE_REMINDERS",
      ])
    );

    const nitnem = dispatch.mock.calls.find((c) => c[0].type === "RESTORE_NITNEM")[0].value;
    expect(nitnem.selectedBaniIds).toEqual([2, 3, 4]);
    expect(nitnem.completed).toEqual({ "2025-06-11": [2] });
  });

  it("converts 24h reminder times to h:mm A", async () => {
    const dispatch = jest.fn();
    await applyDashboardRestore(samplePayload, dispatch);
    const json = dispatch.mock.calls.find((c) => c[0].type === "SET_REMINDER_BANIS")[0].value;
    const items = JSON.parse(json);
    expect(items[0].time).toBe("3:30 AM");
    expect(items[1].time).toBe("6:00 PM");
  });

  it("does not reschedule by default, but does when asked", async () => {
    const dispatch = jest.fn();
    await applyDashboardRestore(samplePayload, dispatch);
    expect(mockUpdateReminders).not.toHaveBeenCalled();

    await applyDashboardRestore(samplePayload, dispatch, { reschedule: true });
    expect(mockUpdateReminders).toHaveBeenCalledTimes(1);
  });

  it("is a no-op for a null payload (fresh account)", async () => {
    const dispatch = jest.fn();
    const applied = await applyDashboardRestore(null, dispatch);
    expect(applied).toEqual([]);
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe("seedAnalyticsFromSnapshot", () => {
  it("seeds daily_activity per day (overwrite) and writes the summary, including last_active_date", async () => {
    await seedAnalyticsFromSnapshot({
      month: {
        key: "2025-06",
        days: [
          [1, 120, 0],
          [5, 0, 300],
        ],
      },
      streaks: { current: 14, longest: 31 },
      totals: {
        daysActive: 88,
        readingSeconds: 360000,
        listeningSeconds: 250000,
        audioSessions: 300,
        banisCompleted: 540,
      },
    });

    expect(analytics.setDailyActivity).toHaveBeenCalledTimes(2);
    expect(analytics.setDailyActivity).toHaveBeenCalledWith({
      date: "2025-06-01",
      reading_seconds: 120,
      listening_seconds: 0,
    });
    const fields = analytics.updateSummary.mock.calls[0][0];
    expect(fields).toMatchObject({
      current_streak: 14,
      longest_streak: 31,
      total_days_active: 88,
      total_reading_seconds: 360000,
      total_listening_seconds: 250000,
      total_audio_sessions: 300,
      total_banis_read: 540,
      // Derived from the latest restored day (day 5) — without this, the
      // streak engine sees a null last_active_date and zeroes current_streak
      // right back to 0 on the very next computeStreaks() run.
      last_active_date: "2025-06-05",
    });
  });

  it("is a no-op for a null payload", async () => {
    await seedAnalyticsFromSnapshot(null);
    expect(analytics.setDailyActivity).not.toHaveBeenCalled();
    expect(analytics.updateSummary).not.toHaveBeenCalled();
  });
});

describe("buildCachePayload", () => {
  const state = {
    currentBani: { id: 4 },
    isReminders: true,
    reminderSound: "default",
    reminderBanis: JSON.stringify([
      { id: 2, time: "3:30 AM", enabled: true },
      { id: 21, time: "6:00 PM", enabled: false },
    ]),
    todaysNitnem: { selectedBaniIds: [2, 3, 4], completed: { "2025-06-11": [2] } },
    userProfile: { name: "Harpreet Kaur" },
    dashboardLayout: { order: ["streak", "nitnem"], hidden: ["weekChart"] },
  };

  beforeEach(() => {
    analytics.getOrCreateSummary.mockResolvedValue({
      current_streak: 14,
      longest_streak: 31,
      total_days_active: 88,
    });
    analytics.getDailyActivity.mockResolvedValue([
      { date: "2025-06-01", reading_seconds: 120, listening_seconds: 0 },
    ]);
    analytics.getTopReadBanis.mockResolvedValue([{ bani_id: 2, session_count: 42 }]);
    analytics.getTopListenedBanis.mockResolvedValue([{ bani_id: 1, session_count: 27 }]);
    analytics.getRecentReadBanis.mockResolvedValue([{ bani_id: 5 }]);
    analytics.getRecentListenedBanis.mockResolvedValue([{ bani_id: 1 }]);
    // Baseline (restored) + live (this install) combined — see getAllTimeTotals.
    analytics.getAllTimeTotals.mockResolvedValue({
      banisCompleted: 540,
      readingSeconds: 360000,
      listeningSeconds: 250000,
      audioSessions: 300,
    });
  });

  it("maps Redux state + analytics into the KHALIS payload (24h reminder times)", async () => {
    const body = await buildCachePayload({ state, version: "1.0.0", deviceId: "dev-1" });

    expect(body.version).toBe("1.0.0");
    expect(body.deviceId).toBe("dev-1");
    expect(body.userId).toBeNull();
    expect(typeof body.capturedAt).toBe("string");

    const p = body.payload;
    expect(p.lastVisitedBaaniId).toBe(4);
    expect(p.streaks).toEqual({ current: 14, longest: 31 });
    expect(p.month.days).toEqual([[1, 120, 0]]);
    expect(p.read.top5).toEqual([[2, 42, 0]]);
    expect(p.read.last).toEqual({ baaniId: 5 });
    expect(p.totals.banisCompleted).toBe(540);
    expect(p.nitnem.selectedBaaniIds).toEqual([2, 3, 4]);
    expect(p.profile.name).toBe("Harpreet Kaur");
    expect(p.layout).toEqual({ order: ["streak", "nitnem"], hidden: ["weekChart"] });
    // App "h:mm A" → contract "HH:mm".
    expect(p.reminders.items).toEqual([
      { baaniId: 2, time: "03:30", enabled: true },
      { baaniId: 21, time: "18:00", enabled: false },
    ]);
  });
});
