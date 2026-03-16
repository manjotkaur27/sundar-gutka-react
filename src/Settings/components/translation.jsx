import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { ListItem, Avatar, Divider, Icon } from "@rneui/themed";
import {
  toggleEnglishTranslation,
  togglePunjabiTranslation,
  toggleSpanishTranslation,
} from "@common/actions";
import useTheme from "@common/context";
import useThemedStyles from "@common/hooks/useThemedStyles";
import { STRINGS, ListItemTitle, CustomText } from "@common";
import { Modal, View, Pressable, Platform, StyleSheet } from "react-native";
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

  const selectedSummary =
    selectedCount === 0 ? "None" : `${selectedCount} selected (multiple allowed)`;

  return (
    <>
      <ListItem
        bottomDivider
        containerStyle={styles.containerNightStyles}
        onPress={() => setIsVisible(true)}
      >
        <Avatar source={translationAvatar} avatarStyle={styles.avatarStyle} />
        <ListItem.Content>
          <ListItemTitle title={STRINGS.translations} style={[{ paddingLeft: 16 }, styles.listItemTitle]} />
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
                  style={Platform.OS === "ios" ? styles.viewWrapper : styles.androidViewWrapper}
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
