/* eslint-env jest */
import { renderHook } from "@testing-library/react-native";
import { navBarGlyphsAreDark, resetNavBarGlyphs, useNavBarSurface } from "./systemBars";

// The navigation bar's glyphs have to contrast with whatever the app draws
// behind them, because the platform's own scrim cannot: it is tinted from the
// window, so over a white bani page it lands light grey and its white glyphs
// disappear into it.
//
// The precedence rule is the part worth pinning. A hidden tab bar is still
// mounted under the Reader and under the first-run length screen, and it
// renders AFTER screen content inside BottomTabView — so anything that let it
// register would let it decide for a screen it is not part of.

jest.mock("react-native", () => ({
  Platform: { OS: "android" },
  NativeModules: { SystemBars: { setNavigationBarLightGlyphs: jest.fn() } },
}));

beforeEach(() => {
  resetNavBarGlyphs();
});

describe("system navigation bar glyphs", () => {
  it("claims nothing until a screen describes its surface", () => {
    expect(navBarGlyphsAreDark()).toBeNull();
  });

  it("goes dark over a light surface and light over a dark one", () => {
    const light = renderHook(() => useNavBarSurface(true));
    expect(navBarGlyphsAreDark()).toBe(true);
    light.unmount();

    renderHook(() => useNavBarSurface(false));
    expect(navBarGlyphsAreDark()).toBe(false);
  });

  it("follows a screen that changes surface under it", () => {
    // The Reader: navy nav while its chrome is up, white page once it hides.
    const { rerender } = renderHook(({ light }) => useNavBarSurface(light), {
      initialProps: { light: false },
    });
    expect(navBarGlyphsAreDark()).toBe(false);

    rerender({ light: true });

    expect(navBarGlyphsAreDark()).toBe(true);
  });

  it("ignores a hidden bar that claims nothing", () => {
    // The Reader over a white page.
    renderHook(() => useNavBarSurface(true));
    // The tab bar underneath, hidden, mounting afterwards.
    renderHook(() => useNavBarSurface(null));

    expect(navBarGlyphsAreDark()).toBe(true);
  });

  it("hands back to the screen underneath when one is dismissed", () => {
    renderHook(() => useNavBarSurface(false));
    const front = renderHook(() => useNavBarSurface(true));
    expect(navBarGlyphsAreDark()).toBe(true);

    front.unmount();

    expect(navBarGlyphsAreDark()).toBe(false);
  });
});
