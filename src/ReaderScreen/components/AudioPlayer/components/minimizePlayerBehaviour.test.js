import fs from "fs";
import path from "path";

// The circle player's play/pause button is asymmetric on purpose.
//
//   playing -> PAUSE  : open the full player.
//     Pausing is the moment someone wants the controls — to scrub, change track
//     or close — so the full player comes to them instead of making them hunt
//     for it.
//
//   paused  -> RESUME : change nothing but the playback state.
//     They are settling back into listening, so the player must not grow,
//     expand or move under them. Re-arming the collapse timer here is what made
//     it flip into the pill form on resume.
//
// Asserted against the source rather than by rendering: the component owns a
// drag gesture, three animated values and a collapse timer, and driving all of
// that under jest would test the harness more than the rule.

const source = fs.readFileSync(path.join(__dirname, "MinimizePlayer.jsx"), "utf8");

const handler = source.slice(
  source.indexOf("const onPlayPausePress"),
  source.indexOf("// Widest the text panel")
);

describe("circle player play/pause", () => {
  it("captures the playing state BEFORE toggling it", () => {
    // handlePlayPause() flips the state, so reading `isPlaying` afterwards
    // would branch on the new value and invert both behaviours.
    const beforeToggle = handler.indexOf("const wasPlaying = isPlaying");
    const toggle = handler.indexOf("handlePlayPause()");
    expect(beforeToggle).toBeGreaterThanOrEqual(0);
    expect(beforeToggle).toBeLessThan(toggle);
  });

  it("opens the full player when pausing", () => {
    expect(handler).toMatch(/if \(wasPlaying\)/);
    expect(handler).toMatch(/setMinimized\(false, "pause"\)/);
  });

  it("does nothing else when resuming", () => {
    // Everything after the pause branch returns; no expand, no collapse timer.
    const afterReturn = handler.slice(handler.indexOf("return;"));
    expect(afterReturn).not.toMatch(/armCollapse\(\)/);
    expect(afterReturn).not.toMatch(/setForm\(/);
  });

  it("opens the full player WITHOUT raising the Reader's chrome", () => {
    // Pausing asks for the controls, not the nav bar and header.
    const pauseBranch = handler.slice(handler.indexOf("if (wasPlaying)"));
    expect(pauseBranch).toMatch(/onHideBars\(\)/);
  });
});

// The pill body is the OTHER way into the full player, and it carries the same
// rule. This is the whole reason the two paths behaved differently: pausing
// always asked for the chrome to stay down, while tapping the pill called
// setIsMinimized and nothing else, so nothing kept the bars away.
describe("tapping the mini player", () => {
  const open = source.slice(
    source.indexOf("const openFullPlayer"),
    source.indexOf("// Widest the text panel")
  );

  it("opens the full player and keeps the bars down", () => {
    expect(open).toMatch(/setMinimized\(false, "mini_tap"\)/);
    expect(open).toMatch(/onHideBars\(\)/);
  });

  it("is what the pill body is wired to", () => {
    expect(source).toMatch(/onPress=\{openFullPlayer\}/);
    // No path left that opens the player without saying anything about the bars.
    expect(source).not.toMatch(/setIsMinimized\(/);
  });
});

describe("a tap on the bani expands the circle player", () => {
  // Reaching the pill from the circle must not depend on what state the pill
  // happens to be in. Toggling meant a tap while already expanded collapsed it.
  const tapEffect = source.slice(
    source.indexOf("// A tap anywhere in the bani WebView"),
    source.indexOf("}, [tapTick, setForm]);")
  );

  it("expands rather than toggling", () => {
    expect(tapEffect).toMatch(/setForm\(true, "reader_tap"\)/);
    expect(tapEffect).not.toMatch(/!prev/);
  });
});

// Two things shrink the pill and two grow it, and each is a conversion counted
// exactly once, because there is only one way to change the form.
describe("mini <-> micro conversions", () => {
  it("shrinks after five seconds of stillness", () => {
    expect(source).toMatch(/COLLAPSE_DELAY_MS = 5000/);
    expect(source).toMatch(/setForm\(false, "idle"\), COLLAPSE_DELAY_MS/);
  });

  it("shrinks on a scroll down", () => {
    const effect = source.slice(
      source.indexOf("// Scrolling DOWN shrinks"),
      source.indexOf("// When the nav bar")
    );
    expect(effect).toMatch(/setForm\(false, "scroll_down"\)/);
    // Every counter starts at 0 and the effect runs on mount; without the guard
    // the player would collapse the instant it appeared.
    expect(effect).toMatch(/scrollInitRef\.current/);
  });

  it("grows again when the bars come back", () => {
    expect(source).toMatch(/setForm\(true, "scroll_up"\)/);
  });

  it("has exactly one path between the two forms", () => {
    // Anything calling setIsExpanded directly would change the form without
    // recording it, which is how the analytics would drift from the UI.
    expect(source.match(/setIsExpanded\(/g) ?? []).toHaveLength(1);
    const funnel = source.slice(
      source.indexOf("const setForm"),
      source.indexOf("const armCollapse")
    );
    expect(funnel).toMatch(/trackPlayerForm\(expanded \? "mini" : "micro", trigger\)/);
    expect(funnel).toMatch(/if \(isExpandedRef\.current === expanded\) return;/);
  });

  it("is a circle in the micro form, not a rounded box", () => {
    // Padding and glyph are rounded to the device scale independently, so
    // summing them came out a pixel or two wide at some sizes.
    const at = source.indexOf("const microStyle");
    const micro = source.slice(at, source.indexOf("return (", at));
    expect(micro).toMatch(/width: metrics\.pillHeight/);
    expect(micro).toMatch(/paddingHorizontal: 0/);
  });
});

// The mini/full pair is funnelled the same way, one level up.
describe("mini <-> full conversions", () => {
  const controlBar = fs.readFileSync(path.join(__dirname, "AudioControlBar", "index.jsx"), "utf8");

  it("goes through one deduped, tracked path", () => {
    expect(controlBar).toMatch(/if \(isMinimizedRef\.current === minimized\) return;/);
    expect(controlBar).toMatch(/trackPlayerForm\(minimized \? "mini" : "full", trigger\)/);
  });

  it("records the collapse control as its own trigger", () => {
    expect(controlBar).toMatch(/setMinimized\(true, "control"\)/);
  });
});
