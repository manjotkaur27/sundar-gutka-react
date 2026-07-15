import React, { useMemo } from "react";
import { View, Pressable } from "react-native";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
import { ArrowRightIcon, CloseIcon } from "@common/icons";
import { useTheme, useThemedStyles, CustomText, STRINGS, constant } from "@common";
import createStyles from "./styles";

const ErrorFallback = ({ title, buttonText, buttonPress, handleClose, baniTitle }) => {
  const fontFace = useSelector((state) => state.fontFace);
  const styles = useThemedStyles(createStyles);
  const { theme } = useTheme();

  const fontStyle = useMemo(
    () => ({
      fontFamily: fontFace,
    }),
    [fontFace]
  );

  return (
    <View testID="error-fallback-container" style={styles.statusContainer}>
      <Pressable testID="close-button" style={styles.closeButton} onPress={handleClose}>
        <CloseIcon size={30} color={theme.colors.audioTitleText} />
      </Pressable>
      <View style={styles.noTracksContainer}>
        <CustomText style={styles.noTracksText}>{STRINGS.MAAFI_JI}</CustomText>
        <CustomText style={styles.noTracksSubtext}>
          <CustomText style={styles.titleText}>{title} </CustomText>
          {!!baniTitle && (
            <>
              <CustomText style={fontStyle}>{baniTitle} </CustomText>
              {STRINGS.YET}
            </>
          )}
        </CustomText>
        <Pressable
          style={styles.joinMailingListButton}
          onPress={buttonPress}
          accessibilityRole="link"
        >
          <View style={styles.joinMailingListContent}>
            <CustomText style={styles.joinMailingListText}>{buttonText}</CustomText>
            <ArrowRightIcon size={constant.ICON_SIZE_SMALL} color={theme.colors.primary} />
          </View>
        </Pressable>
      </View>
    </View>
  );
};

ErrorFallback.propTypes = {
  title: PropTypes.string.isRequired,
  baniTitle: PropTypes.string,
  buttonPress: PropTypes.func.isRequired,
  buttonText: PropTypes.string.isRequired,
  handleClose: PropTypes.func.isRequired,
};

ErrorFallback.defaultProps = {
  baniTitle: "",
};

export default ErrorFallback;
