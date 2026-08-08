import defineReaderTheme from "../schema";

// Saffron ivory with sepia ink.
//
// Deliberately NOT the STTM Desktop "Khalsa Gold" approach of white text on a
// saturated saffron ground — that pair measures 1.4:1 and is legible only
// because of a drop shadow, which is unreadable on a phone outdoors. Here
// saffron is the warmth of the paper, not the ink.
export default defineReaderTheme({
  id: "kesari",
  nameKey: "reader_theme_kesari",
  base: "light",
  order: 4,

  palette: {
    ground: "#FFF6E9",
    ink: "#5C2E00",
    // #C2410C measures 4.84:1 — clears AA, but leaves no headroom on a warm
    // ground in sunlight. This is the deeper burnt orange.
    accent: "#9A3412",
    muted: "#8A5A2B",
    rule: "#E8C89A",
  },

  // The standard orange mark disappears into a saffron ground, so both are
  // deepened to stay distinct from the paper and from each other.
  vishraam: { main: "#B4530A", yamki: "#1F7A5C" },

  typography: { lineHeightRatio: 1.68 },

  border: { width: 1, radius: 4 },
});
