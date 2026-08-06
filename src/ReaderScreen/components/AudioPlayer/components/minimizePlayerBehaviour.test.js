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
    expect(handler).toMatch(/setIsMinimized\(false\)/);
  });

  it("does nothing else when resuming", () => {
    // Everything after the pause branch returns; no expand, no collapse timer.
    const afterReturn = handler.slice(handler.indexOf("return;"));
    expect(afterReturn).not.toMatch(/armCollapse\(\)/);
    expect(afterReturn).not.toMatch(/setIsExpanded/);
  });

  it("still leaves the pill body able to open the full player", () => {
    // The tap target on the pill itself is unchanged.
    expect(source).toMatch(/onPress=\{\(\) => setIsMinimized\(false\)\}/);
  });
});
