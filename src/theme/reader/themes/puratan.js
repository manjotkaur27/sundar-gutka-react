import defineReaderTheme from "../schema";
import { PAPER_GRAIN } from "../textures";

// Aged pothi — parchment ground, laid-paper grain, a ruled two-rule frame.
//
// The worked example for anyone adding a theme: it exercises every optional
// property in the schema (background image, opacity, tiling, a second border
// rule, a preferred font face, seeded defaults) and STILL states nothing that
// the five primitives can work out for themselves.
export default defineReaderTheme({
  id: "puratan",
  nameKey: "reader_theme_puratan",
  base: "light",
  order: 5,

  palette: {
    ground: "#F2E5C8",
    ink: "#2E1F0F",
    accent: "#6B2020",
    muted: "#6E5638",
    rule: "#C4A97A",
  },

  background: {
    image: PAPER_GRAIN,
    imageOpacity: 0.16,
    imageRepeat: "repeat",
    imageSize: "140px 140px",
  },

  vishraam: { main: "#9C3B1B", yamki: "#5A6B1F" },

  typography: {
    lineHeightRatio: 1.72,
    // A manuscript theme suggests the traditional face. Seeded once, so the
    // user's own Bani Font choice always wins afterwards — see setReaderTheme().
    //
    // A literal rather than constant.ANMOL_LIPI: importing @common here would
    // make the theme registry depend on the app barrel, which is a cycle
    // (@common/actions imports this registry) and would stop the registry
    // loading in a plain Jest context.
    preferredFontFace: "AnmolLipiSG",
  },

  // Two concentric rules, 5px apart. Deliberately NOT a CSS `double` border:
  // that renders line / TRANSPARENT gap / line, and scrolling text showed
  // through the gap between the two rectangles on all four sides. gutkahtml.js
  // builds the pair from opaque concentric rings instead, so the Bani is always
  // confined inside the innermost rule.
  border: { width: 1, radius: 2, inset: 12, gap: 5 },

  // A manuscript theme is chosen by people reading along with the Gurmukhi, so
  // it suggests transliteration on. Seeded once and never again.
  defaults: { isTransliteration: true },
});
