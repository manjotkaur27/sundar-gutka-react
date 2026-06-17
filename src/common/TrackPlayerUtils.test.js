/* eslint-env jest */
//
// Regression test for the Android 12+ foreground-service crash
// (ForegroundServiceStartNotAllowedException @ MusicModule.setupPlayer):
// TrackPlayer.setupPlayer() must never run while the app is in the background.

// TrackPlayerUtils pulls logError/logMessage from the heavy @common barrel —
// stub the two it uses so the module loads in isolation.
jest.mock("./index", () => ({
  logError: jest.fn(),
  logMessage: jest.fn(),
}));

import { AppState } from "react-native";
import TrackPlayer from "react-native-track-player";
import { TrackPlayerSetup } from "./TrackPlayerUtils";

describe("TrackPlayerSetup foreground guard", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // The singleton initializes at most once per module registry, so this single
  // test (starting from a fresh, uninitialized singleton) exercises the guard:
  // backgrounded → setupPlayer deferred → 'active' → setupPlayer runs once.
  it("defers setupPlayer while backgrounded, then runs it on the next 'active' state", async () => {
    TrackPlayer.setupPlayer.mockClear();

    const listeners = [];
    AppState.currentState = "background";
    jest.spyOn(AppState, "addEventListener").mockImplementation((event, cb) => {
      listeners.push(cb);
      return { remove: jest.fn() };
    });

    const promise = TrackPlayerSetup();
    // Flush microtasks — setup must still be waiting on the foreground.
    await Promise.resolve();
    await Promise.resolve();
    expect(TrackPlayer.setupPlayer).not.toHaveBeenCalled();

    // App returns to the foreground → setup proceeds exactly once.
    AppState.currentState = "active";
    listeners.forEach((cb) => cb("active"));
    await promise;
    expect(TrackPlayer.setupPlayer).toHaveBeenCalledTimes(1);
  });
});
