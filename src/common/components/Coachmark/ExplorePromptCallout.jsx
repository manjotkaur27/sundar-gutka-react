import React from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import GuideCallout from "./GuideCallout";
import STRINGS from "../../localization";
import { markCoachmarkSeen, setGuideStep, setTourOptedOut } from "../../actions";
import { navigate } from "../../rootNavigation";
import constant from "../../constant";
import { CURRENT_TOUR_VERSION } from "../../onboarding/tourVersion";
import useCoachmark from "../../onboarding/useCoachmark";
import { COACH } from "../../onboarding/coachmarkKeys";

/**
 * Optional prompt shown in the full player right AFTER the player coachmark
 * (play + download) finishes: "want to learn to manage your downloads?".
 * "Show me" kicks off the cross-screen guide (setGuideStep -> reader points at
 * Settings, Settings points at Manage Downloads). Shows once per tour version.
 */
const ExplorePromptCallout = ({ visible }) => {
  const dispatch = useDispatch();
  const { shouldShow: playerNotSeen } = useCoachmark(COACH.PLAYER);
  const { shouldShow: exploreNotSeen } = useCoachmark(COACH.EXPLORE);

  // Only once the player coachmark is done, once, while the full player is up.
  if (!visible || playerNotSeen || !exploreNotSeen) return null;

  const markSeen = () => dispatch(markCoachmarkSeen(COACH.EXPLORE, CURRENT_TOUR_VERSION));

  return (
    <GuideCallout
      bottom={240}
      text={STRINGS.TOUR_EXPLORE_DOWNLOADS_BODY}
      secondaryLabel={STRINGS.TOUR_EXPLORE_NO}
      // "Not now" opts the user out of the whole tour, not just this prompt.
      onSecondary={() => {
        markSeen();
        dispatch(setTourOptedOut(true));
      }}
      primaryLabel={STRINGS.TOUR_EXPLORE_YES}
      // "Show me" takes the user to Settings itself (no "tap Settings" step) and
      // flags the guide so Settings scrolls to + spotlights the Manage Downloads row.
      onPrimary={() => {
        markSeen();
        dispatch(setGuideStep("manage"));
        navigate(constant.SETTINGS, { fromReader: true });
      }}
    />
  );
};

ExplorePromptCallout.propTypes = {
  visible: PropTypes.bool,
};

ExplorePromptCallout.defaultProps = {
  visible: false,
};

export default ExplorePromptCallout;
