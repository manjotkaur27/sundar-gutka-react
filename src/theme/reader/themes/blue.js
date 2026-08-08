import { appNav } from "../bases/appBase";
import defineReaderTheme from "../schema";

// Darbar midnight — a deep navy ground under cool, high-luminance ink.
export default defineReaderTheme({
  id: "blue",
  nameKey: "reader_theme_blue",
  base: "dark",
  order: 3,

  palette: {
    ground: "#0A1A33",
    ink: "#E8F2FF",
    accent: "#7FC4FF",
    muted: "#8FB8E8",
    rule: "#1D3D6B",
  },

  // Warm marks on a cool ground. The fixed teal/orange reading pair goes muddy
  // against this navy, so both are lifted — the one thing worth overriding here.
  vishraam: { main: "#FFA35C", yamki: "#5BD9B8" },

  typography: { lineHeightRatio: 1.65 },

  // A hairline frame lifts the text block off a very dark ground; without it the
  // page reads as an edgeless void on an OLED panel, where the ground is a true
  // black cutoff rather than a surface. The colour comes from `rule`.
  border: { width: 1 },

  // The app's own dark navigation bar, unchanged — the same navy with white
  // icons that every screen outside the Reader wears. A bar derived from this
  // theme's ground comes out a lighter navy, and the two sitting one tap apart
  // read as a bug rather than a theme.
  nav: appNav("dark"),
});
