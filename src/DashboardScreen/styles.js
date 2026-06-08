import { StyleSheet } from "react-native";

const createStyles = (theme) =>
  StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      backgroundColor: theme.mode === "dark" ? theme.colors.inactiveView : "#ffffff",
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.separator,
      marginHorizontal: 20,
    },
    sectionSpacer: {
      height: 8,
      backgroundColor: theme.mode === "dark" ? theme.colors.inactiveView : "#ffffff",
    },
    floatingHeader: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
    },
    floatingStrip: {
      position: "absolute",
      left: 0,
      right: 0,
      zIndex: 9,
    },
  });

export default createStyles;
