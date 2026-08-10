import { useEffect } from "react";
import { useSelector } from "react-redux";
import { showToast, STRINGS } from "@common";

// Once per app launch, not once per visit. Module scope rather than component
// state so the two entry points into the list — the Folders tab and the My
// Pothis screen — share the same latch and cannot toast twice between them.
let hinted = false;

/** Test-only: the latch outlives a render, so a suite has to clear it. */
export const resetSignedOutHint = () => {
  hinted = false;
};

/**
 * Tells a signed-out user, once, that signing in is what makes their pothis
 * follow the account.
 *
 * A toast rather than the banner that used to sit above the list: the banner
 * was permanent furniture for a message that only needs saying once, and it
 * pushed the list down on every visit for a user who had already read it.
 */
const useSignedOutPothiHint = () => {
  const status = useSelector((state) => state.auth?.status);
  useEffect(() => {
    // Only the settled "signedOut" state. On a cold start the status is
    // "unknown" until the Keychain read resolves, and toasting then would tell
    // an already signed-in user to sign in.
    if (status !== "signedOut" || hinted) return;
    hinted = true;
    showToast(STRINGS.POTHI_SIGN_IN_HINT);
  }, [status]);
};

export default useSignedOutPothiHint;
