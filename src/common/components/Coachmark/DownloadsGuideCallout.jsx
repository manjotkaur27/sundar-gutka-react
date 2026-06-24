import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import GuideCallout from "./GuideCallout";
import STRINGS from "../../localization";
import { setGuideStep } from "../../actions";

/**
 * Cross-screen "explore your downloads" guide. Driven by the transient
 * `guideStep` state (set by ExplorePromptCallout):
 *  - reader   + guideStep "settings" -> "Tap Settings below"
 *  - settings + guideStep "manage"   -> "Tap Manage Downloads"
 *
 * Each callout is touch-through, so the user taps the REAL Settings / Manage
 * Downloads control. When Settings is reached the step advances; when Manage
 * Downloads is reached, that screen clears the step (and its own coachmark
 * takes over).
 */
const DownloadsGuideCallout = ({ screen, bottom }) => {
  const dispatch = useDispatch();
  const guideStep = useSelector((s) => s.guideStep);

  // Arriving at Settings while guiding -> advance so the callout moves here.
  useEffect(() => {
    if (screen === "settings" && guideStep === "settings") {
      dispatch(setGuideStep("manage"));
    }
  }, [screen, guideStep, dispatch]);

  const dismiss = () => dispatch(setGuideStep(null));

  if (screen === "reader" && guideStep === "settings") {
    return (
      <GuideCallout
        bottom={bottom}
        text={STRINGS.TOUR_TAP_SETTINGS}
        secondaryLabel={STRINGS.TOUR_EXPLORE_NO}
        onSecondary={dismiss}
      />
    );
  }

  if (screen === "settings" && guideStep === "manage") {
    return (
      <GuideCallout
        bottom={bottom}
        text={STRINGS.TOUR_TAP_MANAGE_DOWNLOADS}
        secondaryLabel={STRINGS.TOUR_EXPLORE_NO}
        onSecondary={dismiss}
      />
    );
  }

  return null;
};

DownloadsGuideCallout.propTypes = {
  screen: PropTypes.oneOf(["reader", "settings"]).isRequired,
  bottom: PropTypes.number,
};

DownloadsGuideCallout.defaultProps = {
  bottom: undefined,
};

export default DownloadsGuideCallout;
