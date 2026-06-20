/* eslint-env jest */
/**
 * Tests for cross-device restore (GET /dashboard/latest):
 *  - getDashboardLatest: 404 → null, 200 → payload, error → throws
 *  - applyDashboardRestore: dispatches the right Redux actions, converts 24h
 *    reminder times to "h:mm A", and only reschedules when asked.
 */

import { getDashboardLatest, applyDashboardRestore } from "./dashboardSync";

const mockUpdateReminders = jest.fn();

jest.mock("@common", () => ({
  constant: { DASHBOARD_API_BASE_URL: "http://localhost:3500" },
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

  it("sends a Bearer token when provided", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ status: 200, ok: true, json: async () => ({ payload: {} }) });
    await getDashboardLatest({ token: "jwt123" });
    const opts = global.fetch.mock.calls[0][1];
    expect(opts.headers.Authorization).toBe("Bearer jwt123");
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
