import { READER_THEMES_BY_ID } from "@theme/reader/themes";
import { applyTheme } from "./actions";
import * as actionTypes from "./actions/actionTypes";
import constant from "./constant";
import { trackSettingEvent } from "./firebase/analytics";
import rootReducer from "./reducer";

// The app's single theme setting and its seed-once rule. Both are persisted, so
// getting either wrong is a bug the user cannot clear without reinstalling.
//
// The mocks below sit under the imports because Babel hoists jest.mock above
// them regardless, so the imports still resolve to the mocked modules.

jest.mock("./firebase/analytics", () => ({
  trackSettingEvent: jest.fn(),
  trackBaniArtistDefault: jest.fn(),
}));

// react-native-localization reads a native module at import time, which Jest has
// no bridge for. The actions file imports STRINGS; this suite uses none of them.
jest.mock("./localization", () => ({ __esModule: true, default: {} }));

const initial = () => rootReducer(undefined, { type: "@@INIT" });

// Runs the thunk against a fixed state and reports what it dispatched.
const run = (id, state = {}) => {
  const dispatched = [];
  const dispatch = (action) => {
    dispatched.push(action);
    return action;
  };
  applyTheme(id)(dispatch, () => state);
  return dispatched;
};

describe("theme reducer", () => {
  it("defaults to following the device", () => {
    // Unchanged from before the themes existed, so an installed user who never
    // opens the picker sees exactly what they saw yesterday.
    expect(initial().theme).toBe(constant.Default);
    expect(initial().readerThemeSeeded).toEqual({});
  });

  it("stores the chosen id", () => {
    const next = rootReducer(undefined, { type: actionTypes.SET_THEME, value: "puratan" });
    expect(next.theme).toBe("puratan");
  });

  it("stores a designed theme id in the same key as an appearance keyword", () => {
    // ONE setting holds both kinds of value. A designed id additionally implies
    // an appearance, which resolve.js reads off the record — see appearanceFor.
    expect(rootReducer(undefined, { type: actionTypes.SET_THEME, value: "blue" }).theme).toBe(
      "blue"
    );
    expect(
      rootReducer(undefined, { type: actionTypes.SET_THEME, value: constant.Dark }).theme
    ).toBe(constant.Dark);
  });

  it("accumulates seeded ids rather than replacing the map", () => {
    let state = rootReducer(undefined, {
      type: actionTypes.MARK_READER_THEME_SEEDED,
      value: "puratan",
    });
    state = rootReducer(state, { type: actionTypes.MARK_READER_THEME_SEEDED, value: "kesari" });
    expect(state.readerThemeSeeded).toEqual({ puratan: true, kesari: true });
  });
});

describe("applyTheme", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sets the theme and reports it once", () => {
    const types = run("blue").map((a) => a.type);
    expect(types).toContain(actionTypes.SET_THEME);
    expect(trackSettingEvent).toHaveBeenCalledTimes(1);
  });

  it("seeds a theme's suggested settings the first time only", () => {
    // Puratan is a manuscript theme, chosen by people reading along with the
    // Gurmukhi, so it suggests transliteration on.
    expect(READER_THEMES_BY_ID.puratan.defaults).toEqual({ isTransliteration: true });

    const first = run("puratan", { isTransliteration: false, readerThemeSeeded: {} });
    expect(
      first.some((a) => a.type === actionTypes.TOGGLE_TRANSLITERATION && a.value === true)
    ).toBe(true);
    expect(first.some((a) => a.type === actionTypes.MARK_READER_THEME_SEEDED)).toBe(true);
  });

  it("never re-seeds, so a later manual toggle is permanent", () => {
    // The user turned transliteration back off after first picking Puratan.
    // Re-selecting it must not undo that.
    const again = run("puratan", {
      isTransliteration: false,
      readerThemeSeeded: { puratan: true },
    });
    expect(again.map((a) => a.type)).toEqual([actionTypes.SET_THEME]);
  });

  it("does not re-assert a toggle that already holds the desired value", () => {
    // Dispatching it anyway would emit a misleading analytics event for a change
    // that never happened.
    const acts = run("puratan", { isTransliteration: true, readerThemeSeeded: {} });
    expect(acts.some((a) => a.type === actionTypes.TOGGLE_TRANSLITERATION)).toBe(false);
    expect(acts.some((a) => a.type === actionTypes.MARK_READER_THEME_SEEDED)).toBe(true);
  });

  it("seeds a suggested Bani font through the same once-only path", () => {
    const acts = run("puratan", { baniFontFace: "GurbaniAkharTrue", readerThemeSeeded: {} });
    expect(
      acts.some((a) => a.type === actionTypes.SET_BANI_FONT_FACE && a.value === "AnmolLipiSG")
    ).toBe(true);
  });

  it("marks a theme with no defaults as seeded, so the check short-circuits after", () => {
    const acts = run("blue", { readerThemeSeeded: {} });
    expect(acts.map((a) => a.type)).toEqual([
      actionTypes.SET_THEME,
      actionTypes.MARK_READER_THEME_SEEDED,
    ]);
  });

  it("never seeds anything for a plain appearance", () => {
    // Default, Light and Dark are not theme records and must never touch a
    // user's translation or transliteration setup.
    [constant.Default, constant.Light, constant.Dark].forEach((value) => {
      const acts = run(value, { isTransliteration: false, readerThemeSeeded: {} });
      expect(acts.some((a) => a.type === actionTypes.TOGGLE_TRANSLITERATION)).toBe(false);
    });
  });

  it("survives an id it does not recognise", () => {
    // A theme withdrawn in a later release. Resolution falls back at read time;
    // this must not throw on the way in.
    expect(() => run("khalsa-gold", { readerThemeSeeded: {} })).not.toThrow();
  });
});
