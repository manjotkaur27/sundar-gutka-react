import { useSelector } from "react-redux";
import { CURRENT_TOUR_VERSION } from "./tourVersion";

/**
 * Returns whether a given contextual coachmark should still be shown for the
 * current tour version. A coachmark is "seen" once its stored version matches
 * CURRENT_TOUR_VERSION. An empty/missing entry (fresh install, or a user
 * updating into the version that ships this coachmark) means it should show.
 *
 * The selector is already reactive, so once the coachmark is marked seen this
 * recomputes to false and the sequence won't re-trigger.
 */
const useCoachmark = (key) => {
  const seenVersion = useSelector((state) => state.coachmarksSeen?.[key]);
  // A single Skip / "Not now" anywhere opts the user out of the entire tour, so
  // gate every coachmark on this one flag — no per-screen wiring needed.
  const optedOut = useSelector((state) => state.tourOptedOut);
  return { shouldShow: !optedOut && seenVersion !== CURRENT_TOUR_VERSION };
};

export default useCoachmark;
