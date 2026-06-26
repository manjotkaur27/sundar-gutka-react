import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setOnboardingVisible } from "../actions";

/**
 * Auto-opens the onboarding carousel once, on a genuine fresh install.
 *
 * `baniLength === ""` is the same "brand-new install" signal the Bani-length
 * selector uses, so existing users updating into this release (whose baniLength
 * is already set) never get the carousel pushed at them — they can still reach
 * it via Settings → Revisit Tutorial. `hasSeenOnboarding` then keeps it from
 * re-opening on later launches once finished/skipped.
 *
 * Mounted inside the Redux + PersistGate tree (see app.js GlobalServices), so it
 * reads already-rehydrated values.
 */
const useOnboardingTrigger = () => {
  const dispatch = useDispatch();
  const baniLength = useSelector((state) => state.baniLength);
  const hasSeenOnboarding = useSelector((state) => state.hasSeenOnboarding);
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (baniLength === "" && !hasSeenOnboarding) {
      firedRef.current = true;
      dispatch(setOnboardingVisible(true));
    }
  }, [baniLength, hasSeenOnboarding, dispatch]);
};

export default useOnboardingTrigger;
