import React, { useEffect, useRef } from "react";
import { View, Pressable, Animated } from "react-native";
import { Icon } from "@rneui/themed";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import useTheme from "../../context";
import CustomText from "../CustomText";
import STRINGS from "../../localization";
import useThemedStyles from "../../hooks/useThemedStyles";
import { markCoachmarkSeen } from "../../actions";
import { CURRENT_TOUR_VERSION } from "../../onboarding/tourVersion";
import useCoachmark from "../../onboarding/useCoachmark";
import { COACH } from "../../onboarding/coachmarkKeys";
import createStyles from "./style";

/**
 * One-time hint shown above the reader's bottom nav, pointing the user at the
 * audio button on first Bani open. Deliberately a plain absolutely-positioned
 * View — no element measurement, SVG or spotlight library — so it cannot crash
 * the way the library-based bottom-nav spotlight did. Shows once per tour
 * version, dismissed by the button (or naturally hidden once audio is on via
 * the `visible` prop).
 *
 * A bouncing down-arrow points at the Music/audio tab. To stay aligned on any
 * screen size WITHOUT measuring, the arrow row mirrors the reader bottom-nav's
 * exact flex layout (4 equal `flex:1`/`maxWidth:80` slots, `space-between`) and
 * places the arrow in slot index 2 — the Music tab (Home, Read, Music, Settings).
 */
const AudioHintCallout = ({ visible }) => {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { shouldShow } = useCoachmark(COACH.AUDIO_HINT);

  // Gentle up/down bounce to draw the eye toward the audio tab.
  const bounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible || !shouldShow) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, shouldShow, bounce]);

  if (!visible || !shouldShow) return null;

  const dismiss = () => dispatch(markCoachmarkSeen(COACH.AUDIO_HINT, CURRENT_TOUR_VERSION));
  const translateY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, 7] });

  return (
    <View style={styles.hintWrap} pointerEvents="box-none">
      <View style={styles.hintBubble}>
        <CustomText style={styles.hintText}>{STRINGS.TOUR_AUDIO_HINT}</CustomText>
        <Pressable style={styles.hintDismissBtn} onPress={dismiss} hitSlop={8}>
          <CustomText style={styles.hintDismissText}>{STRINGS.TOUR_DONE}</CustomText>
        </Pressable>
      </View>
      {/* Arrow row — same flex distribution as the reader bottom nav so the
          pointer lines up with the Music tab regardless of screen width. */}
      <View style={styles.hintArrowRow} pointerEvents="none">
        <View style={styles.hintArrowSlot} />
        <View style={styles.hintArrowSlot} />
        <Animated.View style={[styles.hintArrowSlot, { transform: [{ translateY }] }]}>
          <View style={styles.hintArrowBadge}>
            <Icon name="keyboard-arrow-down" type="material" size={30} color={theme.staticColors.WHITE_COLOR} />
          </View>
        </Animated.View>
        <View style={styles.hintArrowSlot} />
      </View>
    </View>
  );
};

AudioHintCallout.propTypes = {
  visible: PropTypes.bool,
};

AudioHintCallout.defaultProps = {
  visible: false,
};

export default AudioHintCallout;
