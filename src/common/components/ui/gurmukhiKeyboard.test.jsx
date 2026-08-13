import React from "react";

import { render, screen } from "@testing-library/react-native";
import lightTheme from "@theme/lightTheme";

import { KEY_ROWS } from "../../gurmukhiKeys";

import GurmukhiKeyboard from "./GurmukhiKeyboard";

// The keyboard is a PINNED sheet footer: it takes its height before the body
// gets any. So its height is not its own business — it decides whether the
// field you are typing into is on screen at all.
//
// It used to take `layout.touchTarget` per key, which scales at the full OS
// text rate. At the 1.5x cap that is 66pt across seven rows, and the New Pothi
// sheet showed its title above a clipped name field with both buttons gone.
// Raising the text size has to make the GLYPHS bigger, not evict the field.

jest.mock("../../context/ThemeContext", () => ({
  useTheme: () => ({ theme: jest.requireActual("@theme/lightTheme").default }),
}));

/** A tall modern phone at the default text size — the reference case. */
const REFERENCE = { width: 390, height: 844, scale: 3, fontScale: 1 };
let mockWindow = REFERENCE;

jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: () => mockWindow,
}));

beforeEach(() => {
  mockWindow = REFERENCE;
});

const flat = (style) =>
  (Array.isArray(style) ? style.flat(Infinity) : [style])
    .filter(Boolean)
    .reduce((out, s) => ({ ...out, ...s }), {});

const renderAt = (window) => {
  mockWindow = window;
  return render(<GurmukhiKeyboard value="" onKey={() => {}} onBackspace={() => {}} />);
};

/** Every key is a button; they all share one height. */
const keyHeight = () => flat(screen.getAllByRole("button")[0].props.style).height;

/** Rows of letters, plus the space/backspace row the component appends. */
const ROW_COUNT = KEY_ROWS.length + 1;

describe("GurmukhiKeyboard", () => {
  it("does not grow when the OS text size does", () => {
    renderAt(REFERENCE);
    const atDefault = keyHeight();
    screen.unmount();
    // The same device, the user having raised text size to the app's cap.
    renderAt({ ...REFERENCE, fontScale: 1.5 });
    expect(keyHeight()).toBe(atDefault);
  });

  it("keeps a real key height on a tall phone", () => {
    renderAt(REFERENCE);
    // There is room here, so nothing is given up: the unscaled touch target.
    expect(keyHeight()).toBe(lightTheme.layout.touchTarget);
  });

  it("gives up height rather than the screen on a small phone", () => {
    // 320x568 is the floor the iOS 12.4 deployment target implies.
    renderAt({ width: 320, height: 568, scale: 2, fontScale: 1 });
    const h = keyHeight();
    expect(h).toBeLessThan(lightTheme.layout.touchTarget);
    // Still a real target: these keys are ~29pt wide already, so 34 tall clears
    // the 24x24 minimum in WCAG 2.5.8 on both axes.
    expect(h).toBeGreaterThanOrEqual(34);
  });

  it("leaves over half the window for the sheet above it, at any text size", () => {
    [1, 1.25, 1.5].forEach((fontScale) => {
      renderAt({ width: 320, height: 568, scale: 2, fontScale });
      // The keys alone — the plate's own padding is on top, which is why the
      // component budgets for it rather than measuring only this.
      expect(keyHeight() * ROW_COUNT).toBeLessThan(568 * 0.5);
      screen.unmount();
    });
  });
});
