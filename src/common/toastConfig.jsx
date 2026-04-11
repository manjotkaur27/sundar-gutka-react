import React from "react";
import { View, Text, StyleSheet } from "react-native";
import useTheme from "@common/context";

/**
 * Custom toast renderer for react-native-toast-message.
 * Reads the active theme (light/dark) to style toast backgrounds, text,
 * and accent colours. text1 is rendered without numberOfLines so long
 * messages (e.g. "Network error, Audio features temporarily unavailable")
 * are never truncated.
 */

const ACCENT = {
  error: "#E53935",
  success: "#43A047",
  info: "#1E88E5",
};

const ToastContent = ({ type, text1 }) => {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";

  const backgroundColor = isDark ? "#1E1E1E" : "#EBEBEB";
  const textColor = isDark ? "#F5F5F5" : "#1A1A1A";
  const borderColor = ACCENT[type] || ACCENT.info;
  const shadowColor = isDark ? "#000000" : "#888888";

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor,
          borderLeftColor: borderColor,
          shadowColor,
        },
      ]}
    >
      <Text style={[styles.text, { color: textColor }]}>{text1}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "90%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    flexWrap: "wrap",
  },
});

const toastConfig = {
  error: (props) => <ToastContent type="error" text1={props.text1} />,
  success: (props) => <ToastContent type="success" text1={props.text1} />,
  info: (props) => <ToastContent type="info" text1={props.text1} />,
};

export default toastConfig;
