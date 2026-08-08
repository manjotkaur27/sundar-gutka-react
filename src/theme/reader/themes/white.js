import defineReaderTheme from "../schema";

// Maximum contrast, distraction-free.
//
// Distinct from Light, which keeps the brand blue on headings and
// transliteration. White is fully achromatic — the accent IS the ink, so
// nothing competes with the Gurbani. The accessibility choice, for low vision
// and for bright sunlight.
export default defineReaderTheme({
  id: "white",
  nameKey: "reader_theme_white",
  base: "light",
  order: 6,

  palette: {
    ground: "#FFFFFF",
    ink: "#000000",
    // Achromatic by design: no separate accent hue.
    accent: "#000000",
    // Stated rather than derived: the derived step would be a lighter grey, and
    // this is the darkest one that still reads as secondary — 12.63:1, AAA.
    muted: "#333333",
    // No `rule`. The derived translucent ink is right here: an achromatic theme
    // has no third colour to draw dividers in.
  },

  // Deepened from the standard pair so both marks clear AA on pure white, which
  // the lighter teal does not.
  vishraam: { main: "#8A2B00", yamki: "#00584A" },

  // Generous leading and a slightly larger base size. `fontScale` MULTIPLIES the
  // user's own font-size setting rather than replacing it, so their choice still
  // governs — a theme must not take an accessibility control away.
  typography: { lineHeightRatio: 1.8, fontScale: 1.08 },
});
