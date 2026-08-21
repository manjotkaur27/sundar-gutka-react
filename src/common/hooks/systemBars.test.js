/* eslint-env jest */
import reducer from "../reducer";
import { migrations } from "../store";

/**
 * The Hide Status Bar setting never worked.
 *
 * MainActivity hid `Type.systemBars()` — navigation bar AND status bar — and
 * re-applied it on every window focus change. React Native's StatusBar would
 * show the bar as the user asked, then the next shade pull, dialog dismissal or
 * unlock hid it again a moment later. The value was saved correctly the whole
 * time; it just never survived contact with that method, which is why toggling
 * it off also looked like it had not been remembered after a relaunch.
 *
 * Native now hides the navigation bar only. These pin the two JS halves: the
 * switch ships off, and everyone already on the app is brought to that too.
 */
describe("the Hide Status Bar setting", () => {
  it("ships OFF, so a fresh install shows the status bar", () => {
    // `isStatusBar` is the value of the SWITCH, so false means "not hidden".
    // It used to default to true, which put a switch labelled "Hide Status Bar"
    // in the on position before the user had touched anything.
    const state = reducer(undefined, { type: "@@INIT" });
    expect(state.isStatusBar).toBe(false);
  });

  it("holds the value the user sets", () => {
    const hidden = reducer(undefined, { type: "TOGGLE_STATUS_BAR", value: true });
    expect(hidden.isStatusBar).toBe(true);
    const shown = reducer(hidden, { type: "TOGGLE_STATUS_BAR", value: false });
    expect(shown.isStatusBar).toBe(false);
  });
});

describe("the upgrade path for people already on the app", () => {
  it("shows the status bar for an existing install too", () => {
    // Their saved `true` is not a preference — the setting was overruled on
    // every focus change, so nobody could have chosen it. Without this they
    // would stay full-screen forever while new installs got the bar.
    const migrated = migrations[1]({ isStatusBar: true, fontSize: 3 });
    expect(migrated.isStatusBar).toBe(false);
  });

  it("touches nothing else in the saved state", () => {
    const before = { isStatusBar: true, fontSize: 3, isNightMode: true, language: "pa" };
    const after = migrations[1](before);
    expect(after).toEqual({ ...before, isStatusBar: false });
  });
});
