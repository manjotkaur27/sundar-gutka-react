import { useCallback, useEffect, useRef, useState } from "react";
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
//
// ── Why the entrance hangs off `onShow` and not an effect ──────────────────
// A Modal is a separate native window. Its children are not attached when the
// commit that renders the Modal runs its effects, so a native-driven animation
// started there targets a view that does not exist yet — the driver drops it
// silently, and the sheet simply stays at its off-screen start value. The
// symptom is brutal and total: the scrim covers the screen, no panel ever
// arrives, and the only way out is to tap the scrim.
//
// `onShow` is React Native's documented "the modal is now on screen" callback,
// and on Android it is dispatched straight from the Dialog's own
// `setOnShowListener` (ReactModalHostManager.addEventEmitters). Starting the
// slide there is therefore ordered by the platform rather than by a guess about
// how many frames the window takes to appear — no timers, no retries, and
// nothing to tune per device.

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
 * @returns {{ mounted: boolean, translateY: Animated.Value, onShow: Function }}
 *   `mounted` stays true until the closing slide has finished, so the caller can
 *   return null and unmount only once the sheet is actually off screen. `onShow`
 *   MUST be handed to the Modal's prop of the same name — it is what starts the
 *   entrance, so a sheet that does not wire it up never appears.
 */
const useSheetPresentation = (visible) => {
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(visible ? 0 : SHEET_TRAVEL)).current;
  const animRef = useRef(null);

  useEffect(() => {
    if (visible) {
      // Always enter from a known position. A close that was interrupted part
      // way leaves the value somewhere in between, and without this the next
      // opening would slide up from wherever it happened to stop.
      translateY.setValue(SHEET_TRAVEL);
      setMounted(true);
    } else if (mounted) {
      animRef.current = Animated.timing(translateY, {
        toValue: SHEET_TRAVEL,
        duration: CLOSE_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      });
      // Only unmount if the slide actually RAN to the end. `stop()` still
      // invokes this callback, with `finished: false` — so reopening mid-close
      // would otherwise stop the close, fire this, and unmount a sheet that was
      // supposed to be on screen, leaving the scrim up with no sheet under it.
      animRef.current.start(({ finished }) => {
        if (finished) setMounted(false);
      });
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

  /**
   * Starts the entrance. Hand straight to the Modal's `onShow` — by the time
   * the platform calls it, the sheet's native view exists and the native driver
   * has something real to animate.
   */
  const onShow = useCallback(() => {
    animRef.current = Animated.timing(translateY, {
      toValue: 0,
      duration: OPEN_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animRef.current.start();
  }, [translateY]);

  return { mounted, translateY, onShow };
};

export default useSheetPresentation;
