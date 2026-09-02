/* eslint-env jest */
import fs from "fs";
import path from "path";
import { NATURAL_LINE_BOX } from "./lineHeight";

// Guards the screens that were clipping Gurmukhi and Devanagari on iPhone.
//
// A pinned `lineHeight` below the face's own box is not a portable
// instruction: Android tightens the leading around the glyphs, iOS drops the
// baseline and cuts the ascent off. Every value in the files below sat under
// that box, so each one now goes through `androidLineHeight` — see
// @theme/lineHeight for the mechanism and the measurements.
//
// This reads the source rather than the built styles because several of these
// live in `StyleSheet.create` calls inside components that would drag half the
// app into the test, and because the failure being guarded is textual: someone
// adding a raw `lineHeight: 18` back to one of these screens.

const ROOT = path.join(__dirname, "..");

const GUARDED = [
  "ReaderScreen/components/AudioPlayer/style.js",
  "ManageDownloads/styles.js",
  "SevaScreen/styles.js",
  "SevaScreen/sevaMeansStyles.js",
  "DashboardScreen/components/DashboardHeader.jsx",
  "DashboardScreen/components/DayDetailModal.jsx",
  "DashboardScreen/components/Discover.jsx",
  "DashboardScreen/components/FeatureTilesRow.jsx",
  "DashboardScreen/components/KhalisAppsCarousel.jsx",
  "DashboardScreen/components/MostListenedSection.jsx",
  "DashboardScreen/components/MostReadSection.jsx",
  "DatabaseUpdate/components/styles.jsx",
  "common/components/OnboardingCarousel/style.jsx",
  "common/components/OnboardingCarousel/index.jsx",
];

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

describe.each(GUARDED)("%s", (rel) => {
  const src = read(rel);

  it("routes every pinned line height through androidLineHeight", () => {
    const raw = src
      .split(/\r?\n/)
      .map((line, i) => [i + 1, line])
      .filter(([, line]) => /\blineHeight:/.test(line))
      .filter(([, line]) => !/lineHeight:\s*androidLineHeight\(/.test(line))
      .filter(([, line]) => !/lineHeight:\s*bodyLineHeight\b/.test(line))
      .map(([n, line]) => `${n}: ${line.trim()}`);

    expect(raw).toEqual([]);
  });

  it("imports the helper it uses", () => {
    expect(src).toMatch(/import \{ androidLineHeight \} from "@theme\/lineHeight";/);
  });
});

// The two values the pill's own layout depends on, kept honest against the
// metrics rather than against a remembered number.
describe("the collapsed audio pill", () => {
  const style = read("ReaderScreen/components/AudioPlayer/style.js");

  it("sizes to its content instead of pinning a height", () => {
    // Without a pinned line height the two stacked lines measure
    // 12 * 1.771 + 14 * 1.771 - 1.5 ~= 44.5 on iOS, which a fixed 44 clipped.
    const stack = (12 + 14) * NATURAL_LINE_BOX.baloo - 1.5;
    expect(stack).toBeGreaterThan(44);
    expect(style).toMatch(/minHeight: 44,/);
    expect(style).not.toMatch(/^\s+height: 44,$/m);
  });
});

// The bottom bar already sits inside a bottom-edge SafeArea, so anything it
// adds on top of that is a second helping of the same inset — which is what
// made the iOS bar stand taller than the Reader's arithmetic for it.
describe("the bottom navigation bar", () => {
  // Comments stripped: the note explaining the removal names the very code it
  // removed, and the assertions below are about what still RUNS.
  const code = read("common/components/BottomNavigation/index.jsx")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("still lets the SafeArea pad the inset", () => {
    expect(code).toMatch(/edges=\{\["bottom"\]\}/);
  });

  it("adds nothing on top of it", () => {
    expect(code).not.toMatch(/paddingBottom/);
    expect(code).not.toMatch(/insets\.bottom/);
  });
});
