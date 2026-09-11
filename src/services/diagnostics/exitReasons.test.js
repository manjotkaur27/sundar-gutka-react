/* eslint-env jest */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform } from "react-native";

import reportRecentExits, { describeExit, exitAttributes } from "./exitReasons";

// The whole point of this module is the deaths Crashlytics never sees. A Low
// Memory Killer reclaim produces no crash report, so if these reports are
// wrong, silent, or duplicated every launch, the diagnosis they exist to
// support is worse than having nothing.

const mockLogError = jest.fn();
const mockLogMessage = jest.fn();
const mockSetCustomKey = jest.fn();

jest.mock("../../common/firebase/crashlytics", () => ({
  logError: (...a) => mockLogError(...a),
  logMessage: (...a) => mockLogMessage(...a),
  setCustomKey: (...a) => mockSetCustomKey(...a),
}));

const exit = (over = {}) => ({
  reason: 3,
  reasonName: "LOW_MEMORY",
  status: 0,
  importance: 100,
  pss: 268435456,
  rss: 314572800,
  timestamp: 2000,
  description: "",
  processName: "com.WahegurooNetwork.SundarGutka",
  ...over,
});

beforeEach(async () => {
  jest.clearAllMocks();
  Platform.OS = "android";
  await AsyncStorage.clear();
  NativeModules.ExitReasons = { getRecentExits: jest.fn() };
});

describe("reportRecentExits", () => {
  it("reports a low-memory kill, which leaves no crash report of its own", async () => {
    NativeModules.ExitReasons.getRecentExits.mockResolvedValue([exit()]);

    await expect(reportRecentExits()).resolves.toBe(1);
    expect(mockLogError).toHaveBeenCalledTimes(1);
    expect(mockLogError.mock.calls[0][0].message).toBe("App process died: LOW_MEMORY");
  });

  it("attaches the footprint, which is the number device free memory cannot give", async () => {
    NativeModules.ExitReasons.getRecentExits.mockResolvedValue([exit()]);

    await reportRecentExits();

    expect(mockSetCustomKey).toHaveBeenCalledWith(
      expect.objectContaining({ exit_reason: "LOW_MEMORY", exit_pss: "256MB", exit_rss: "300MB" })
    );
  });

  it("reports each death once, not on every launch", async () => {
    NativeModules.ExitReasons.getRecentExits.mockResolvedValue([exit()]);

    await reportRecentExits();
    await reportRecentExits();

    expect(mockLogError).toHaveBeenCalledTimes(1);
  });

  it("still reports a newer death after an older one was seen", async () => {
    NativeModules.ExitReasons.getRecentExits.mockResolvedValue([exit()]);
    await reportRecentExits();

    NativeModules.ExitReasons.getRecentExits.mockResolvedValue([
      exit({ timestamp: 3000, reasonName: "CRASH_NATIVE", reason: 5 }),
      exit(),
    ]);
    await expect(reportRecentExits()).resolves.toBe(1);

    expect(mockLogError).toHaveBeenCalledTimes(2);
    expect(mockLogError.mock.calls[1][0].message).toBe("App process died: CRASH_NATIVE");
  });

  it("stays quiet about an ordinary close", async () => {
    NativeModules.ExitReasons.getRecentExits.mockResolvedValue([
      exit({ reasonName: "EXIT_SELF", reason: 1 }),
    ]);

    await expect(reportRecentExits()).resolves.toBe(0);
    expect(mockLogError).not.toHaveBeenCalled();
  });

  it("never lets a diagnostic break the launch", async () => {
    NativeModules.ExitReasons.getRecentExits.mockRejectedValue(new Error("nope"));

    await expect(reportRecentExits()).resolves.toBe(0);
    expect(mockLogError).not.toHaveBeenCalled();
    expect(mockLogMessage).toHaveBeenCalled();
  });

  it("does nothing where the API does not exist", async () => {
    NativeModules.ExitReasons = undefined;
    await expect(reportRecentExits()).resolves.toBe(0);

    NativeModules.ExitReasons = { getRecentExits: jest.fn() };
    Platform.OS = "ios";
    await expect(reportRecentExits()).resolves.toBe(0);
    expect(NativeModules.ExitReasons.getRecentExits).not.toHaveBeenCalled();
  });
});

describe("shaping", () => {
  it("groups every low-memory kill as one issue rather than one per device", () => {
    expect(describeExit(exit())).toBe(describeExit(exit({ pss: 1, rss: 2, timestamp: 9 })));
  });

  it("reports unknown footprints honestly instead of as zero", () => {
    expect(exitAttributes(exit({ pss: 0, rss: 0 }))).toEqual(
      expect.objectContaining({ exit_pss: "unknown", exit_rss: "unknown" })
    );
  });
});
