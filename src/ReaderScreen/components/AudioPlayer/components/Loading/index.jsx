import React from "react";
import { View, ActivityIndicator } from "react-native";
import { useAudioTheme, useAudioThemedStyles } from "../../useAudioTheme";
import createStyles from "./styles";

const Loading = () => {
  const { theme } = useAudioTheme();
  const styles = useAudioThemedStyles(createStyles);
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.c.textBrand} />
    </View>
  );
};

export default Loading;
