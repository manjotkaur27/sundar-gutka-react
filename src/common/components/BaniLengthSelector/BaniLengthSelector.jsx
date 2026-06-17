import React, { useState } from "react";
import { View, Pressable, Modal, ScrollView } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import { Icon } from "@rneui/themed";
import { CustomText, STRINGS, useThemedStyles, useTheme } from "@common";
import constant from "@common/constant";
import { setBaniLength } from "../../actions";
import createStyles from "./style";

// Map each display label → its Redux constant value.
// toUpperCase() fails for "Extra Long" → "EXTRA LONG" (space ≠ underscore).
const LENGTH_CONSTANT_MAP = {
  [STRINGS.short]:      constant.SHORT,
  [STRINGS.medium]:     constant.MEDIUM ?? "MEDIUM",
  [STRINGS.long]:       constant.LONG,
  [STRINGS.extra_long]: constant.EXTRA_LONG,
};

const BaniLengthSelector = () => {
  const styles = useThemedStyles(createStyles);
  const { theme } = useTheme();
  const baniLengths = [STRINGS.short, STRINGS.medium, STRINGS.long, STRINGS.extra_long];
  const dispatch = useDispatch();
  const [helpVisible, setHelpVisible] = useState(false);

  const helpLines = [
    STRINGS.bani_length_alert_1,
    STRINGS.bani_length_alert_2,
    STRINGS.bani_length_alert_3,
    STRINGS.bani_length_alert_4,
    STRINGS.bani_length_alert_5,
    STRINGS.bani_length_alert_6,
    STRINGS.bani_length_alert_7,
    STRINGS.bani_length_alert_8,
    STRINGS.bani_length_alert_9,
  ];

  const handleOnpress = (length) => {
    const constantValue = LENGTH_CONSTANT_MAP[length] ?? length.toUpperCase();
    dispatch(setBaniLength(constantValue));
  };
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.wrapper}>
        <View style={styles.viewWrapper}>
          <CustomText style={styles.heading}>{STRINGS.khalsa_sundar_gutka}</CustomText>
          <CustomText style={styles.baniLengthMessage}>{STRINGS.bani_length_message_1}</CustomText>
          <CustomText style={styles.baniLengthMessage}>{STRINGS.bani_length_message_2}</CustomText>
          <CustomText style={styles.textPreferrence}>{STRINGS.choose_your_preference}</CustomText>
          {baniLengths.map((buttonText) => (
            <Pressable key={buttonText} onPress={() => handleOnpress(buttonText)}>
              <CustomText style={styles.button}>{buttonText}</CustomText>
            </Pressable>
          ))}
          <Pressable style={styles.helpWrapper} onPress={() => setHelpVisible(true)}>
            <Icon color={theme.colors.primaryVariant} name="info" size={30} />
            <CustomText style={styles.helpText}>{STRINGS.need_help_deciding}</CustomText>
          </Pressable>
        </View>
      </SafeAreaView>

      <Modal
        transparent
        visible={helpVisible}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setHelpVisible(false)}
      >
        <View style={styles.helpRoot}>
          {/* Dismiss layer sits BEHIND the card as a sibling, not a parent —
              wrapping the card in a Pressable made its ScrollView fight the
              ancestor Pressable for the touch responder, so drags were
              intermittently swallowed as taps instead of scrolling. */}
          <Pressable style={styles.helpBackdrop} onPress={() => setHelpVisible(false)} />
          <View style={styles.helpCenterWrapper} pointerEvents="box-none">
            <View style={styles.helpCard}>
              <CustomText style={styles.helpTitle}>{STRINGS.bani_length}</CustomText>
              <ScrollView style={styles.helpScroll} showsVerticalScrollIndicator>
                {helpLines.map((line, index) => (
                  <CustomText key={index} style={styles.helpLine}>{line}</CustomText>
                ))}
              </ScrollView>
              <Pressable style={styles.helpCloseBtn} onPress={() => setHelpVisible(false)} hitSlop={8}>
                <CustomText style={styles.helpCloseText}>{STRINGS.ok}</CustomText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaProvider>
  );
};
export default BaniLengthSelector;
