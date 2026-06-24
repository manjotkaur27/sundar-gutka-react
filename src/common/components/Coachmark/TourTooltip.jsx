import React from "react";
import { View, Pressable } from "react-native";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import CustomText from "../CustomText";
import STRINGS from "../../localization";
import useThemedStyles from "../../hooks/useThemedStyles";
import { setTourOptedOut, setGuideStep } from "../../actions";
import createStyles from "./style";

/**
 * Themed tooltip rendered inside each coachmark step. Receives the library's
 * RenderProps (current, isLast, next, stop, ...). "Skip" ends the whole
 * sequence; "Next"/"Got it" advances or finishes. Progression is via these
 * buttons (the spotlight overlay is a Modal, so the real element underneath
 * can't be tapped through) — the body text tells the user what each control
 * does.
 */
const TourTooltip = ({ titleKey, bodyKey, total, current, isLast, next, stop }) => {
  const styles = useThemedStyles(createStyles);
  const dispatch = useDispatch();

  // Skip opts the user out of the WHOLE tour (every screen), not just this step.
  // stop() still runs so this coachmark closes and is marked seen as usual.
  const onSkip = () => {
    dispatch(setTourOptedOut(true));
    dispatch(setGuideStep(null));
    stop();
  };

  return (
    <View style={styles.card}>
      {!!titleKey && <CustomText style={styles.title}>{STRINGS[titleKey]}</CustomText>}
      {!!bodyKey && <CustomText style={styles.body}>{STRINGS[bodyKey]}</CustomText>}
      {total > 1 && (
        <CustomText style={styles.progress}>{`${current + 1} / ${total}`}</CustomText>
      )}
      <View style={styles.actions}>
        <Pressable style={styles.skipBtn} onPress={onSkip} hitSlop={8}>
          <CustomText style={styles.skipText}>{STRINGS.TOUR_SKIP}</CustomText>
        </Pressable>
        <Pressable style={styles.nextBtn} onPress={isLast ? stop : next} hitSlop={8}>
          <CustomText style={styles.nextText}>
            {isLast ? STRINGS.TOUR_DONE : STRINGS.TOUR_NEXT}
          </CustomText>
        </Pressable>
      </View>
    </View>
  );
};

TourTooltip.propTypes = {
  titleKey: PropTypes.string,
  bodyKey: PropTypes.string,
  total: PropTypes.number,
  current: PropTypes.number,
  isLast: PropTypes.bool,
  next: PropTypes.func,
  stop: PropTypes.func,
};

TourTooltip.defaultProps = {
  titleKey: "",
  bodyKey: "",
  total: 1,
  current: 0,
  isLast: false,
  next: () => {},
  stop: () => {},
};

export default TourTooltip;
