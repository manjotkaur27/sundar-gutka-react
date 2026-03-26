import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { ListItem, Avatar, Divider, Icon } from "@rneui/themed";
import {
  toggleEnglishTranslation,
  togglePunjabiTranslation,
  toggleSpanishTranslation,
} from "@common/actions";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { STRINGS, ListItemTitle, CustomText, constant } from "@common";
import { Modal, View, Pressable, Platform, StyleSheet, Dimensions } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "@react-native-community/blur";
import createStyles from "../styles";

const TranslationComponent = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const translationAvatar = require("../../../images/englishicon.png");
  const isEnglishTranslation = useSelector((state) => state.isEnglishTranslation);
  const isSpanishTranslation = useSelector((state) => state.isSpanishTranslation);
  const isPunjabiTranslation = useSelector((state) => state.isPunjabiTranslation);

  const dispatch = useDispatch();
  const [isVisible, setIsVisible] = useState(false);

  // Orientation-aware width — mirrors BottomSheetComponent logic
  const { width, height } = Dimensions.get("window");
  const [orientation, setOrientation] = useState(
    width < height ? constant.PORTRAIT : constant.LANDSCAPE
  );
  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window: { width: w, height: h } }) => {
      setOrientation(w < h ? constant.PORTRAIT : constant.LANDSCAPE);
    });
    return () => sub?.remove?.();
  }, []);

  const translationOptions = [
    {
      key: "en",
      title: STRINGS.en_translations,
      value: isEnglishTranslation,
      action: toggleEnglishTranslation,
    },
    {
      key: "pu",
      title: STRINGS.pu_translations,
      value: isPunjabiTranslation,
      action: togglePunjabiTranslation,
    },
    {
      key: "es",
      title: STRINGS.es_translations,
      value: isSpanishTranslation,
      action: toggleSpanishTranslation,
    },
  ];

  const selectedCount = translationOptions.filter((item) => item.value).length;
  const isAllOff = selectedCount === 0;

  const selectedSummary =
    isAllOff ? "None" : `${selectedCount} selected (multiple allowed)`;

  const handleTurnAllOff = () => {
    if (isEnglishTranslation) dispatch(toggleEnglishTranslation(false));
    if (isPunjabiTranslation) dispatch(togglePunjabiTranslation(false));
    if (isSpanishTranslation) dispatch(toggleSpanishTranslation(false));
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
          <Avatar source={translationAvatar} avatarStyle={styles.avatarStyle} />
        </View>
        <ListItem.Content>
          <ListItemTitle title={STRINGS.translations} style={styles.listItemTitle} />
        </ListItem.Content>
        <CustomText style={styles.titleInfoStyle}>{selectedSummary}</CustomText>
        <ListItem.Chevron />
      </ListItem>

      {isVisible && (
        <SafeAreaProvider>
          <SafeAreaView>
            <Modal
              visible={isVisible}
              animationType="fade"
              transparent
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
                    style={[
                      styles.bottomSheetTitle,
                      styles.listItemTitle,
                      styles.containerNightStyles,
                    ]}
                  >
                    {STRINGS.translations}
                  </CustomText>
                  <Divider />
                  {/* Off option — turns all translations off */}
                  <ListItem
                    key="off"
                    bottomDivider
                    containerStyle={styles.containerNightStyles}
                    onPress={handleTurnAllOff}
                  >
                    <ListItem.Content>
                      <ListItemTitle title={STRINGS.off || "Off"} style={styles.listItemTitle} />
                    </ListItem.Content>
                    {isAllOff && <Icon color={theme.colors.primaryText} name="check" />}
                  </ListItem>
                  {translationOptions.map((item) => (
                    <ListItem
                      key={item.key}
                      bottomDivider
                      containerStyle={styles.containerNightStyles}
                      onPress={() => dispatch(item.action(!item.value))}
                    >
                      <ListItem.Content>
                        <ListItemTitle title={item.title} style={styles.listItemTitle} />
                      </ListItem.Content>
                      {item.value && <Icon color={theme.colors.primaryText} name="check" />}
                    </ListItem>
                  ))}
                  {Platform.OS === "ios" && (
                    <ListItem bottomDivider containerStyle={styles.containerNightStyles} />
                  )}
                </View>
              </Pressable>
            </Modal>
          </SafeAreaView>
        </SafeAreaProvider>
      )}
    </>
  );
};

export default TranslationComponent;
