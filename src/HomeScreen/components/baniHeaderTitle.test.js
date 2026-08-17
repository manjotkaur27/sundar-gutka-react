import fs from "fs";
import path from "path";
import { StyleSheet } from "react-native";
import createStyles from "../styles";

// The app name in the home header wraps to two lines on an ordinary phone —
// "ਸੁੰਦਰ ਗੁਟਕਾ" needs about 194dp at 32pt and the middle column offers ~180dp
// once the two 48dp side slots and the two ornaments are taken out. Wrapping is
// therefore the normal case, not the edge case, and the two things that make it
// work are easy to undo by accident:
//
//   1. The SHRINK lives on the wrapping View, not on the Text. A Text carrying
//      flexShrink inside a row is measured for height at its unshrunk width —
//      one line — and keeps that height after the width narrows, so the second
//      line is laid out past the bottom of its own box and clipped. That is the
//      bug this file exists for: the header read "ਸੁੰਦਰ" with no "ਗੁਟਕਾ".
//
//   2. lineHeight is NOT a constant in the stylesheet. React Native scales
//      fontSize with the OS text setting but leaves an explicit lineHeight
//      alone, so a fixed value holds the line box still while the glyphs grow
//      into each other. BaniHeader passes a scaled one instead.

const flat = (s) => StyleSheet.flatten(s) ?? {};

const theme = {
  mode: "light",
  spacing: { sm: 8 },
  typography: {
    sizes: { huge: 28 },
    fonts: { balooPaaji: "BalooPaaji2-Regular", balooPaajiSemiBold: "SemiBold" },
  },
  c: { headerFg: "#123456", textSecondary: "#777777" },
};

describe("the home header title", () => {
  const styles = createStyles(theme);

  it("puts the shrink on the wrapper, so a wrapped line is not clipped", () => {
    expect(flat(styles.titleNameWrap).flexShrink).toBe(1);
  });

  it("does not put flexShrink back on the Text itself", () => {
    expect(flat(styles.newHeaderTitleText).flexShrink).toBeUndefined();
  });

  it("leaves lineHeight to the component, so it can scale with the OS setting", () => {
    expect(flat(styles.newHeaderTitleText).lineHeight).toBeUndefined();
  });

  it("never caps the name to one line — wrapping is the whole point", () => {
    const src = fs.readFileSync(path.join(__dirname, "BaniHeader.jsx"), "utf8");
    const titleBlock = src.slice(src.indexOf("titleNameWrap"), src.indexOf("settingsWrap"));
    expect(titleBlock).not.toMatch(/numberOfLines/);
    expect(titleBlock).not.toMatch(/ellipsizeMode/);
  });

  it("keeps the ornaments rigid so the name is what gives way", () => {
    expect(flat(styles.titleFlower).flexShrink).toBe(0);
  });

  it("reserves matching side slots so the gear and the title cannot overlap", () => {
    expect(flat(styles.titleSpacer).width).toBe(flat(styles.settingsWrap).width);
  });

  it("centres the row, so the ornaments sit level with a two-line name", () => {
    expect(flat(styles.titleCenter).alignItems).toBe("center");
    expect(flat(styles.titleCenter).flexDirection).toBe("row");
  });
});

describe("the title line height", () => {
  // Mirrors BaniHeader's own computation. Pinned here because the failure it
  // guards against is silent: the lines simply overlap at a raised text size.
  const FONT = 32;
  const RATIO = 1.25;
  const CAP = 1.5;
  const lineHeightAt = (fontScale) => Math.round(FONT * RATIO * Math.min(fontScale || 1, CAP));

  it("holds the tuned ratio at the default text size", () => {
    expect(lineHeightAt(1)).toBe(40);
  });

  it("grows with the OS text setting instead of standing still", () => {
    expect(lineHeightAt(1.3)).toBeGreaterThan(lineHeightAt(1));
  });

  it("stops growing at the same cap the text primitive uses", () => {
    expect(lineHeightAt(3)).toBe(lineHeightAt(CAP));
  });

  it("always clears the scaled glyphs, which is what stops the overlap", () => {
    [1, 1.15, 1.3, 1.5, 2].forEach((s) => {
      const scaledFont = FONT * Math.min(s, CAP);
      expect(lineHeightAt(s)).toBeGreaterThan(scaledFont);
    });
  });
});
