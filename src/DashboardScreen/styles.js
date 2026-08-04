import { StyleSheet } from "react-native";

const createStyles = (theme) => {
  const { c } = theme;

  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      backgroundColor: c.surface,
    },
    divider: {
      height: 1,
      backgroundColor: c.border,
      marginHorizontal: 20,
    },
    sectionSpacer: {
      height: 8,
      backgroundColor: c.surface,
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
};

export default createStyles;
