import { useCallback } from "react";
import { useSelector } from "react-redux";
import { constant, showToast, STRINGS } from "@common";

/**
 * Gate for a pothi ENTRY POINT, as opposed to a pothi mutation.
 *
 * `useRequireOnline` toasts and stops. That is right for a control the user is
 * already looking at, but wrong for the taps that would otherwise open a sheet
 * with nothing behind it — "+ New Pothi", and the Reader's add-to-pothi action.
 * There is nowhere for a signed-out pothi to sync to (see usePothiSync), so
 * those send the user to Settings to sign in rather than dead-ending them in a
 * form they cannot submit.
 *
 * Sign-in only. A caller that also writes still runs `useRequireOnline` after
 * this, which covers connectivity.
 *
 * @param {Function} navigate the host's navigation.navigate
 * @param {object} [settingsParams] route params for Settings — the Reader
 *   passes `{ fromReader: true }` so Settings keeps the reader's bottom bar.
 * @returns {() => boolean} true to proceed; false having already redirected.
 */
const useRequireSignIn = (navigate, settingsParams = undefined) => {
  const isSignedIn = useSelector((state) => state.auth?.status === "signedIn");

  return useCallback(() => {
    if (isSignedIn) return true;
    showToast(STRINGS.POTHI_SIGN_IN_REQUIRED);
    navigate(constant.SETTINGS, settingsParams);
    return false;
  }, [isSignedIn, navigate, settingsParams]);
};

export default useRequireSignIn;
