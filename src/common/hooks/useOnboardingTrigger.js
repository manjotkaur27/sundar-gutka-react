import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setOnboardingVisible } from "../actions";

/**
 * Auto-opens the onboarding carousel once per user, gated solely on the
 * persisted `hasSeenOnboarding` flag.
 *
 * `hasSeenOnboarding` is new in this release and defaults to false, so both
 * brand-new installs and users updating into this release see the carousel
 * exactly once. Finishing or skipping sets the flag, so it never re-opens on
 * later launches; "Revisit Tutorial" in Settings reopens it on demand.
 *
 * Mounted inside the Redux + PersistGate tree (see app.js GlobalServices), so it
 * reads already-rehydrated values.
 */
const useOnboardingTrigger = () => {
  const dispatch = useDispatch();
  const hasSeenOnboarding = useSelector((state) => state.hasSeenOnboarding);
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (!hasSeenOnboarding) {
      firedRef.current = true;
      dispatch(setOnboardingVisible(true));
    }
  }, [hasSeenOnboarding, dispatch]);
};

export default useOnboardingTrigger;
