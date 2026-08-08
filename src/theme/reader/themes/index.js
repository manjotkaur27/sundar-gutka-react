// Reading-theme registry.
//
// Adding a theme is three things: one file next to these, one import plus one
// array entry here, and one `reader_theme_<id>` string per language in
// src/common/localization.js. Nothing else in the app has to learn it exists —
// the Settings grid, the thumbnails and the contrast guard all iterate this
// array, so a new theme gets its tile, its preview and its test coverage for
// free.

import blue from "./blue";
import dark from "./dark";
import kesari from "./kesari";
import light from "./light";
import puratan from "./puratan";
import sanjh from "./sanjh";
import white from "./white";

export const READER_THEMES = [light, dark, blue, kesari, puratan, white, sanjh].sort(
  (a, b) => a.order - b.order
);

export const READER_THEMES_BY_ID = READER_THEMES.reduce((acc, theme) => {
  acc[theme.id] = theme;
  return acc;
}, {});

export default READER_THEMES;
