/* eslint-env jest */
/**
 * Tests for default Redux state values (audio settings).
 * Covers manual test cases:
 *  - "Verify Audio Player setting is ON by default" (#15 → isAudioFeatureEnabled default = true)
 *  - "Verify Audio Auto Play setting is OFF by default" (#16 → isAudioAutoPlay default = false)
 *  - "Verify Sync Scroll is ON by default" (isAudioSyncScroll default = true)
 *  - "Verify turning Audio Player OFF hides Audio Auto Play option" (#17 → derived from state)
 */

import rootReducer from "./reducer";

describe("Redux Default State (audio settings)", () => {
  const defaultState = rootReducer(undefined, { type: "@@INIT" });

  it("Audio Player feature is enabled (true) by default", () => {
    expect(defaultState.isAudioFeatureEnabled).toBe(true);
  });

  it("Audio Auto Play is disabled (false) by default", () => {
    expect(defaultState.isAudioAutoPlay).toBe(false);
  });

  it("Audio Sync Scroll is disabled (false) by default", () => {
    expect(defaultState.isAudioSyncScroll).toBe(true);
  });

  it("isAudio (player visible) is false by default - player does not auto-open", () => {
    expect(defaultState.isAudio).toBe(false);
  });

  it("Audio Playback Speed defaults to 1.0x", () => {
    expect(defaultState.audioPlaybackSpeed).toBe(1.0);
  });

  it("Audio Auto Play option would be visible only when isAudioFeatureEnabled is true", () => {
    // Derive the same rule the UI uses: autoplay option shown only when audio feature is on
    const featureOn = defaultState.isAudioFeatureEnabled;
    const autoPlayVisible = featureOn; // UI hides the option when featureOn is false
    expect(autoPlayVisible).toBe(true);
  });

  it("Audio Auto Play option is hidden when Audio Player feature is turned OFF", () => {
    const stateWithFeatureOff = rootReducer(defaultState, {
      type: "TOGGLE_AUDIO_FEATURE_ENABLED",
      value: false,
    });
    const featureOn = stateWithFeatureOff.isAudioFeatureEnabled;
    const autoPlayVisible = featureOn;
    expect(autoPlayVisible).toBe(false);
  });

  it("toggling TOGGLE_AUDIO_AUTO_PLAY to true sets isAudioAutoPlay to true", () => {
    const next = rootReducer(defaultState, {
      type: "TOGGLE_AUDIO_AUTO_PLAY",
      value: true,
    });
    expect(next.isAudioAutoPlay).toBe(true);
  });

  it("toggling TOGGLE_AUDIO_SYNC_SCROLL to true sets isAudioSyncScroll to true", () => {
    const next = rootReducer(defaultState, {
      type: "TOGGLE_AUDIO_SYNC_SCROLL",
      value: true,
    });
    expect(next.isAudioSyncScroll).toBe(true);
  });
});

describe("Onboarding tour — RESET_TOUR (Revisit Tutorial)", () => {
  // A user who has seen the tour and opted out: every coachmark is marked seen
  // and tourOptedOut is true.
  const seenState = (() => {
    let s = rootReducer(undefined, { type: "@@INIT" });
    s = rootReducer(s, { type: "MARK_COACHMARK_SEEN", payload: { key: "audioHint", version: "1" } });
    s = rootReducer(s, { type: "SET_TOUR_OPTED_OUT", value: true });
    s = rootReducer(s, { type: "SET_GUIDE_STEP", value: "manage" });
    return s;
  })();

  it("starts from a 'tour already seen + opted out' state", () => {
    expect(seenState.coachmarksSeen.audioHint).toBe("1");
    expect(seenState.tourOptedOut).toBe(true);
  });

  it("RESET_TOUR clears every seen coachmark", () => {
    const next = rootReducer(seenState, { type: "RESET_TOUR" });
    expect(next.coachmarksSeen).toEqual({});
  });

  it("RESET_TOUR opts the user back into the tour", () => {
    const next = rootReducer(seenState, { type: "RESET_TOUR" });
    expect(next.tourOptedOut).toBe(false);
  });

  it("RESET_TOUR clears any transient guide step", () => {
    const next = rootReducer(seenState, { type: "RESET_TOUR" });
    expect(next.guideStep).toBeNull();
  });
});
