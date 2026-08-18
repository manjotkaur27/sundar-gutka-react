import { useCallback } from "react";
import { useSelector } from "react-redux";
import { useNetwork } from "@common/context/NetworkContext";
import { constant, showToast, STRINGS } from "@common";

/**
 * Gate for every pothi mutation.
 *
 * A pothi is cached for READING offline and signed out — browsing, expanding
 * and Open Pothi all work with neither. Changing one requires both: creating,
 * renaming, deleting, adding or removing a shabad, reordering and pinning all
 * need an account (there is nowhere for a signed-out edit to sync to — see
 * usePothiSync) and a connection, and say so rather than failing silently or
 * queueing a write the user cannot see.
 *
 * Signed-out is checked first: an offline, signed-out user should be told to
 * sign in, not to reconnect — they need a connection to do that anyway, so
 * it's the more useful of the two messages.
 *
 * Uses the app's existing NetworkProvider, which treats "not yet known" as
 * ONLINE — so the startup window never blocks a legitimate edit, and only a
 * confirmed offline state stops one.
 *
 * @returns {() => boolean} true to proceed; false having already toasted.
 */
const useRequireOnline = () => {
  const { isOffline } = useNetwork();
  const isSignedIn = useSelector((state) => state.auth?.status === "signedIn");
  return useCallback(() => {
    // With My Pothi off, the only edit that reaches this gate is Today's Nitnem
    // on the Dashboard, and that list is then a purely LOCAL one: there is no
    // account to sync it to and no request to make, so it needs neither a
    // session nor a connection. Signed in, nothing is lost — the edit lands in
    // the same pothi and usePothiSync uploads it as it always did.
    if (!constant.POTHI_ENABLED) return true;
    if (!isSignedIn) {
      showToast(STRINGS.POTHI_SIGN_IN_REQUIRED);
      return false;
    }
    if (isOffline) {
      showToast(STRINGS.POTHI_INTERNET_REQUIRED);
      return false;
    }
    return true;
  }, [isOffline, isSignedIn]);
};

export default useRequireOnline;
