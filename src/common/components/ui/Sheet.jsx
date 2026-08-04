import React from "react";
import { Animated, Modal, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PropTypes from "prop-types";
import useKeyboardHeight from "../../hooks/useKeyboardHeight";
import useTokens from "../../hooks/useTokens";
import Text from "./Text";
import useSheetPresentation from "./useSheetPresentation";

// One bottom sheet. Replaces six near-identical implementations:
// `DayDetailModal`, `EditBanisModal`, `MonthYearPickerModal`, `SheetModal`,
// `AudioSettingsModal`, `bottomSheetComponent` and `LabelModal`.
//
// Height is content-driven and capped at a ratio of the screen rather than set
// to a number, so the sheet is as short as its content allows and never taller
// than it should be. Past the cap the body scrolls — which is what keeps a
// sheet usable when a translated list runs long or the user has raised their
// font size, the case where a fixed height silently clips the last option.

const Sheet = ({
  visible,
  onClose,
  title = undefined,
  children = null,
  closeAccessibilityLabel = undefined,
  scrollable = true,
  testID = undefined,
}) => {
  const { c, space, layout, radii } = useTokens();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { mounted, translateY } = useSheetPresentation(visible);
  // A Modal's window ignores the Activity's `adjustResize` on Android, so the
  // sheet has to get itself out of the keyboard's way. See the hook.
  const keyboardHeight = useKeyboardHeight();
  // The space actually left for the sheet once the keyboard is up. Both the
  // lift AND the cap use it, so a tall sheet scrolls inside what remains
  // instead of growing off the top of the screen.
  const availableHeight = height - keyboardHeight;

  const Body = scrollable ? ScrollView : View;
  const bodyProps = scrollable
    ? { contentContainerStyle: { gap: space.sm, paddingBottom: space.sm }, bounces: false }
    : { style: { gap: space.sm } };

  // Unmount only once the closing slide has finished.
  if (!mounted) return null;

  return (
    // `animationType="none"` because the slide is driven below. The Modal's own
    // "slide" moves the WHOLE modal, scrim included, so the black overlay wiped
    // up the screen with the sheet instead of being there on tap.
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      testID={testID}
    >
      {/* Tapping the scrim dismisses. Marked as a button so a screen reader
          user has the same escape a sighted user does. The scrim is drawn at
          full strength immediately — it is the feedback that the tap landed,
          so delaying it behind an animation only makes the app feel slower. */}
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={closeAccessibilityLabel}
        // `minHeight` as well as `flex: 1`. A Modal is a freshly-created window,
        // and on its first layout pass `flex: 1` has nothing to fill, so the
        // container measures 0 and `flex-end` puts the sheet at y=0 — the sheet
        // flashed at the TOP of the screen for a frame before snapping down.
        // `animationType="slide"` used to hide that by sliding the whole window
        // in over it. A definite height makes the first frame correct instead of
        // merely hidden.
        style={{
          flex: 1,
          minHeight: height,
          backgroundColor: c.scrim,
          justifyContent: "flex-end",
          // Lifts the sheet clear of the keyboard. Padding rather than a
          // transform so the sheet's own max height is measured against what is
          // left, not against the full screen.
          paddingBottom: keyboardHeight,
        }}
      >
        {/* Carries the slide. Pressable is not an animated component, so the
            transform lives on its own wrapper. */}
        <Animated.View style={{ transform: [{ translateY }] }}>
          {/* Swallows taps so a press inside the sheet does not close it. */}
          <Pressable
            onPress={() => {}}
            accessibilityViewIsModal
            style={{
              backgroundColor: c.surfaceElevated,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              paddingHorizontal: layout.sheet.paddingHorizontal,
              paddingTop: layout.sheet.paddingTop,
              // The bottom safe-area inset is for the home indicator. With the
              // keyboard up the keyboard covers it, so adding it again would
              // leave a dead band between the sheet and the keys.
              paddingBottom: layout.sheet.paddingBottom + (keyboardHeight > 0 ? 0 : insets.bottom),
              maxHeight: availableHeight * layout.sheet.maxHeightRatio,
            }}
          >
            <View
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={{
                alignSelf: "center",
                width: layout.sheet.handleWidth,
                height: layout.sheet.handleHeight,
                borderRadius: radii.pill,
                backgroundColor: c.border,
                marginBottom: space.md,
              }}
            />

            {title ? (
              <Text variant="subheading" color="textPrimary" style={{ marginBottom: space.sm }}>
                {title}
              </Text>
            ) : null}

            {/* Body is a ScrollView or a plain View depending on `scrollable`,
                so its props differ by type. */}
            {/* eslint-disable-next-line react/jsx-props-no-spreading */}
            <Body {...bodyProps}>{children}</Body>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

Sheet.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node,
  /** Localised label for the dismiss affordance. */
  closeAccessibilityLabel: PropTypes.string,
  /** Set false when the content manages its own scrolling (e.g. a FlatList). */
  scrollable: PropTypes.bool,
  testID: PropTypes.string,
};

export default Sheet;
