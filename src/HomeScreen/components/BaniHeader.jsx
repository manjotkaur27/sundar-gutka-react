import React from "react";
import { View } from "react-native";
import { STRINGS, CustomText, useTheme, useThemedStyles, SafeArea, GradientDivider } from "@common";
import createStyles from "../styles";

const BaniHeader = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <SafeArea backgroundColor={theme.mode === "dark" ? "#041126" : theme.colors.surface} edges={["top"]} flex={0}>
      <View style={styles.newHeaderContainer}>
        <CustomText style={styles.newHeaderInvocationText}>
          ॥ ੴ ਸ੍ਰੀ ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫਤਹਿ ॥
        </CustomText>
        <CustomText style={styles.newHeaderTitleText}>
          {STRINGS.sg_title}
        </CustomText>
        <GradientDivider style={styles.newHeaderGradientDivider} />
      </View>
    </SafeArea>
  );
};

export default BaniHeader;
