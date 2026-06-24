import React from "react";
import { View, Pressable } from "react-native";
import PropTypes from "prop-types";
import CustomText from "../CustomText";
import useThemedStyles from "../../hooks/useThemedStyles";
import createStyles from "./style";

/**
 * Generic, library-free guide bubble shown above the bottom nav. It uses
 * pointerEvents="box-none" so the user can still tap the real controls
 * underneath (e.g. the Settings or Manage Downloads buttons it points at) —
 * unlike the spotlight library, whose Modal overlay blocks those taps.
 *
 * Shows an optional secondary ("Not now") and an optional primary action.
 */
const GuideCallout = ({ text, primaryLabel, onPrimary, secondaryLabel, onSecondary, bottom }) => {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.hintWrap, bottom != null && { bottom }]} pointerEvents="box-none">
      <View style={styles.hintBubble}>
        <CustomText style={styles.hintText}>{text}</CustomText>
        <View style={styles.hintActions}>
          {!!secondaryLabel && (
            <Pressable style={styles.hintSecondaryBtn} onPress={onSecondary} hitSlop={8}>
              <CustomText style={styles.hintSecondaryText}>{secondaryLabel}</CustomText>
            </Pressable>
          )}
          {!!primaryLabel && (
            <Pressable style={styles.hintPrimaryBtn} onPress={onPrimary} hitSlop={8}>
              <CustomText style={styles.hintPrimaryText}>{primaryLabel}</CustomText>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
};

GuideCallout.propTypes = {
  text: PropTypes.string,
  primaryLabel: PropTypes.string,
  onPrimary: PropTypes.func,
  secondaryLabel: PropTypes.string,
  onSecondary: PropTypes.func,
  bottom: PropTypes.number,
};

GuideCallout.defaultProps = {
  text: "",
  primaryLabel: "",
  onPrimary: () => {},
  secondaryLabel: "",
  onSecondary: () => {},
  bottom: undefined,
};

export default GuideCallout;
