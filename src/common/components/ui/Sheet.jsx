import React from "react";
import { Animated, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "@react-native-community/blur";
import ScreenRolesProvider from "@theme/ScreenRolesProvider";
import PropTypes from "prop-types";
import useKeyboardHeight from "../../hooks/useKeyboardHeight";
import useTokens from "../../hooks/useTokens";
import Overlay from "./Overlay";
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

const SheetContent = ({
  visible,
  onClose,
  title = undefined,
  children = null,
  closeAccessibilityLabel = undefined,
  scrollable = true,
  testID = undefined,
  variant = "floating",
  footer = null,
}) => {
  // Two presentations, both driven entirely by tokens.
  //
  //   floating — the app's sheet: it slides up over an instant scrim, has a
  //              drag handle and inset content. Everything but Settings.
  //   flush    — the Settings chooser, restored to what it was: the window
  //              fades in over a dark BLUR of the screen behind, there is no
  //              handle, the title is centred over a rule, and the rows run
  //              edge to edge.
  //
  // Kept as a NAMED variant rather than a pile of props at the call site, so
  // the difference is one decision in one place.
  const flush = variant === "flush";
  const { c, space, layout, radii } = useTokens();
  // Colours come from the roles, which the provider has already scoped to
  // this sheet's own palette when it is flush — so nothing here is a literal.
  const sheetC = { surface: c.surfaceElevated, scrim: c.scrim, divider: c.border };
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const presentation = useSheetPresentation(visible);
  // The flush sheet fades with its window, so it neither slides nor has to stay
  // mounted through an exit — wiring `onShow` would start a slide it never had.
  const mounted = flush ? visible : presentation.mounted;
  // A Modal's window ignores the Activity's `adjustResize` on Android, so the
  // sheet has to get itself out of the keyboard's way. See the hook.
  const keyboardHeight = useKeyboardHeight();
  // The space actually left for the sheet once the keyboard is up. Both the
  // lift AND the cap use it, so a tall sheet scrolls inside what remains
  // instead of growing off the top of the screen.
  const availableHeight = height - keyboardHeight;

  const Body = scrollable ? ScrollView : View;
  // Flush rows carry their own dividers and butt up against each other, so the
  // body neither gaps them nor pads the last one away from the edge.
  const bodyGap = flush ? 0 : space.sm;
  // `flexShrink: 1` is what lets a pinned `footer` win the space it needs: the
  // sheet is capped at a ratio of the window, so without it the body keeps its
  // full content height and pushes the footer straight off the bottom of the
  // screen. That is exactly what put the Punjabi keyboard half off-display once
  // a bani list opened above it.
  // …but `flexShrink: 1` with nothing to stop it shrinks the body to ZERO when
  // the footer is tall enough, which is the other half of the same problem: the
  // Punjabi keyboard is seven rows, and at a raised OS text size it claimed the
  // whole sheet, leaving the title above a clipped field and no buttons at all.
  // A floor keeps the body on screen and scrolling; the keyboard caps its own
  // height so the two meet in the middle rather than fighting.
  const bodyFloor = footer ? layout.sheet.listMinHeight : undefined;
  const bodyProps = scrollable
    ? {
        style: { flexShrink: 1, minHeight: bodyFloor },
        contentContainerStyle: { gap: bodyGap, paddingBottom: bodyGap },
        bounces: false,
        // A row inside a sheet that has a keyboard up must take the tap on the
        // FIRST press. The default swallows it to dismiss the keyboard, so
        // ticking a bani while searching took two taps and looked broken.
        keyboardShouldPersistTaps: "handled",
      }
    : { style: { gap: bodyGap, flexShrink: 1, minHeight: bodyFloor } };

  // Unmount only once the closing slide has finished.
  if (!mounted) return null;

  return (
    // Floating: `animationType="none"` because the slide is driven below — the
    // Modal's own "slide" moves the WHOLE modal, scrim included, so the black
    // overlay wiped up the screen with the sheet instead of being there on tap.
    // `onShow` is when the sheet's native view exists to animate.
    //
    // Flush: the window fades, which is the whole animation and needs no hook.
    <Overlay
      animationType={flush ? "fade" : "none"}
      onRequestClose={onClose}
      onShow={flush ? undefined : presentation.onShow}
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
        // Absolutely filled, NOT `flex: 1` and NOT a measured height.
        //
        // `flex: 1` alone is wrong on the first layout pass: a Modal is a
        // freshly-created window, so there is nothing to fill yet, the container
        // measures 0 and `flex-end` puts the sheet at y=0 for a frame.
        //
        // Pinning `minHeight` to the window height was worse. `statusBarTranslucent`
        // is a no-op from API 35, where Android enforces edge-to-edge, so the
        // Modal's window is inset by the status bar while `useWindowDimensions`
        // still reports the FULL display. The container then overflowed its own
        // window by exactly the status bar height and `flex-end` pushed the sheet
        // that far below the screen, where its lower rows were unreachable.
        //
        // Filling absolutely takes the size from the window itself, so it is
        // correct on the first frame without having to agree with a measurement.
        style={{
          ...StyleSheet.absoluteFillObject,
          // Flush dims through the blur below instead, so a flat scrim on top
          // of it would just mute the blur.
          backgroundColor: flush ? "transparent" : sheetC.scrim,
          justifyContent: "flex-end",
          // Lifts the sheet clear of the keyboard. Padding rather than a
          // transform so the sheet's own max height is measured against what is
          // left, not against the full screen.
          paddingBottom: keyboardHeight,
        }}
      >
        {/* The flush sheet dims the screen with a real blur, as it always did.
            A plain View child does not consume touches, so a tap still reaches
            the Pressable above and dismisses. The fallback colour is what
            Android/iOS use when the OS "reduce transparency" setting is on. */}
        {flush ? (
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="dark"
            reducedTransparencyFallbackColor={sheetC.scrim}
            enabled
          />
        ) : null}
        {/* Carries the slide. Pressable is not an animated component, so the
            transform lives on its own wrapper. */}
        <Animated.View
          style={flush ? null : { transform: [{ translateY: presentation.translateY }] }}
        >
          {/* Swallows taps so a press inside the sheet does not close it. */}
          <Pressable
            onPress={() => {}}
            accessibilityViewIsModal
            style={{
              backgroundColor: sheetC.surface,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              paddingHorizontal: flush ? 0 : layout.sheet.paddingHorizontal,
              paddingTop: flush ? 0 : layout.sheet.paddingTop,
              // The bottom safe-area inset is for the home indicator. With the
              // keyboard up the keyboard covers it, so adding it again would
              // leave a dead band between the sheet and the keys.
              paddingBottom: layout.sheet.paddingBottom + (keyboardHeight > 0 ? 0 : insets.bottom),
              maxHeight: availableHeight * layout.sheet.maxHeightRatio,
            }}
          >
            {/* No drag handle. It suggested a gesture the sheet does not
                implement — dismissal is the scrim and the Cancel button — and
                it was asked to go from every sheet. */}
            {title ? (
              <Text
                // Flush titles sit at body size, centred — the same treatment
                // the old sheet's title carried.
                variant={flush ? "body" : "subheading"}
                color="textPrimary"
                style={
                  flush
                    ? {
                        textAlign: "center",
                        // Padding rather than a height, so a translated title
                        // that wraps to two lines grows the block instead of
                        // being clipped by it.
                        padding: layout.sheet.titlePadding,
                      }
                    : { marginBottom: space.sm }
                }
              >
                {title}
              </Text>
            ) : null}

            {/* The rule under a flush title. StyleSheet.hairlineWidth rounds to
                zero on some non-integer densities, so this is a solid 1dp. */}
            {flush && title ? (
              <View style={{ height: 1, backgroundColor: sheetC.divider }} />
            ) : null}

            {/* Body is a ScrollView or a plain View depending on `scrollable`,
                so its props differ by type. */}
            {/* eslint-disable-next-line react/jsx-props-no-spreading */}
            <Body {...bodyProps}>{children}</Body>

            {/* Pinned: OUTSIDE the body, so it never scrolls away and never
                gets pushed past the bottom edge. This is the standard bottom
                sheet footer arrangement (gorhom's BottomSheetFooter does the
                same) and it is what an on-screen keyboard needs — the keys stay
                put at the bottom while the content above them scrolls. */}
            {footer}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Overlay>
  );
};

const sheetPropTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node,
  /** Localised label for the dismiss affordance. */
  closeAccessibilityLabel: PropTypes.string,
  /** Set false when the content manages its own scrolling (e.g. a FlatList). */
  scrollable: PropTypes.bool,
  /** Pinned below the scrolling body — an on-screen keyboard, a sticky action. */
  footer: PropTypes.node,
  testID: PropTypes.string,
  /** "floating" everywhere; "flush" only for the Settings chooser. */
  variant: PropTypes.oneOf(["floating", "flush"]),
};

SheetContent.propTypes = sheetPropTypes;

// The scope has to sit OUTSIDE the component that reads the tokens: a provider
// only affects what renders beneath it, so wrapping the returned element would
// colour the rows and leave the panel, the rule and the blur fallback resolving
// against the semantic layer.
//
// Inside it, the `Row`s, the title and the checkmark all resolve the SAME role
// names to the Settings palette's values — so none of them takes a colour prop,
// and none of these colours can reach another sheet.
const Sheet = ({ variant = "floating", ...rest }) => {
  // eslint-disable-next-line react/jsx-props-no-spreading
  const content = <SheetContent variant={variant} {...rest} />;
  return variant === "flush" ? (
    <ScreenRolesProvider screen="settingsSheet">{content}</ScreenRolesProvider>
  ) : (
    content
  );
};

Sheet.propTypes = sheetPropTypes;

export default Sheet;
