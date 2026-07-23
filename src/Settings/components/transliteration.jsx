import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Modal, View, Pressable, Platform, StyleSheet, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "@react-native-community/blur";
import { ListItem, Avatar, Divider, Icon } from "@rneui/themed";
import { setTransliteration, toggleTransliteration } from "@common/actions";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { STRINGS, ListItemTitle, CustomText, constant } from "@common";
import createStyles from "../styles";
import { getTransliteration } from "./comon/strings";

const TransliterationComponent = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const romanizedIcon = require("../../../images/romanizeicon.png");
  const [isVisible, setIsVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const transliterationLanguage = useSelector((state) => state.transliterationLanguage);
  const isTransliteration = useSelector((state) => state.isTransliteration);
  const OFF_KEY = "OFF";
  const TRANSLITERATION_LANGUAGES = [
    { key: OFF_KEY, title: STRINGS.off },
    ...getTransliteration(STRINGS),
  ];
  const dispatch = useDispatch();
  const selectedKey = isTransliteration ? transliterationLanguage : OFF_KEY;
  const selectedTitle =
    TRANSLITERATION_LANGUAGES.find((item) => item.key === selectedKey)?.title || STRINGS.off;

  // Orientation-aware width — mirrors BottomSheetComponent logic
  const { width, height } = Dimensions.get("window");
  const [orientation, setOrientation] = useState(
    width < height ? constant.PORTRAIT : constant.LANDSCAPE,
  );
  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window: { width: w, height: h } }) => {
      setOrientation(w < h ? constant.PORTRAIT : constant.LANDSCAPE);
    });
    return () => sub?.remove?.();
  }, []);

  const handleSelection = (key) => {
    if (key === OFF_KEY) {
      dispatch(toggleTransliteration(false));
      setIsVisible(false);
      return;
    }

    dispatch(setTransliteration(key));
    dispatch(toggleTransliteration(true));
    setIsVisible(false);
  };

  return (
    <>
      <ListItem
        bottomDivider
        containerStyle={styles.containerNightStyles}
        onPress={() => setIsVisible(true)}
      >
        <View style={styles.iconContainerStyle}>
          <Avatar source={romanizedIcon} avatarStyle={styles.avatarStyle} />
        </View>
        <ListItem.Content>
          <ListItemTitle title={STRINGS.transliteration} style={styles.listItemTitle} />
        </ListItem.Content>
        <CustomText style={styles.titleInfoStyle}>{selectedTitle}</CustomText>
        <ListItem.Chevron color={theme.colors.primaryText} />
      </ListItem>

      {isVisible && (
        <Modal
          visible={isVisible}
          animationType="fade"
          transparent
          statusBarTranslucent
          supportedOrientations={[
            "landscape",
            "landscape-left",
            "landscape-right",
            "portrait",
            "portrait-upside-down",
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsVisible(false)}>
            <BlurView
              reducedTransparencyFallbackColor={theme.staticColors.NIGHT_OPACITY_BLACK}
              style={styles.blurViewStyle}
              blurType="dark"
              enabled
            />
            <View
              style={[
                Platform.OS === "ios" ? styles.viewWrapper : styles.androidViewWrapper,
                Platform.OS === "ios" &&
                  (orientation === constant.LANDSCAPE ? styles.width_90 : styles.width_100),
              ]}
            >
              <CustomText
                style={[styles.bottomSheetTitle, styles.listItemTitle, styles.containerNightStyles]}
              >
                {STRINGS.transliteration}
              </CustomText>
              <Divider />
              {TRANSLITERATION_LANGUAGES.map((item) => (
                <ListItem
                  key={item.key}
                  bottomDivider
                  containerStyle={styles.containerNightStyles}
                  onPress={() => handleSelection(item.key)}
                >
                  <ListItem.Content>
                    <ListItemTitle title={item.title} style={styles.listItemTitle} />
                  </ListItem.Content>
                  {selectedKey === item.key && (
                    <Icon color={theme.colors.primaryText} name="check" />
                  )}
                </ListItem>
              ))}
              <View style={[styles.containerNightStyles, { paddingBottom: insets.bottom }]} />
            </View>
          </Pressable>
        </Modal>
      )}
    </>
  );
};

export default TransliterationComponent;
