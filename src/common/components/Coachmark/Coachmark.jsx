import React, { useCallback, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { SpotlightTourProvider } from "react-native-spotlight-tour";
import { useDispatch } from "react-redux";
import { markCoachmarkSeen } from "../../actions";
import { trackTourEvent } from "../../firebase/analytics";
import { CURRENT_TOUR_VERSION } from "../../onboarding/tourVersion";
import useCoachmark from "../../onboarding/useCoachmark";

/**
 * Wraps a screen subtree in a SpotlightTourProvider and auto-starts its
 * contextual coachmark sequence the first time that screen/control is actually
 * on screen (`active`), once per tour version. Because the provider is just a
 * Context.Provider + a Modal overlay (no layout wrapper), it's safe to wrap any
 * subtree, including absolutely-positioned components.
 *
 * Inside `children`, wrap each highlight target with <AttachStep index={n}>
 * (from react-native-spotlight-tour), where n matches the position in `steps`.
 */
const Coachmark = ({ coachKey, steps, active, startDelay, placement, onStop, children }) => {
  const dispatch = useDispatch();
  const { shouldShow } = useCoachmark(coachKey);
  const tourRef = useRef(null);
  const startedRef = useRef(false);

  // Both "Skip" and finishing the last step call stop(), so this is the single
  // place the coachmark is marked seen — it won't auto-show again this version.
  // An optional onStop lets the host clear any driving state (e.g. guideStep) so
  // a second mounted instance of the same screen can't re-trigger it.
  const handleStop = useCallback(() => {
    dispatch(markCoachmarkSeen(coachKey, CURRENT_TOUR_VERSION));
    trackTourEvent("coachmark_seen", coachKey);
    onStop?.();
  }, [dispatch, coachKey, onStop]);

  useEffect(() => {
    if (!active || !shouldShow || startedRef.current) return undefined;
    // Small delay lets the target(s) finish laying out before the library
    // measures them, so the very first spotlight is positioned correctly.
    const timer = setTimeout(() => {
      startedRef.current = true;
      tourRef.current?.start();
    }, startDelay);
    return () => clearTimeout(timer);
  }, [active, shouldShow, startDelay]);

  return (
    <SpotlightTourProvider
      ref={tourRef}
      steps={steps}
      overlayColor="#000"
      overlayOpacity={0.7}
      // "fade" + the library patch gives a fast crossfade between steps: the
      // cutout fades out, jumps to the next target while invisible, then fades
      // back in (~130ms each way). We never animate the SVG cutout's position
      // on the JS thread — that was the ~12fps jank — so this stays smooth.
      motion="fade"
      shape={{ type: "rectangle", padding: 10 }}
      // placement is the side the tooltip prefers; flip/shift (on by default)
      // keep it on screen. We point it AWAY from where the target sits (e.g.
      // "top" for the bottom audio bar) so it never spawns off the edge.
      placement={placement}
      arrow
      onStop={handleStop}
      nativeDriver={false}
    >
      {children}
    </SpotlightTourProvider>
  );
};

Coachmark.propTypes = {
  coachKey: PropTypes.string.isRequired,
  steps: PropTypes.arrayOf(PropTypes.object).isRequired,
  active: PropTypes.bool,
  startDelay: PropTypes.number,
  placement: PropTypes.string,
  onStop: PropTypes.func,
  children: PropTypes.node,
};

Coachmark.defaultProps = {
  active: true,
  startDelay: 700,
  placement: "bottom",
  onStop: undefined,
  children: null,
};

export default Coachmark;
