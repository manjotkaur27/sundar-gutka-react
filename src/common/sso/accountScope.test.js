/* eslint-env jest */
/**
 * Account-boundary logic: which sign-ins count as "a different person is now
 * using this device", and what gets wiped when one does.
 *
 * The false-positive direction matters as much as the false-negative one. Too
 * eager and a user loses their own history for re-logging in after an expiry;
 * too lax and the next account inherits the previous one's reading history.
 *
 * The collaborators are mocked rather than globally stubbed: accountScope pulls
 * in analytics SQLite, the actions barrel (→ firebase) and notifications
 * (→ localization, a native module), none of which this logic depends on.
 */

const mockClearAllAnalyticsData = jest.fn(() => Promise.resolve());
const mockCancelAllReminders = jest.fn(() => Promise.resolve());

jest.mock("../../database/analytics", () => ({
  clearAllAnalyticsData: (...a) => mockClearAllAnalyticsData(...a),
}));
jest.mock("../actions", () => ({
  clearUserData: () => ({ type: "CLEAR_USER_DATA" }),
}));
jest.mock("../notifications", () => ({
  cancelAllReminders: (...a) => mockCancelAllReminders(...a),
}));
jest.mock("../firebase/crashlytics", () => ({ logError: jest.fn() }));

// Flipped per-test to exercise both sides of the interim switch.
//
// Read through a getter rather than captured directly: jest.mock factories are
// hoisted above every `const` in this file, so a captured object would still be
// in its temporal dead zone when accountScope imports the module. The getter
// resolves at call time, by which point the value is set.
jest.mock("../constant", () => ({
  __esModule: true,
  default: {
    get SSO_ACCOUNT_SCOPED_SYNC() {
      return global.ssoAccountScopedSyncFlag;
    },
    SSO_KEYCHAIN_SERVICE: "khalis_sso",
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DASHBOARD_RESTORED_KEY,
  DASHBOARD_LAST_PUSH_KEY,
  RESTORED_TOP_BANIS_KEY,
} from "../../services/dashboard/syncKeys";
import {
  isAccountChange,
  purgeLocalUserData,
  applyAccountScope,
  readLastAccount,
  writeLastAccount,
} from "./accountScope";

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  global.ssoAccountScopedSyncFlag = false;
});

describe("isAccountChange", () => {
  it("is false for the same account (re-login after an expiry must not purge)", () => {
    expect(isAccountChange("a@khalis.net", "a@khalis.net")).toBe(false);
  });

  it("is true when a different account signs in", () => {
    expect(isAccountChange("b@khalis.net", "a@khalis.net")).toBe(true);
  });

  it("is true on first sign-in when the device has no owner yet", () => {
    expect(isAccountChange("a@khalis.net", null)).toBe(true);
  });

  it("is true on sign-out from an account", () => {
    expect(isAccountChange(null, "a@khalis.net")).toBe(true);
  });

  // Every launch of a never-signed-in app takes this path. Returning true would
  // purge a signed-out user's data on every cold start.
  it("is FALSE when signed out and there was never an account", () => {
    expect(isAccountChange(null, null)).toBe(false);
    expect(isAccountChange(undefined, null)).toBe(false);
    expect(isAccountChange("", null)).toBe(false);
  });

  // The SSO may return a differently-cased address than the one stored;
  // treating those as different accounts would purge for nothing.
  it("ignores case and surrounding whitespace", () => {
    expect(isAccountChange("A@Khalis.NET", "a@khalis.net")).toBe(false);
    expect(isAccountChange("  a@khalis.net  ", "a@khalis.net")).toBe(false);
  });

  it("treats non-string input as no account", () => {
    expect(isAccountChange(123, null)).toBe(false);
    expect(isAccountChange(null, 123)).toBe(false);
  });
});

describe("purgeLocalUserData", () => {
  const dispatch = jest.fn();

  it("clears analytics SQLite — the dashboard's real source of truth", async () => {
    await purgeLocalUserData(dispatch);
    expect(mockClearAllAnalyticsData).toHaveBeenCalledTimes(1);
  });

  it("dispatches CLEAR_USER_DATA", async () => {
    await purgeLocalUserData(dispatch);
    expect(dispatch).toHaveBeenCalledWith({ type: "CLEAR_USER_DATA" });
  });

  // Redux forgetting the reminders does not unschedule them with the OS.
  it("cancels reminders so the previous account's notifications stop firing", async () => {
    await purgeLocalUserData(dispatch);
    expect(mockCancelAllReminders).toHaveBeenCalledTimes(1);
  });

  it("clears the push timestamp and the restored-top-banis cache", async () => {
    await AsyncStorage.setItem(DASHBOARD_LAST_PUSH_KEY, "123");
    await AsyncStorage.setItem(RESTORED_TOP_BANIS_KEY, "{}");
    await purgeLocalUserData(dispatch);
    expect(await AsyncStorage.getItem(DASHBOARD_LAST_PUSH_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(RESTORED_TOP_BANIS_KEY)).toBeNull();
  });

  // THE interim behaviour. While the backend still keys snapshots on deviceId,
  // allowing a restore would immediately re-import the PREVIOUS account's data
  // and undo the purge. Setting the marker suppresses that.
  it("SUPPRESSES the restore while sync is still device-keyed", async () => {
    global.ssoAccountScopedSyncFlag = false;
    await purgeLocalUserData(dispatch);
    expect(await AsyncStorage.getItem(DASHBOARD_RESTORED_KEY)).toBe("1");
  });

  it("ALLOWS the restore once sync is account-keyed", async () => {
    global.ssoAccountScopedSyncFlag = true;
    await AsyncStorage.setItem(DASHBOARD_RESTORED_KEY, "1");
    await purgeLocalUserData(dispatch);
    expect(await AsyncStorage.getItem(DASHBOARD_RESTORED_KEY)).toBeNull();
  });
});

describe("applyAccountScope", () => {
  const dispatch = jest.fn();

  it("purges and records the new owner on a real account change", async () => {
    await writeLastAccount("a@khalis.net");
    const purged = await applyAccountScope("b@khalis.net", dispatch);
    expect(purged).toBe(true);
    expect(mockClearAllAnalyticsData).toHaveBeenCalledTimes(1);
    expect(await readLastAccount()).toBe("b@khalis.net");
  });

  it("does nothing when the same account signs back in", async () => {
    await writeLastAccount("a@khalis.net");
    const purged = await applyAccountScope("a@khalis.net", dispatch);
    expect(purged).toBe(false);
    expect(mockClearAllAnalyticsData).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  // A first sign-in has no previous ACCOUNT to protect — only whatever this
  // person did on the device before signing in, which is their own. Purging
  // it destroyed a nitnem arranged while signed out, which is exactly the
  // work the signed-out editing is there to allow.
  it("CLAIMS a first sign-in rather than purging it", async () => {
    expect(await readLastAccount()).toBeNull();
    const purged = await applyAccountScope("a@khalis.net", dispatch);
    expect(purged).toBe(false);
    expect(mockClearAllAnalyticsData).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
    // Still records the owner, so the NEXT account is a real switch.
    expect(await readLastAccount()).toBe("a@khalis.net");
  });

  it("purges in full once a second account signs in after that", async () => {
    await applyAccountScope("a@khalis.net", dispatch);
    jest.clearAllMocks();
    const purged = await applyAccountScope("b@khalis.net", dispatch);
    expect(purged).toBe(true);
    expect(mockClearAllAnalyticsData).toHaveBeenCalledTimes(1);
    expect(await readLastAccount()).toBe("b@khalis.net");
  });

  it("does nothing on a launch that was never signed in", async () => {
    const purged = await applyAccountScope(null, dispatch);
    expect(purged).toBe(false);
    expect(mockClearAllAnalyticsData).not.toHaveBeenCalled();
  });

  it("stores the normalised address, so case never causes a false purge", async () => {
    await applyAccountScope("A@Khalis.NET", dispatch);
    expect(await readLastAccount()).toBe("a@khalis.net");
    jest.clearAllMocks();
    expect(await applyAccountScope("a@khalis.net", dispatch)).toBe(false);
  });

  // A failed purge must not block sign-in — the user would be stuck unable to
  // log in at all, which is worse than briefly stale data.
  it("reports false rather than throwing when the purge fails", async () => {
    mockClearAllAnalyticsData.mockRejectedValueOnce(new Error("db locked"));
    await writeLastAccount("a@khalis.net");
    await expect(applyAccountScope("b@khalis.net", dispatch)).resolves.toBe(false);
  });
});
