import { FONT_SCALE_MAX } from "@theme/scale";
import constant from "./constant";

// How the app's Font Size setting and the OS text-size setting combine.
//
// The app's step multiplies the size a label is written at; React Native then
// applies the OS setting on top, capped by `maxFontSizeMultiplier`. The two
// together never exceed FONT_SCALE_MAX, the ceiling the OS setting alone always
// had, so a phone at its largest text plus Extra Large here is no bigger than
// either one. Small, the default, is 1, so a user who never changes the setting
// sees exactly the OS behaviour they had.

export const FONT_SIZE_MULTIPLIERS = {
  [constant.EXTRA_SMALL]: 0.85,
  [constant.SMALL]: 1,
  [constant.MEDIUM]: 1.15,
  [constant.LARGE]: 1.3,
  [constant.EXTRA_LARGE]: 1.5,
};

/** The app's multiplier for a Font Size setting; an unknown value is the default, 1. */
export const scaleForFontSize = (fontSize) => FONT_SIZE_MULTIPLIERS[fontSize] ?? 1;

/**
 * The `maxFontSizeMultiplier` for text already multiplied by `appScale`, under
 * a ceiling of `max` (FONT_SCALE_MAX, or lower inside a TextScaleLimit).
 */
export const osScaleCap = (appScale, max = FONT_SCALE_MAX) => Math.min(max, max / appScale);

/**
 * The scale text is actually drawn at: the app's multiplier times the OS
 * setting, with the OS part capped as `osScaleCap` caps it. Layout that has to
 * contain text sizes itself from this, so the two always agree.
 */
export const effectiveTextScale = (appScale, osScale, max = FONT_SCALE_MAX) =>
  appScale * Math.min(osScale || 1, osScaleCap(appScale, max));
