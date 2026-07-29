import { Platform } from "react-native";
import darkTheme from "../../../theme/darkTheme";
import lightTheme from "../../../theme/lightTheme";
import { minimizePlayerStyles } from "./style";

// The minimized player is a single style object: collapsed it is a 44x44
// circle, expanded it is the pill. Both therefore share whatever shadow the
// style casts.
const container = (theme) => minimizePlayerStyles(theme).container;

describe("minimized audio player elevation", () => {
  describe("dark mode", () => {
    const style = container(darkTheme);

    it("casts no shadow on either platform", () => {
      // shadowOpacity/Radius are iOS-only; elevation is what Android draws.
      // Any of them left non-zero re-introduces the halo.
      expect(style.shadowOpacity).toBe(0);
      expect(style.shadowRadius).toBe(0);
      expect(style.elevation).toBe(0);
      expect(style.shadowOffset).toEqual({ width: 0, height: 0 });
    });

    it("does not inherit the elevation from SHADOW.medium", () => {
      // SHADOW.medium is spread in before the dark branch and sets elevation 4.
      expect(style.elevation).not.toBe(4);
    });

    it("never colours a shadow light, which renders as a glow not a lift", () => {
      // shadowColor tints Android's elevation shadow from API 28 only, so a
      // light value also made the pill look different above and below API 28.
      const light = [darkTheme.staticColors.WHITE_COLOR, "#fff", "#ffffff", "#faf9f6"];
      if (style.shadowColor) {
        expect(light).not.toContain(String(style.shadowColor).toLowerCase());
      }
    });

    it("lifts by using a surface lighter than the base surface", () => {
      expect(style.backgroundColor).toBe(darkTheme.colors.surfaceElevated);
      expect(style.backgroundColor).not.toBe(darkTheme.colors.surface);
    });

    it("keeps a hairline edge for separation", () => {
      expect(style.borderWidth).toBeGreaterThan(0);
      expect(style.borderColor).toBeTruthy();
    });
  });

  describe("light mode", () => {
    const style = container(lightTheme);

    it("keeps its elevation off so Android draws no square behind the pill", () => {
      expect(style.elevation).toBe(0);
    });

    it("still carries the electric-blue glow on iOS", () => {
      expect(String(style.shadowColor).toLowerCase()).toBe("#5ac8fa");
      if (Platform.OS === "ios") {
        expect(style.shadowOpacity).toBeGreaterThan(0);
      }
    });
  });
});
