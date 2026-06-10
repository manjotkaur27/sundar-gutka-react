import React, { useState, useEffect, useCallback } from "react";
import { Modal, View, Pressable, StyleSheet } from "react-native";
import useTheme from "@common/context";
import CustomText from "../CustomText";

/**
 * App-themed replacement for the native `Alert.alert` confirmation dialog.
 *
 * Native Android alerts follow the *native* app theme (which is light), so they
 * render light even when the app's in-JS dark mode is on. This host renders a
 * themed Modal instead, driven by an imperative `showConfirm(...)` call — a 1:1
 * stand-in for Alert.alert for confirm/destructive flows.
 *
 * Usage:
 *   showConfirm({ title, message, confirmText, cancelText, destructive, onConfirm });
 *
 * Mount <ConfirmDialogHost /> exactly once near the app root (inside ThemeProvider).
 */

let hostListener = null;

export const showConfirm = (options) => {
  if (hostListener) hostListener(options);
};

const ConfirmDialogHost = () => {
  const { theme } = useTheme();
  const [options, setOptions] = useState(null);

  useEffect(() => {
    hostListener = setOptions;
    return () => {
      hostListener = null;
    };
  }, []);

  const close = useCallback(() => setOptions(null), []);

  if (!options) return null;

  const {
    title,
    message,
    confirmText = "OK",
    cancelText,
    destructive = false,
    onConfirm,
  } = options;
  const isDark = theme.mode === "dark";
  const surface = isDark ? theme.staticColors.NIGHT_BLACK : theme.colors.surface;
  const textColor = isDark ? theme.staticColors.WHITE_COLOR : theme.staticColors.NIGHT_BLACK;
  const confirmColor = destructive ? "#E53935" : theme.colors.primary;

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        {/* Inner Pressable swallows taps so they don't dismiss via the backdrop. */}
        <Pressable style={[styles.card, { backgroundColor: surface }]} onPress={() => {}}>
          {!!title && (
            <CustomText style={[styles.title, { color: textColor }]}>{title}</CustomText>
          )}
          {!!message && (
            <CustomText style={[styles.message, { color: textColor }]}>{message}</CustomText>
          )}
          <View style={styles.actions}>
            {!!cancelText && (
              <Pressable style={styles.btn} onPress={close} hitSlop={8}>
                <CustomText style={[styles.btnText, { color: theme.colors.audioTitleText }]}>
                  {cancelText}
                </CustomText>
              </Pressable>
            )}
            <Pressable
              style={styles.btn}
              hitSlop={8}
              onPress={() => {
                close();
                onConfirm?.();
              }}
            >
              <CustomText style={[styles.btnText, { color: confirmColor }]}>{confirmText}</CustomText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    paddingTop: 22,
    paddingHorizontal: 22,
    paddingBottom: 8,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 21,
    opacity: 0.85,
    marginBottom: 8,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 12,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  btnText: {
    fontSize: 15,
    fontWeight: "600",
  },
});

export default ConfirmDialogHost;
