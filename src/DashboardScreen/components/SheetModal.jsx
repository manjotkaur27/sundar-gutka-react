import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "@react-native-community/blur";
import PropTypes from "prop-types";
import useTheme from "@common/context";
import useDashboardTheme from "./dashboardTheme";

// How far below its resting position the sheet starts and ends. Must clear the
// tallest sheet so the slide never shows a hard cut at the bottom edge.
const TRAVEL = 700;

export const getSheetTop = (heightRatio) =>
  heightRatio == null ? undefined : `${(1 - heightRatio) * 100}%`;

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
const SheetBody = ({ onClose, heightRatio, dimOpacity, translateY, children }) => {
  const { screenBg, mutedText } = useDashboardTheme();
  const { theme } = useTheme();
  const { bottom } = useSafeAreaInsets();

  // Opposing `top` and `bottom` edges form a hard layout constraint, so long
  // child content can only scroll instead of expanding the sheet.
  const sheetTop = getSheetTop(heightRatio);

  return (
    <View style={styles.root}>
      {/* Dark blur behind the sheet, the same backdrop the Settings pickers
          use, with an opaque fallback where blur is unavailable or the OS has
          reduced-transparency turned on. */}
      <Animated.View style={[styles.dim, { opacity: dimOpacity }]}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="dark"
          reducedTransparencyFallbackColor={theme.staticColors.NIGHT_OPACITY_BLACK}
          enabled
        />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
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
  dimOpacity: PropTypes.instanceOf(Animated.Value).isRequired,
  translateY: PropTypes.instanceOf(Animated.Value).isRequired,
  children: PropTypes.node,
};

SheetBody.defaultProps = { heightRatio: null, children: null };

/**
 * The dashboard's one way of covering the screen: a blurred backdrop with a
 * rounded sheet sliding up from the bottom, carrying a grab handle.
 *
 * Extracted so every dashboard overlay presents identically — the month/year
 * picker already looked like this while the layout and bani editors were plain
 * full-screen modals, which is what made them feel like a different app.
 *
 * A caller can pin the sheet below a percentage-based top edge. This supplies a
 * definite height to the content tree, so long lists scroll within the sheet.
 */
const SheetModal = ({ visible, onClose, heightRatio, children }) => {
  // Stays mounted through the closing animation, then unmounts.
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(visible ? 0 : TRAVEL)).current;
  const dimOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const animRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      animRef.current = Animated.parallel([
        Animated.timing(dimOpacity, {
          toValue: 1,
          duration: 100,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 140,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);
      animRef.current.start();
    } else if (mounted) {
      animRef.current = Animated.parallel([
        Animated.timing(dimOpacity, {
          toValue: 0,
          duration: 90,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: TRAVEL,
          duration: 110,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);
      animRef.current.start(() => setMounted(false));
    }
    // Stop an in-flight native-driven slide on unmount, or the driver keeps
    // updating props on a node whose backing value may already be torn down.
    // Deliberately keyed on `visible` alone: `mounted` is read to decide whether
    // a close animation is needed, but adding it would re-run the effect when
    // the close finishes and restart the animation.
    return () => animRef.current?.stop();
  }, [visible]);

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Modal content needs its own provider so the sheet can pad above the
          bottom system inset. */}
      <SafeAreaProvider>
        <SheetBody
          onClose={onClose}
          heightRatio={heightRatio}
          dimOpacity={dimOpacity}
          translateY={translateY}
        >
          {children}
        </SheetBody>
      </SafeAreaProvider>
    </Modal>
  );
};

SheetModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  heightRatio: PropTypes.number,
  children: PropTypes.node,
};

SheetModal.defaultProps = { heightRatio: null, children: null };

export default SheetModal;
