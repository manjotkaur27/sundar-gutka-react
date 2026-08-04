import { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";

// How every bottom sheet in the app enters and leaves.
//
// Shared by the Settings `Sheet` and the Dashboard's `SheetModal` so the two
// present identically. They used to differ in both halves: Settings leaned on
// `Modal animationType="slide"`, which slides the WHOLE modal — scrim included
// — so the black overlay wiped up the screen with the sheet instead of being
// there the moment you tapped. The Dashboard faded its backdrop in over 100ms
// behind a native blur, which read as a third thing again.
//
// The rule now: THE SCRIM IS INSTANT, THE SHEET SLIDES. The scrim is what tells
// you the tap registered, so it has nothing to gain from an animation; the
// slide is what tells you where the sheet came from, so it keeps one.
//
// `useNativeDriver` keeps the slide on the UI thread, which matters on the low
// end of the supported range where a JS-driven transform stutters.

/**
 * Distance below its resting position that a sheet starts and ends at. Must
 * clear the tallest sheet, or the slide shows a hard cut at the bottom edge.
 */
export const SHEET_TRAVEL = 700;

const OPEN_DURATION = 140;
const CLOSE_DURATION = 110;

/**
 * Drives a bottom sheet's slide and keeps it mounted through its exit.
 *
 * @param {boolean} visible Whether the sheet should be shown.
 * @returns {{ mounted: boolean, translateY: Animated.Value }} `mounted` stays
 *   true until the closing slide has finished, so the caller can return null
 *   and unmount only once the sheet is actually off screen.
 */
const useSheetPresentation = (visible) => {
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(visible ? 0 : SHEET_TRAVEL)).current;
  const animRef = useRef(null);

  // Opening is two steps on purpose. This effect only MOUNTS the sheet; the one
  // below starts the slide, and it cannot run until the Modal — and therefore
  // the animated node — is actually in the tree. Starting a native-driven
  // animation in the same tick as the mount means it begins against a node that
  // does not exist yet, and the first frames are dropped.
  useEffect(() => {
    if (visible) {
      setMounted(true);
    } else if (mounted) {
      animRef.current = Animated.timing(translateY, {
        toValue: SHEET_TRAVEL,
        duration: CLOSE_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      });
      animRef.current.start(() => setMounted(false));
    }
    // Stop an in-flight native-driven slide on unmount, or the driver keeps
    // updating props on a node whose backing value may already be torn down.
    //
    // Keyed on `visible` alone on purpose: `mounted` is read to decide whether a
    // close animation is needed, but listing it would re-run the effect when the
    // close finishes and start the animation over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => animRef.current?.stop();
  }, [visible]);

  // Runs on the commit that first rendered the Modal, so the sheet slides up
  // from off screen rather than snapping into place.
  useEffect(() => {
    if (!mounted || !visible) return undefined;
    const anim = Animated.timing(translateY, {
      toValue: 0,
      duration: OPEN_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [mounted, visible, translateY]);

  return { mounted, translateY };
};

export default useSheetPresentation;
