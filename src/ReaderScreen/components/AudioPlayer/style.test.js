import { Platform } from "react-native";
import darkTheme from "../../../theme/darkTheme";
import lightTheme from "../../../theme/lightTheme";
import {
  minimizePlayerStyles,
  audioTrackDialogStyles,
  MINIMIZED_PLAYER_FOOTPRINT,
  TRACK_ROW_BORDER_WIDTH,
} from "./style";

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

  it("publishes the collapsed pill's footprint for things that must sit clear of it", () => {
    const { container: pill } = minimizePlayerStyles(darkTheme);
    expect(MINIMIZED_PLAYER_FOOTPRINT).toBe(pill.height + pill.bottom);
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

// Composite a translucent colour over its background, then measure contrast —
// the sweep sits ON the selected row, so it must be judged against that row's
// fill, not against the dialog behind it.
const parse = (c) => {
  if (c.startsWith("rgb")) {
    const p = c.match(/[\d.]+/g).map(Number);
    return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 };
  }
  const s = c.replace("#", "");
  return { rgb: [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)), a: 1 };
};
const composite = (fg, bg) => {
  const f = parse(fg);
  const b = parse(bg);
  return f.rgb.map((v, i) => Math.round(v * f.a + b.rgb[i] * (1 - f.a)));
};
const lum = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const x = lum(a);
  const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

describe("preview sweep on the artist row", () => {
  // The countdown lives on the row being previewed, not on Next — on the
  // button it read as though Next would fire by itself.
  describe.each([
    ["light", lightTheme],
    ["dark", darkTheme],
  ])("%s mode", (_name, theme) => {
    const styles = audioTrackDialogStyles(theme);
    const rowFill = styles.selectedTrackItem.backgroundColor;

    it("clips the fill on the wrapper, not on the row that holds the icons", () => {
      expect(styles.previewSweepTrack.overflow).toBe("hidden");
      expect(styles.previewSweepTrack.borderRadius).toBe(theme.borderRadius.xl);
      expect(styles.trackItem.overflow).toBeUndefined();
    });

    it("covers the row's border instead of stopping inside it", () => {
      // Absolute children sit inside the parent's border, so zero insets leave
      // a hairline of the row showing above the sweep. Each inset must cancel
      // the row's border exactly — and stay negative, or the gap returns.
      const sweep = styles.previewSweepTrack;
      ["top", "left", "right", "bottom"].forEach((edge) => {
        expect(sweep[edge]).toBe(-TRACK_ROW_BORDER_WIDTH);
      });
      expect(TRACK_ROW_BORDER_WIDTH).toBeGreaterThan(0);
    });

    it("stays visible against the selected row without hiding its label", () => {
      const swept = composite(styles.previewSweepFill.backgroundColor, rowFill);
      // Distinguishable from the untouched part of the row...
      expect(ratio(swept, parse(rowFill).rgb)).toBeGreaterThan(1.2);
      // ...while the artist name on top still clears AA for body text.
      const label = theme.staticColors.WHITE_COLOR;
      expect(ratio(parse(label).rgb, swept)).toBeGreaterThanOrEqual(4.5);
    });
  });

  it("no longer draws a countdown on the Next button", () => {
    const styles = audioTrackDialogStyles(darkTheme);
    expect(styles.previewProgressTrack).toBeUndefined();
    expect(styles.previewProgressFill).toBeUndefined();
  });
});
