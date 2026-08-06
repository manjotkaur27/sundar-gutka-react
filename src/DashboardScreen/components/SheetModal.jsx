import React from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import PropTypes from "prop-types";
import Overlay from "@common/components/ui/Overlay";
import useSheetPresentation from "@common/components/ui/useSheetPresentation";
import useDashboardTheme from "./dashboardTheme";

export const getSheetTop = (heightRatio) =>
  heightRatio == null ? undefined : `${(1 - heightRatio) * 100}%`;

const styles = StyleSheet.create({
  root: {
    // Filled absolutely rather than `flex: 1` or a measured height — the sheet
    // below is anchored to this root's `bottom: 0`, so the root has to be
    // exactly the Modal's own window. See the note in `ui/Sheet`: pinning it to
    // `useWindowDimensions().height` overflows that window by the status bar
    // height once Android enforces edge-to-edge, which pushes the sheet's lower
    // rows off the bottom of the screen.
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    overflow: "hidden",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
    // Never squeezed to nothing when tall content competes for space.
    flexShrink: 0,
  },
});

/**
 * Body of the sheet. Split out so it renders INSIDE the SafeAreaProvider below
 * and can therefore read real insets — see the note on that provider.
 */
const SheetBody = ({ onClose, heightRatio = null, translateY, children = null }) => {
  const { screenBg, mutedText, c } = useDashboardTheme();
  const { bottom } = useSafeAreaInsets();

  // Opposing `top` and `bottom` edges form a hard layout constraint, so long
  // child content can only scroll instead of expanding the sheet.
  const sheetTop = getSheetTop(heightRatio);

  return (
    <View style={styles.root}>
      {/* The same plain scrim the Settings sheets use, at full strength from the
          first frame. This was a native blur faded in over 100ms, which made the
          Dashboard's sheets read as a different component to the rest of the app
          — and rendered differently on iOS and Android, since the two platforms
          do not blur alike. */}
      <Pressable style={[styles.dim, { backgroundColor: c.scrim }]} onPress={onClose} />
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: screenBg,
            top: sheetTop,
            paddingBottom: bottom,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Muted text colour, not `separator` — separator is #eeeeee in light
            mode, which is invisible against the sheet. */}
        <View style={[styles.handle, { backgroundColor: mutedText }]} />
        {children}
      </Animated.View>
    </View>
  );
};

SheetBody.propTypes = {
  onClose: PropTypes.func.isRequired,
  heightRatio: PropTypes.number,
  translateY: PropTypes.instanceOf(Animated.Value).isRequired,
  children: PropTypes.node,
};

/**
 * The dashboard's one way of covering the screen: an instant scrim with a
 * rounded sheet sliding up from the bottom, carrying a grab handle.
 *
 * Extracted so every dashboard overlay presents identically — the month/year
 * picker already looked like this while the layout and bani editors were plain
 * full-screen modals, which is what made them feel like a different app.
 *
 * The entrance itself comes from `useSheetPresentation`, shared with the
 * Settings `Sheet`, so the Dashboard's sheets and the rest of the app's now
 * open the same way rather than merely looking similar.
 *
 * A caller can pin the sheet below a percentage-based top edge. This supplies a
 * definite height to the content tree, so long lists scroll within the sheet.
 */
const SheetModal = ({ visible, onClose, heightRatio = null, children = null }) => {
  const { mounted, translateY, onShow } = useSheetPresentation(visible);

  if (!mounted) return null;

  return (
    // Entrance starts on `onShow` — see `useSheetPresentation`.
    <Overlay animationType="none" onRequestClose={onClose} onShow={onShow}>
      {/* Modal content needs its own provider so the sheet can pad above the
          bottom system inset. */}
      <SafeAreaProvider>
        <SheetBody onClose={onClose} heightRatio={heightRatio} translateY={translateY}>
          {children}
        </SheetBody>
      </SafeAreaProvider>
    </Overlay>
  );
};

SheetModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  heightRatio: PropTypes.number,
  children: PropTypes.node,
};

export default SheetModal;
