import { READER_THEMES, READER_THEMES_BY_ID } from "@theme/reader";
import constant from "@common/constant";

// The theme picker's contents, in order.
//
// There is ONE setting — `state.theme` — holding either an appearance keyword
// or a designed theme's id, so a tile has to carry both what it STORES and
// which record to draw its preview from. The two are not the same string: the
// appearance keywords are capitalised and long-persisted ("Light"), while a
// record's id is its lowercase key ("light"). Keeping the mapping here means
// the storage format never has to change and no screen has to know about it.
//
// Split out of the screen so a new theme appears in the grid by being added to
// the registry, and nothing here needs editing.

/** Stored value for the tile that follows the device's own light/dark setting. */
export const SYSTEM = constant.Default;

const APPEARANCE_TILES = [
  { value: constant.Light, record: READER_THEMES_BY_ID.light, labelKey: "light" },
  { value: constant.Dark, record: READER_THEMES_BY_ID.dark, labelKey: "dark" },
];

const APPEARANCE_RECORD_IDS = new Set(["light", "dark"]);

/**
 * `[{ value, record, labelKey }]` — System first, then the two plain
 * appearances, then every designed theme in registry order.
 *
 * `record` is null only for System, which has no single appearance to preview.

 */
export const themeOptions = () => [
  { value: SYSTEM, record: null, labelKey: "default" },
  ...APPEARANCE_TILES,
  ...READER_THEMES.filter((t) => !APPEARANCE_RECORD_IDS.has(t.id)).map((t) => ({
    value: t.id,
    record: t,
    labelKey: t.nameKey,
  })),
];

export default themeOptions;
