/* eslint-env jest */
/**
 * useDashboardSync — the orchestration, and the two defects that made an
 * account look like it "wasn't syncing".
 *
 * 1. THE GATE. A push before the first pull has settled would overwrite real
 *    cloud history with a fresh install's near-zero totals, so the restore
 *    marker gates pushing. The old code wrote that marker only when a snapshot
 *    came back, and never retried — so one failed request left it unset and
 *    killed sync in BOTH directions for the rest of the process. A brand-new
 *    account (404, nothing to restore) hit the same wall on its very first run
 *    and could therefore never make its first push.
 *
 * 2. THE MOUNT POINT. It lived in DashboardScreen, so neither half existed
 *    unless that screen was mounted. That is covered by app.js wiring rather
 *    than here, but it is why these tests drive the hook with no navigator.
 */

import React from "react";
import { Text } from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, act, waitFor } from "@testing-library/react-native";

import {
  DASHBOARD_RESTORED_KEY,
  DASHBOARD_APPLIED_AT_KEY,
  DASHBOARD_LOCAL_MUTATED_AT_KEY,
} from "./syncKeys";
import { requestPush, requestPull, resetSyncSignal } from "./syncSignal";
import useDashboardSync from "./useDashboardSync";

// ── The module under test's collaborators ──────────────────────────────────
const mockGetSnapshot = jest.fn();
const mockApplyRestore = jest.fn(async () => []);
const mockSeed = jest.fn(async () => {});
// A payload with real history in it. An EMPTY one is now refused outright —
// see the empty-snapshot guard — so the fixture has to look like a device that
// actually has something to say.
const nonEmptyPayload = () => ({
  version: "1",
  payload: {
    totals: { readingSeconds: 900, listeningSeconds: 0, banisCompleted: 3, daysActive: 2 },
    month: { key: "2026-08", days: [[19, 900, 0]] },
    streaks: { current: 2, longest: 4 },
  },
});
const mockBuildPayload = jest.fn(async () => nonEmptyPayload());
const mockIsEmpty = jest.fn(() => false);
const mockPush = jest.fn(async () => ({ ok: true }));
// Distinct per call, so the unchanged-push guard never mistakes two different
// snapshots for the same one. The dedupe itself is tested separately.
let mockHashSeq = 0;
const mockHash = jest.fn(() => {
  mockHashSeq += 1;
  return `h${mockHashSeq}`;
});

jest.mock("./dashboardSync", () => ({
  getDashboardSnapshot: (...a) => mockGetSnapshot(...a),
  applyDashboardRestore: (...a) => mockApplyRestore(...a),
  seedAnalyticsFromSnapshot: (...a) => mockSeed(...a),
  buildCachePayload: (...a) => mockBuildPayload(...a),
  pushDashboardCache: (...a) => mockPush(...a),
  hashPayload: (...a) => mockHash(...a),
  isEmptySnapshot: (...a) => mockIsEmpty(...a),
}));

let mockOnline = true;
jest.mock("@common", () => ({
  logError: jest.fn(),
  useNetwork: () => ({ isOnline: mockOnline }),
}));

jest.mock("react-native-device-info", () => ({
  getVersion: () => "5.9.5",
  getUniqueId: async () => "device-1",
}));

// An in-memory AsyncStorage: the gate is a storage key, so a jest.fn() that
// always returns null would make every test trivially pass.
const mockStorageMap = new Map();
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async (k) => (mockStorageMap.has(k) ? mockStorageMap.get(k) : null)),
  setItem: jest.fn(async (k, v) => {
    mockStorageMap.set(k, v);
  }),
  removeItem: jest.fn(async (k) => {
    mockStorageMap.delete(k);
  }),
}));

let mockAuthState = { status: "signedIn", user: { email: "a@x.com" } };
let mockStoreListeners = [];
const mockReduxState = {
  auth: null,
  transliterationLanguage: "en",
  userProfile: { name: "" },
  dashboardLayout: { order: [], hidden: [] },
  todaysNitnem: { completed: {} },
  isReminders: false,
  reminderBanis: "[]",
  reminderSound: "default",
};
const mockReduxStore = {
  getState: () => ({ ...mockReduxState, auth: mockAuthState }),
  subscribe: (fn) => {
    mockStoreListeners.push(fn);
    return () => {
      mockStoreListeners = mockStoreListeners.filter((f) => f !== fn);
    };
  },
};
/** Mutates a watched slice and notifies, the way a real dispatch would. */
const mockDispatchChange = (key, value) => {
  mockReduxState[key] = value;
  mockStoreListeners.forEach((fn) => fn());
};
jest.mock("react-redux", () => ({
  useStore: () => mockReduxStore,
  useDispatch: () => jest.fn(),
  useSelector: (fn) => fn({ auth: mockAuthState }),
}));

const Harness = () => {
  useDashboardSync();
  return <Text>ok</Text>;
};

const mount = () => render(<Harness />);

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockHashSeq = 0;
  mockIsEmpty.mockReturnValue(false);
  // clearAllMocks resets calls but NOT return values, so a mockReturnValue set
  // by an earlier test would leak in and make every later push look unchanged.
  mockHash.mockImplementation(() => {
    mockHashSeq += 1;
    return `h${mockHashSeq}`;
  });
  // Retry backoff carries ±50% jitter (see retryDelay). Pin it so the tests
  // assert the schedule rather than the dice.
  jest.spyOn(Math, "random").mockReturnValue(0.5);
  mockStorageMap.clear();
  mockOnline = true;
  mockAuthState = { status: "signedIn", user: { email: "a@x.com" } };
  mockStoreListeners = [];
  mockReduxState.isReminders = false;
  mockReduxState.reminderSound = "default";
  mockGetSnapshot.mockResolvedValue({ status: "empty" });
});

afterEach(() => {
  jest.useRealTimers();
  Math.random.mockRestore?.();
  resetSyncSignal();
});

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe("the push gate", () => {
  it("lifts on a 404 — a brand-new account must be able to make its FIRST push", async () => {
    mockGetSnapshot.mockResolvedValue({ status: "empty" });
    mount();
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());
    await flush();
    expect(mockStorageMap.get(DASHBOARD_RESTORED_KEY)).toBe("1");
  });

  it("stays down when the pull FAILED — local state is unknown, so nothing may overwrite the cloud", async () => {
    mockGetSnapshot.mockResolvedValue({ status: "failed", error: new Error("offline") });
    mount();
    await flush();
    expect(mockStorageMap.get(DASHBOARD_RESTORED_KEY)).toBeUndefined();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("REGRESSION: a failed pull retries and then lifts the gate, without an app restart", async () => {
    // This is the defect. Previously the marker was only ever written on the
    // success path with no retry, so this sequence ended with sync dead until
    // the process was killed.
    mockGetSnapshot.mockResolvedValueOnce({ status: "failed", error: new Error("offline") });
    mount();
    await flush();
    expect(mockStorageMap.get(DASHBOARD_RESTORED_KEY)).toBeUndefined();

    mockGetSnapshot.mockResolvedValue({ status: "empty" });
    await act(async () => {
      jest.advanceTimersByTime(30001);
      await Promise.resolve();
    });
    await flush();

    expect(mockStorageMap.get(DASHBOARD_RESTORED_KEY)).toBe("1");
  });

  it("does not lift on 401 — not signed in is not an authoritative answer", async () => {
    mockGetSnapshot.mockResolvedValue({ status: "unauthorized" });
    mount();
    await flush();
    expect(mockStorageMap.get(DASHBOARD_RESTORED_KEY)).toBeUndefined();
  });
});

describe("bootstrap vs refresh", () => {
  it("applies a first snapshot wholesale, preferences included", async () => {
    mockGetSnapshot.mockResolvedValue({
      status: "ok",
      payload: { streaks: {} },
      syncedAt: "2026-08-18T09:00:00.000Z",
    });
    mount();
    await flush();

    expect(mockApplyRestore).toHaveBeenCalledWith(
      { streaks: {} },
      expect.anything(),
      expect.objectContaining({ reschedule: true })
    );
    expect(mockSeed).toHaveBeenCalledWith({ streaks: {} });
    expect(mockStorageMap.get(DASHBOARD_APPLIED_AT_KEY)).toBe("2026-08-18T09:00:00.000Z");
  });

  it("merges instead of overwriting once the device has already bootstrapped", async () => {
    mockStorageMap.set(DASHBOARD_RESTORED_KEY, "1");
    mockStorageMap.set(DASHBOARD_APPLIED_AT_KEY, "2026-08-18T08:00:00.000Z");
    mockGetSnapshot.mockResolvedValue({
      status: "ok",
      payload: { streaks: {} },
      syncedAt: "2026-08-18T09:00:00.000Z",
    });
    mount();
    await flush();

    expect(mockApplyRestore).toHaveBeenCalledWith(
      { streaks: {} },
      expect.anything(),
      expect.objectContaining({ merge: true })
    );
    expect(mockSeed).toHaveBeenCalledWith({ streaks: {} }, { merge: true });
  });

  it("skips a refresh whose snapshot is no newer than what we already applied", async () => {
    mockStorageMap.set(DASHBOARD_RESTORED_KEY, "1");
    mockStorageMap.set(DASHBOARD_APPLIED_AT_KEY, "2026-08-18T09:00:00.000Z");
    mockGetSnapshot.mockResolvedValue({
      status: "ok",
      payload: { streaks: {} },
      syncedAt: "2026-08-18T09:00:00.000Z",
    });
    mount();
    await flush();

    expect(mockApplyRestore).not.toHaveBeenCalled();
    expect(mockSeed).not.toHaveBeenCalled();
  });

  it("applies a refresh that IS newer — this is what makes a second device converge", async () => {
    mockStorageMap.set(DASHBOARD_RESTORED_KEY, "1");
    mockStorageMap.set(DASHBOARD_APPLIED_AT_KEY, "2026-08-18T09:00:00.000Z");
    mockGetSnapshot.mockResolvedValue({
      status: "ok",
      payload: { streaks: {} },
      syncedAt: "2026-08-18T10:00:00.000Z",
    });
    mount();
    await flush();

    expect(mockSeed).toHaveBeenCalledWith({ streaks: {} }, { merge: true });
  });
});

describe("session gating", () => {
  it("does nothing at all while signed out", async () => {
    mockAuthState = { status: "signedOut", user: null };
    mount();
    await flush();
    expect(mockGetSnapshot).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("pushes shortly after sign-in, without waiting for a backgrounding", async () => {
    // The old hook only ever pushed on Dashboard blur or app background, so an
    // account that signed in and never opened that screen uploaded nothing.
    mockStorageMap.set(DASHBOARD_RESTORED_KEY, "1");
    mockGetSnapshot.mockResolvedValue({ status: "empty" });
    mount();
    await flush();
    await act(async () => {
      jest.advanceTimersByTime(2500);
      await Promise.resolve();
    });
    await flush();
    expect(mockPush).toHaveBeenCalled();
  });
});

// ── Sync as it happens ─────────────────────────────────────────────────────
// Reading a bani used to reach the server only when the app was next
// backgrounded. These cover the path that closes that gap without turning every
// tick into a request.
describe("activity-triggered push", () => {
  const settle = async () => {
    mockStorageMap.set(DASHBOARD_RESTORED_KEY, "1");
    mount();
    await flush();
    // Clear the post-sign-in push so the assertions below are about activity.
    await act(async () => {
      jest.advanceTimersByTime(2500);
      await Promise.resolve();
    });
    await flush();
    mockPush.mockClear();
    mockStorageMap.delete("@dashboard_last_push");
  };

  it("does not push the instant a session ends — it waits for the reader to stop", async () => {
    await settle();
    act(() => requestPush("reading-session"));
    await flush();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("pushes once the debounce elapses", async () => {
    await settle();
    act(() => requestPush("reading-session"));
    await act(async () => {
      jest.advanceTimersByTime(21000);
      await Promise.resolve();
    });
    await flush();
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it("coalesces a sitting of several banis into ONE push", async () => {
    await settle();
    act(() => requestPush("reading-session"));
    act(() => jest.advanceTimersByTime(10000));
    act(() => requestPush("reading-session"));
    act(() => jest.advanceTimersByTime(10000));
    act(() => requestPush("reading-session"));
    await act(async () => {
      jest.advanceTimersByTime(21000);
      await Promise.resolve();
    });
    await flush();
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it("skips the request entirely when the snapshot has not changed", async () => {
    await settle();
    mockHash.mockReturnValue("same");
    mockStorageMap.set("@dashboard_payload_hash_v1", "same");
    act(() => requestPush("reading-session"));
    await act(async () => {
      jest.advanceTimersByTime(21000);
      await Promise.resolve();
    });
    await flush();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("records the hash after a successful push, so the next identical one is free", async () => {
    await settle();
    mockHash.mockReturnValue("abc123");
    act(() => requestPush("reading-session"));
    await act(async () => {
      jest.advanceTimersByTime(21000);
      await Promise.resolve();
    });
    await flush();
    expect(mockStorageMap.get("@dashboard_payload_hash_v1")).toBe("abc123");
  });
});

// ── Manual refresh must sync AT ANY COST ───────────────────────────────────
// Every automatic path is guarded. Those guards are right for background work
// and wrong when a person deliberately pulls the screen down: "no, too soon" is
// indistinguishable from broken. These pin that none of them apply.
describe("pull to refresh", () => {
  const ready = async () => {
    mockStorageMap.set(DASHBOARD_RESTORED_KEY, "1");
    mockGetSnapshot.mockResolvedValue({ status: "empty" });
    mount();
    await flush();
    await act(async () => {
      jest.advanceTimersByTime(2500);
      await Promise.resolve();
    });
    await flush();
    mockGetSnapshot.mockClear();
    mockPush.mockClear();
  };

  it("PUSHES as well as pulls — local work has to travel up too", async () => {
    await ready();
    await act(async () => {
      await requestPull("pull-to-refresh");
    });
    expect(mockPush).toHaveBeenCalled();
    expect(mockGetSnapshot).toHaveBeenCalled();
  });

  it("PULLS FIRST — pushing first would clobber the row it is about to read", async () => {
    // There is one snapshot row per account per day, so a push overwrites it.
    // Pushing first meant every device sent its own state and then pulled back
    // exactly what it had just sent: each phone could only ever see itself, and
    // the only way to get the other device's data was to sign out and in again.
    await ready();
    const order = [];
    mockGetSnapshot.mockImplementation(async () => {
      order.push("pull");
      return { status: "empty" };
    });
    mockPush.mockImplementation(async () => {
      order.push("push");
      return { ok: true };
    });

    await act(async () => {
      await requestPull("pull-to-refresh");
    });

    expect(order[0]).toBe("pull");
    expect(order).toContain("push");
  });

  it("pushes even inside the 60s cooldown", async () => {
    await ready();
    // A push moments ago would normally skip the next one entirely.
    mockStorageMap.set("@dashboard_last_push", String(Date.now()));
    await act(async () => {
      await requestPull("pull-to-refresh");
    });
    expect(mockPush).toHaveBeenCalled();
  });

  it("pushes even when the payload is byte-identical", async () => {
    await ready();
    mockHash.mockReturnValue("same");
    mockStorageMap.set("@dashboard_payload_hash_v1", "same");
    await act(async () => {
      await requestPull("pull-to-refresh");
    });
    expect(mockPush).toHaveBeenCalled();
  });

  it("applies a snapshot the freshness check would otherwise skip", async () => {
    mockStorageMap.set(DASHBOARD_RESTORED_KEY, "1");
    mockStorageMap.set(DASHBOARD_APPLIED_AT_KEY, "2026-08-19T09:00:00.000Z");
    mockGetSnapshot.mockResolvedValue({
      status: "ok",
      payload: { streaks: {} },
      syncedAt: "2026-08-19T09:00:00.000Z", // not newer — background would skip
    });
    mount();
    await flush();
    mockSeed.mockClear();

    await act(async () => {
      await requestPull("pull-to-refresh");
    });
    expect(mockSeed).toHaveBeenCalledWith({ streaks: {} }, { merge: true });
  });

  it("resolves only once the whole round trip has finished", async () => {
    await ready();
    let settled = false;
    await act(async () => {
      await requestPull("pull-to-refresh").then(() => {
        settled = true;
      });
    });
    expect(settled).toBe(true);
  });
});

// ── Whose preferences win ──────────────────────────────────────────────────
// The section order is account data. It used to apply only at first sign-in, so
// rearranging the dashboard on one phone never reached the other — reported as
// "customize layout is not syncing".
describe("adopting preferences on a refresh", () => {
  const remote = (syncedAt) => ({
    status: "ok",
    payload: { layout: { order: ["a"], hidden: [] } },
    syncedAt,
  });

  it("adopts them when the snapshot is NEWER than anything this device pushed", async () => {
    mockStorageMap.set(DASHBOARD_RESTORED_KEY, "1");
    mockStorageMap.set(DASHBOARD_APPLIED_AT_KEY, "2026-08-19T08:00:00.000Z");
    mockStorageMap.set("@dashboard_last_push", String(Date.parse("2026-08-19T09:00:00.000Z")));
    mockGetSnapshot.mockResolvedValue(remote("2026-08-19T10:00:00.000Z"));
    mount();
    await flush();

    expect(mockApplyRestore).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ preferences: true, reschedule: true })
    );
  });

  it("leaves them alone when the snapshot is our OWN last push", async () => {
    // Re-applying here would undo a layout change made locally since.
    mockStorageMap.set(DASHBOARD_RESTORED_KEY, "1");
    mockStorageMap.set(DASHBOARD_APPLIED_AT_KEY, "2026-08-19T08:00:00.000Z");
    mockStorageMap.set("@dashboard_last_push", String(Date.parse("2026-08-19T11:00:00.000Z")));
    mockGetSnapshot.mockResolvedValue(remote("2026-08-19T10:00:00.000Z"));
    mount();
    await flush();

    expect(mockApplyRestore).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ preferences: false, reschedule: false })
    );
  });

  it("adopts another device's layout on a manual refresh", async () => {
    mockStorageMap.set(DASHBOARD_RESTORED_KEY, "1");
    mockStorageMap.set(DASHBOARD_APPLIED_AT_KEY, "2026-08-19T10:00:00.000Z");
    mockStorageMap.set("@dashboard_last_push", String(Date.parse("2026-08-19T09:00:00.000Z")));
    mockGetSnapshot.mockResolvedValue(remote("2026-08-19T10:00:00.000Z"));
    mount();
    await flush();
    mockApplyRestore.mockClear();

    await act(async () => {
      await requestPull("pull-to-refresh");
    });

    expect(mockApplyRestore).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ preferences: true })
    );
  });

  it("REGRESSION: a manual refresh does not overwrite an edit we have not pushed yet", async () => {
    // Rearrange the layout on this phone, pull to refresh before the debounced
    // push has fired. `force` used to be enough on its own to adopt the remote
    // preferences, so the refresh reverted the change to the server's older
    // copy — and then pushed the reverted layout back up, which is how an edit
    // made on one phone failed to reach the other.
    mockStorageMap.set(DASHBOARD_RESTORED_KEY, "1");
    mockStorageMap.set(DASHBOARD_APPLIED_AT_KEY, "2026-08-19T08:00:00.000Z");
    mockStorageMap.set("@dashboard_last_push", String(Date.parse("2026-08-19T09:00:00.000Z")));
    mockStorageMap.set(
      DASHBOARD_LOCAL_MUTATED_AT_KEY,
      String(Date.parse("2026-08-19T09:30:00.000Z"))
    );
    mockGetSnapshot.mockResolvedValue(remote("2026-08-19T10:00:00.000Z"));
    mount();
    await flush();
    mockApplyRestore.mockClear();

    await act(async () => {
      await requestPull("pull-to-refresh");
    });

    // History still merges — nothing is lost either way — but our layout stands.
    expect(mockApplyRestore).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ merge: true, preferences: false })
    );
    // ...and it travels up, so the other device gets it.
    expect(mockPush).toHaveBeenCalled();
  });

  it("does not treat the merge's own dispatches as a local edit", async () => {
    // applyDashboardRestore writes into every slice the store watcher watches.
    // Counting that as "the user changed something" would stamp the local-change
    // clock, and this device would then refuse the account's preferences for
    // ever after — having supposedly edited something it never touched.
    mockStorageMap.set(DASHBOARD_RESTORED_KEY, "1");
    mockStorageMap.set("@dashboard_last_push", String(Date.parse("2026-08-19T09:00:00.000Z")));
    mockGetSnapshot.mockResolvedValue(remote("2026-08-19T10:00:00.000Z"));
    mockApplyRestore.mockImplementation(async (_payload, dispatch) => {
      dispatch({ type: "TOUCH_LAYOUT" });
    });
    mount();
    await flush();

    expect(mockStorageMap.get(DASHBOARD_LOCAL_MUTATED_AT_KEY)).toBeUndefined();
  });
});

// ── Local vs account: which side wins ──────────────────────────────────────
// A device can accumulate real work while signed out or offline. When a session
// begins or connectivity returns, two copies exist and only one can survive.
// The rule: whichever changed later wins outright.
describe("reconciling local data against the account", () => {
  const remote = (syncedAt) => ({
    status: "ok",
    payload: { streaks: { current: 9 } },
    syncedAt,
  });

  it("KEEPS local and pushes it when local changed after the account's snapshot", async () => {
    // Read banis offline this morning; the account's snapshot is from last night.
    mockStorageMap.set(
      DASHBOARD_LOCAL_MUTATED_AT_KEY,
      String(Date.parse("2026-08-19T10:00:00.000Z"))
    );
    mockGetSnapshot.mockResolvedValue(remote("2026-08-19T08:00:00.000Z"));
    mount();
    await flush();

    // Nothing from the server was applied — the offline work survives.
    expect(mockApplyRestore).not.toHaveBeenCalled();
    expect(mockSeed).not.toHaveBeenCalled();
    // And it goes up.
    expect(mockPush).toHaveBeenCalled();
  });

  it("REGRESSION: an EMPTY local copy never outranks an account with history", async () => {
    // A timestamp is not evidence of data. The purge's own clearUserData
    // dispatch stamps the local-change clock, so a just-wiped device looked
    // "newer" than an account holding years of history — the restore was
    // skipped and the Dashboard sat at 0/0 until a manual refresh happened to
    // take the other branch. This is the fresh-sign-in zeros report.
    mockStorageMap.set(
      DASHBOARD_LOCAL_MUTATED_AT_KEY,
      String(Date.parse("2026-08-19T10:00:00.000Z"))
    );
    mockIsEmpty.mockReturnValue(true); // nothing on this device
    mockGetSnapshot.mockResolvedValue(remote("2026-08-19T08:00:00.000Z"));
    mount();
    await flush();

    expect(mockApplyRestore).toHaveBeenCalled();
    expect(mockSeed).toHaveBeenCalled();
    // ...and the empty local copy is still refused as a push, both guards holding.
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("does not even build a payload when the stamp is older than the snapshot", async () => {
    // The emptiness check costs a full payload build, so it must only run on
    // the branch that could actually discard the account's copy.
    mockGetSnapshot.mockResolvedValue(remote("2026-08-19T10:00:00.000Z"));
    mount();
    await flush();
    expect(mockBuildPayload).not.toHaveBeenCalled();
  });

  it("DISCARDS local and takes the snapshot when the account moved on later", async () => {
    mockStorageMap.set(
      DASHBOARD_LOCAL_MUTATED_AT_KEY,
      String(Date.parse("2026-08-19T08:00:00.000Z"))
    );
    mockGetSnapshot.mockResolvedValue(remote("2026-08-19T10:00:00.000Z"));
    mount();
    await flush();

    expect(mockApplyRestore).toHaveBeenCalled();
    expect(mockSeed).toHaveBeenCalledWith({ streaks: { current: 9 } });
  });

  it("clears the local stamp once the snapshot has superseded it", async () => {
    // Otherwise the next launch re-decides in favour of data we just overwrote.
    mockStorageMap.set(
      DASHBOARD_LOCAL_MUTATED_AT_KEY,
      String(Date.parse("2026-08-19T08:00:00.000Z"))
    );
    mockGetSnapshot.mockResolvedValue(remote("2026-08-19T10:00:00.000Z"));
    mount();
    await flush();

    expect(mockStorageMap.has(DASHBOARD_LOCAL_MUTATED_AT_KEY)).toBe(false);
  });

  it("takes the snapshot when the device has no local changes at all", async () => {
    // A fresh install: nothing local, so there is nothing to weigh.
    mockGetSnapshot.mockResolvedValue(remote("2026-08-19T10:00:00.000Z"));
    mount();
    await flush();
    expect(mockApplyRestore).toHaveBeenCalled();
  });

  it("uploads offline work when the account has NO snapshot to compare against", async () => {
    mockStorageMap.set(DASHBOARD_LOCAL_MUTATED_AT_KEY, String(Date.now()));
    mockGetSnapshot.mockResolvedValue({ status: "empty" });
    mount();
    await flush();
    expect(mockPush).toHaveBeenCalled();
  });

  it("stamps the local clock whenever something changes, signed in or not", async () => {
    mockStorageMap.clear();
    requestPush("nitnem-tick");
    await flush();
    expect(mockStorageMap.has(DASHBOARD_LOCAL_MUTATED_AT_KEY)).toBe(true);
  });
});

// ── Nothing in the snapshot changes without a push ─────────────────────────
// Patching call sites failed twice — the nitnem tick and the dashboard layout
// both shipped with no trigger, and reminders are written from eight places.
// The store subscription is the backstop.
describe("watching the snapshot state", () => {
  const settle = async () => {
    mockStorageMap.set(DASHBOARD_RESTORED_KEY, "1");
    mount();
    await flush();
    await act(async () => {
      jest.advanceTimersByTime(2500);
      await Promise.resolve();
    });
    await flush();
    mockPush.mockClear();
    mockStorageMap.delete("@dashboard_last_push");
  };

  it("pushes when reminders are toggled — eight call sites, no trigger on any of them", async () => {
    await settle();
    act(() => mockDispatchChange("isReminders", true));
    await act(async () => {
      jest.advanceTimersByTime(21000);
      await Promise.resolve();
    });
    await flush();
    expect(mockPush).toHaveBeenCalled();
  });

  it("pushes when the reminder sound changes", async () => {
    await settle();
    act(() => mockDispatchChange("reminderSound", "bell"));
    await act(async () => {
      jest.advanceTimersByTime(21000);
      await Promise.resolve();
    });
    await flush();
    expect(mockPush).toHaveBeenCalled();
  });

  it("does NOT push when an unwatched slice changes", async () => {
    await settle();
    act(() => mockDispatchChange("transliterationLanguage", "pa"));
    await act(async () => {
      jest.advanceTimersByTime(21000);
      await Promise.resolve();
    });
    await flush();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

// ── Never upload nothing ───────────────────────────────────────────────────
// A real account lost its history to this: a snapshot holding 1122 seconds and
// a two-day streak was replaced with all zeroes and an empty month. The cause
// was a push landing in the window between an account switch wiping local
// SQLite and the restore writing it back — local was empty, so the payload was
// empty, and it overwrote the very snapshot being restored.
describe("refusing to overwrite the account with nothing", () => {
  const ready = async () => {
    mockStorageMap.set(DASHBOARD_RESTORED_KEY, "1");
    mount();
    await flush();
    await act(async () => {
      jest.advanceTimersByTime(2500);
      await Promise.resolve();
    });
    await flush();
    mockPush.mockClear();
    mockStorageMap.delete("@dashboard_last_push");
  };

  it("REGRESSION: an empty snapshot is never sent", async () => {
    await ready();
    mockIsEmpty.mockReturnValue(true);
    act(() => requestPush("reading-session"));
    await act(async () => {
      jest.advanceTimersByTime(21000);
      await Promise.resolve();
    });
    await flush();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("not even a manual refresh can wipe the account", async () => {
    // force overrides the cooldown and the unchanged check. It must NOT
    // override this one — pull-to-refresh cannot be a way to delete your data.
    await ready();
    mockIsEmpty.mockReturnValue(true);
    await act(async () => {
      await requestPull("pull-to-refresh");
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("still sends a snapshot that has real history in it", async () => {
    await ready();
    mockIsEmpty.mockReturnValue(false);
    act(() => requestPush("reading-session"));
    await act(async () => {
      jest.advanceTimersByTime(21000);
      await Promise.resolve();
    });
    await flush();
    expect(mockPush).toHaveBeenCalled();
  });

  it("does not push WHILE a restore is being applied", async () => {
    // The restore marker opens the push gate before the snapshot is applied, so
    // the marker alone is not proof local state is whole.
    let releaseRestore;
    mockApplyRestore.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseRestore = resolve;
        })
    );
    mockGetSnapshot.mockResolvedValue({
      status: "ok",
      payload: { streaks: { current: 1 } },
      syncedAt: "2026-08-19T09:00:00.000Z",
    });
    mount();
    await flush();
    mockPush.mockClear();

    // A push attempt lands mid-restore.
    act(() => requestPush("reading-session"));
    await act(async () => {
      jest.advanceTimersByTime(21000);
      await Promise.resolve();
    });
    await flush();
    expect(mockPush).not.toHaveBeenCalled();

    releaseRestore?.([]);
    mockApplyRestore.mockImplementation(async () => []);
  });
});
