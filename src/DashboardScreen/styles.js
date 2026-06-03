import { StyleSheet } from "react-native";

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: theme.colors.primaryText,
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 18,
      color: theme.colors.textDisabled,
    },
  });

export default createStyles;
