import React from "react";
import { View } from "react-native";
import { useSelector } from "react-redux";
import {
  SafeArea,
  StatusBarComponent,
  CustomText,
  useTheme,
  useThemedStyles,
  STRINGS,
} from "@common";
import createStyles from "./styles";

const DashboardScreen = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  useSelector((state) => state.language);

  return (
    <SafeArea backgroundColor={theme.colors.surface} edges={["top", "left", "right"]}>
      <StatusBarComponent backgroundColor={theme.colors.surface} />
      <View
        style={[{ backgroundColor: theme.colors.surface }, styles.container]}
      >
        <CustomText style={styles.title}>{STRINGS.DASHBOARD}</CustomText>
        <CustomText style={styles.subtitle}>{STRINGS.COMING_SOON}</CustomText>
      </View>
    </SafeArea>
  );
};

export default DashboardScreen;
