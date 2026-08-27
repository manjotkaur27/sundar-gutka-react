/**
 * @jest-environment jsdom
 *
 * Regression tests for the sync-scroll line enlargement in the injected
 * WebView script. The old implementation derived sizes from getComputedStyle
 * and wrote absolute px back to el.style.fontSize; under Android's textZoom
 * (computed = specified × system font scale) that multiplied a line's size by
 * the font scale on every highlight/restore cycle, so lines drifted smaller or
 * larger without bound. These tests lock the class-based replacement:
 * exactly one .sync-enlarged node while highlighted (the sung Gurmukhi line
 * only), zero after any reset, and inline font-size never rewritten.
 */
/* global window, document, Element */
import script from "./gutkaScript";

jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));

// The real light reading-theme record, not a hand-written stub: the highlight
// behind a sung verse comes from the theme now, and a stub would drift from the
// app the moment a slot was added or renamed.
const theme = require("@theme/reader/themes").READER_THEMES_BY_ID.light;

// Mirrors the DOM that loadHTML/createDiv emit in line mode: one .text-item
// per verse, each holding a gurmukhi div plus translit/translation siblings.
// The Punjabi translation div carries the gurmukhi CLASS (font) but a
// translation data-type — the enlargement must key on data-type.
const LINE_MODE_HTML = `
  <div id="101" class="text-item" data-sequence="1">
    <div class="content-item gurmukhi center" data-type="gurmukhi" style="--fs: 32.4px; font-size: var(--fs);">verse one</div>
    <div class="content-item transliteration center" data-type="transliteration" style="--fs: 25.92px; font-size: var(--fs);">translit one</div>
    <div class="content-item gurmukhi center" data-type="translation" style="--fs: 25.92px; font-size: var(--fs);">punjabi translation one</div>
  </div>
  <div id="102" class="text-item" data-sequence="2">
    <div class="content-item gurmukhi center" data-type="gurmukhi" style="--fs: 32.4px; font-size: var(--fs);">verse two</div>
  </div>
`;

// Mirrors paragraph mode: verses merged into one .text-item, each verse
// wrapped by db.js in a .pline span carrying its sequence.
const PARAGRAPH_MODE_HTML = `
  <div id="201" class="text-item" data-sequence="1" data-sequences="|1|2|3|">
    <div class="content-item gurmukhi left" data-type="gurmukhi" style="--fs: 32.4px; font-size: var(--fs);">
      <span class="pline" data-pseq="1">verse one</span>
      <span class="pline" data-pseq="2">verse two</span>
      <span class="pline" data-pseq="3">verse three</span>
    </div>
    <div class="content-item transliteration left" data-type="transliteration" style="--fs: 25.92px; font-size: var(--fs);">translit paragraph</div>
  </div>
`;

const send = (payload) => {
  window.dispatchEvent(new window.MessageEvent("message", { data: JSON.stringify(payload) }));
};

const scrollToSequence = (sequence, isParagraphMode = false, timeout = 5000) =>
  send({ action: "scrollToSequence", sequence, behavior: "auto", timeout, isParagraphMode });

const enlargedNodes = () => document.querySelectorAll(".sync-enlarged");

let scrolledTo;

beforeAll(() => {
  window.ReactNativeWebView = { postMessage: jest.fn() };
  // jsdom implements neither scrollIntoView nor layout; record the targets.
  Element.prototype.scrollIntoView = function scrollIntoViewStub() {
    scrolledTo.push(this);
  };
  // The script attaches its listeners once; per-test state is cleared through
  // its own resetHighlight path in beforeEach below.
  // Executing the generated script string in the jsdom window is exactly how
  // the WebView runs it in production.
  // eslint-disable-next-line no-eval
  window.eval(script(theme));
});

beforeEach(() => {
  jest.useFakeTimers();
  scrolledTo = [];
  send({ resetHighlight: true });
  document.body.innerHTML = LINE_MODE_HTML;
});

afterEach(() => {
  jest.useRealTimers();
});

describe("sync-scroll enlargement (line mode)", () => {
  it("enlarges only the sung verse's Gurmukhi line", () => {
    scrollToSequence(1);

    const enlarged = enlargedNodes();
    expect(enlarged).toHaveLength(1);
    expect(enlarged[0]).toBe(
      document.getElementById("101").querySelector('[data-type="gurmukhi"]')
    );
    // Neither the transliteration nor the Punjabi translation (which shares
    // the gurmukhi CSS class) may enlarge.
    expect(
      document.getElementById("101").querySelector(".transliteration").classList
    ).not.toContain("sync-enlarged");
    expect(
      document.getElementById("101").querySelector('[data-type="translation"]').classList
    ).not.toContain("sync-enlarged");
  });

  it("moves the enlargement when the sung line changes", () => {
    scrollToSequence(1);
    scrollToSequence(2);

    const enlarged = enlargedNodes();
    expect(enlarged).toHaveLength(1);
    expect(enlarged[0]).toBe(
      document.getElementById("102").querySelector('[data-type="gurmukhi"]')
    );
  });

  it("clears every enlargement on resetHighlight", () => {
    scrollToSequence(1);
    send({ resetHighlight: true });

    expect(enlargedNodes()).toHaveLength(0);
  });

  it("never rewrites inline font-size across repeated highlight/reset cycles (textZoom drift regression)", () => {
    const gurmukhi = document.getElementById("101").querySelector('[data-type="gurmukhi"]');
    const originalInlineStyle = gurmukhi.getAttribute("style");

    for (let cycle = 0; cycle < 5; cycle += 1) {
      scrollToSequence(1);
      // The inline style must never be touched, highlighted or not — sizing is
      // class-driven. (Asserting on the raw attribute, not style.fontSize:
      // jsdom's CSSOM can't represent var() values.)
      expect(gurmukhi.getAttribute("style")).toBe(originalInlineStyle);
      send({ resetHighlight: true });
    }

    expect(enlargedNodes()).toHaveLength(0);
    expect(gurmukhi.getAttribute("style")).toBe(originalInlineStyle);
  });

  it("removes the enlargement when the highlight timeout elapses", () => {
    scrollToSequence(1, false, 700);
    expect(enlargedNodes()).toHaveLength(1);

    jest.advanceTimersByTime(800);
    expect(enlargedNodes()).toHaveLength(0);
  });

  it("keeps the enlargement when frozen (audio paused)", () => {
    scrollToSequence(1, false, 700);
    send({ freezeHighlight: true });

    jest.advanceTimersByTime(5000);
    expect(enlargedNodes()).toHaveLength(1);
  });
});

describe("sync-scroll enlargement (paragraph mode)", () => {
  beforeEach(() => {
    document.body.innerHTML = PARAGRAPH_MODE_HTML;
  });

  it("enlarges only the sung verse's .pline span, not the whole paragraph", () => {
    scrollToSequence(2, true);

    const enlarged = enlargedNodes();
    expect(enlarged).toHaveLength(1);
    expect(enlarged[0]).toBe(document.querySelector('.pline[data-pseq="2"]'));
    expect(document.querySelector('[data-type="gurmukhi"]').classList).not.toContain(
      "sync-enlarged"
    );
  });

  it("moves the enlargement and re-scrolls for a line change WITHIN one paragraph", () => {
    scrollToSequence(2, true);
    const scrollsAfterFirst = scrolledTo.length;
    scrollToSequence(3, true);

    const enlarged = enlargedNodes();
    expect(enlarged).toHaveLength(1);
    expect(enlarged[0]).toBe(document.querySelector('.pline[data-pseq="3"]'));
    // The old element-level check skipped this scroll (same .text-item), so
    // later lines of a long paragraph could sit off-screen.
    expect(scrolledTo.length).toBeGreaterThan(scrollsAfterFirst);
    expect(scrolledTo[scrolledTo.length - 1]).toBe(document.querySelector('.pline[data-pseq="3"]'));
  });

  it("clears the paragraph span enlargement on resetHighlight", () => {
    scrollToSequence(1, true);
    send({ resetHighlight: true });

    expect(enlargedNodes()).toHaveLength(0);
  });
});

// Auto-scroll rate. The slider runs 1–100; each step is worth a fixed number
// of px/s (times the multiplier the app sends). This pins that number, so a
// "make it faster" change is deliberate rather than a side effect.
describe("auto-scroll rate", () => {
  const PX_PER_SECOND_PER_STEP = 0.825;

  // Stop the loop and give it a frame to notice, so each measurement starts
  // from a dead loop whatever the previous one left behind.
  const stop = () => {
    send({ autoScroll: 0, scrollMultiplier: 1 });
    jest.advanceTimersByTime(100);
  };

  const measure = (speed, multiplier) => {
    stop();
    // jsdom has no layout: give the page somewhere to scroll to.
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 100000,
    });
    window.innerHeight = 800;
    window.scrollBy = jest.fn();

    const started = window.performance.now();
    send({ autoScroll: speed, scrollMultiplier: multiplier });
    // Twenty animation frames.
    for (let i = 0; i < 20; i += 1) jest.advanceTimersByTime(16);
    const elapsedSec = (window.performance.now() - started) / 1000;
    const scrolled = window.scrollBy.mock.calls.reduce((sum, [, px]) => sum + px, 0);
    stop();
    return scrolled / elapsedSec;
  };

  it("scrolls at 0.825 px/s per slider step, times the multiplier", () => {
    const rate = measure(40, 1.5);
    // Within 3%: the loop holds back any sub-half-pixel remainder each frame.
    expect(Math.abs(rate / (40 * PX_PER_SECOND_PER_STEP * 1.5) - 1)).toBeLessThan(0.03);
  });

  it("is linear in the slider value", () => {
    const slow = measure(20, 1);
    const fast = measure(80, 1);
    expect(Math.abs(fast / slow / 4 - 1)).toBeLessThan(0.03);
  });
});
