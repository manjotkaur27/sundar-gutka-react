import React, { useState, useEffect, useCallback, useRef } from "react";
import { Modal, View, Pressable, StyleSheet } from "react-native";
import constant from "@common/constant";
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

  // Lay the action buttons in a row when they fit; switch to a full-width
  // vertical stack when they don't. The decision is driven by the *measured*
  // widths of the actual rendered buttons vs. the available row width, so it
  // adapts to any system font scale, locale (German/Punjabi labels run long),
  // or screen size — instead of a hardcoded row that clips "Cancel" off the
  // card on narrow/large-font devices.
  const [stacked, setStacked] = useState(false);
  const rowWidthRef = useRef(0);
  const btnWidthsRef = useRef({});

  // Re-measure from scratch whenever a new dialog opens (its buttons differ).
  useEffect(() => {
    setStacked(false);
    rowWidthRef.current = 0;
    btnWidthsRef.current = {};
  }, [options]);

  const ACTION_GAP = 8;
  const evaluateLayout = useCallback(() => {
    if (stacked) return;
    const widths = Object.values(btnWidthsRef.current);
    if (!rowWidthRef.current || widths.length === 0) return;
    const total =
      widths.reduce((sum, w) => sum + w, 0) + ACTION_GAP * (widths.length - 1);
    // 1px slack avoids a spurious stack from sub-pixel rounding.
    if (total > rowWidthRef.current + 1) setStacked(true);
  }, [stacked]);

  const onRowLayout = useCallback(
    (e) => {
      rowWidthRef.current = e.nativeEvent.layout.width;
      evaluateLayout();
    },
    [evaluateLayout]
  );

  const onBtnLayout = useCallback(
    (key) => (e) => {
      // In row mode each button reports its natural (content) width.
      if (!stacked) {
        btnWidthsRef.current[key] = e.nativeEvent.layout.width;
        evaluateLayout();
      }
    },
    [stacked, evaluateLayout]
  );

  if (!options) return null;

  const {
    title,
    message,
    confirmText = "OK",
    cancelText,
    neutralText,
    destructive = false,
    onConfirm,
    onNeutral,
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
          <View
            style={[styles.actions, stacked && styles.actionsStacked]}
            onLayout={onRowLayout}
          >
            {!!cancelText && (
              <Pressable
                style={[styles.btn, stacked && styles.btnStacked]}
                onPress={close}
                hitSlop={8}
                onLayout={onBtnLayout("cancel")}
              >
                <CustomText style={[styles.btnText, { color: theme.colors.audioTitleText }]}>
                  {cancelText}
                </CustomText>
              </Pressable>
            )}
            {!!neutralText && (
              <Pressable
                style={[styles.btn, stacked && styles.btnStacked]}
                hitSlop={8}
                onLayout={onBtnLayout("neutral")}
                onPress={() => {
                  close();
                  onNeutral?.();
                }}
              >
                <CustomText
                  style={[
                    styles.btnText,
                    // Primary (navy) on a dark grey surface is hard to read, so
                    // use white in dark mode.
                    { color: isDark ? theme.staticColors.WHITE_COLOR : theme.colors.primary },
                  ]}
                >
                  {neutralText}
                </CustomText>
              </Pressable>
            )}
            <Pressable
              style={[styles.btn, stacked && styles.btnStacked]}
              hitSlop={8}
              onLayout={onBtnLayout("confirm")}
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
  // Explicit SemiBold face and NO numeric fontWeight beside it. Baloo ships as
  // separate named TTFs, so a fontWeight makes Android try to synthesize bold
  // and silently drop back to the SYSTEM font — which is why these headings
  // rendered in a different typeface to the rest of the app.
  title: {
    fontFamily: constant.BALOO_PAAJI_SEMI_BOLD,
    fontSize: 18,
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
    // Wrap is the guaranteed no-clip fallback if measurement ever misses: a
    // button that can't fit moves to the next line instead of off the card.
    flexWrap: "wrap",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 12,
    columnGap: 8,
    rowGap: 4,
  },
  // When the buttons don't fit on one row, stack them full-width with their
  // labels right-aligned (standard Material adaptive-dialog behaviour). Each
  // button gets the full card width, so a long label can never be clipped.
  actionsStacked: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  btnStacked: {
    width: "100%",
    paddingHorizontal: 0,
    alignItems: "flex-end",
  },
  btnText: {
    fontFamily: constant.BALOO_PAAJI_SEMI_BOLD,
    fontSize: 15,
  },
});

export default ConfirmDialogHost;
