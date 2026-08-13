import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setAuthSession, clearAuthSession, setAuthBusy } from "../actions";
import { showConfirm } from "../components/ConfirmDialog";
import STRINGS from "../localization";
import { purgeLocalUserData, writeLastAccount } from "../sso/accountScope";
import { startLogin, startLogout } from "../sso/khalisSso";
import { readToken } from "../sso/tokenStore";
import { showErrorToast, showInfoToast } from "../toast";

/**
 * Sign-in / sign-out actions shared by the Settings account row and the
 * Dashboard header avatar, so the busy-state, toast and dispatch handling lives
 * in exactly one place.
 *
 * Session *restoration* and expiry are not here — those belong to
 * useSsoSession, which owns the lifecycle for the whole app.
 */
const useSsoActions = () => {
  const dispatch = useDispatch();
  const { status, user, busy } = useSelector((state) => state.auth);

  const signIn = useCallback(async () => {
    if (busy) return;
    dispatch(setAuthBusy(true));
    try {
      const result = await startLogin();
      if (result.status === "success") {
        dispatch(setAuthSession({ user: result.user, expiresAt: result.expiresAt }));
      } else if (result.status === "error") {
        showErrorToast(STRINGS.SIGN_IN_FAILED);
      }
      // "cancelled" — deliberate user action, stay silent.
      // "pending"  — the system browser took over; useSsoSession's deep-link
      //              listener completes the session when it returns.
    } finally {
      dispatch(setAuthBusy(false));
    }
  }, [busy, dispatch]);

  const signOut = useCallback(() => {
    if (busy) return;
    showConfirm({
      title: STRINGS.SIGN_OUT_CONFIRM_TITLE,
      message: STRINGS.SIGN_OUT_CONFIRM_MESSAGE,
      cancelText: STRINGS.CANCEL,
      confirmText: STRINGS.SIGN_OUT,
      destructive: true,
      onConfirm: async () => {
        dispatch(setAuthBusy(true));
        try {
          // Read before clearing: /logout/all needs the token to end the IdP
          // session. startLogout clears local storage itself.
          const token = await readToken();
          const { remote } = await startLogout(token);
          dispatch(clearAuthSession());

          // Signing out is an explicit "I am done on this device", so the data
          // goes with the session. Without this the next person to open the app
          // — signed in as someone else, or not signed in at all — still sees
          // this account's streaks, history and bookmarks.
          //
          // Deliberately here and NOT in useSsoSession.endSession, which also
          // fires on token expiry: wiping there would cost a user their own
          // history for the crime of not opening the app for a week.
          await purgeLocalUserData(dispatch);
          await writeLastAccount(null);
          // An expired token can't end the IdP session (the SP 401s it), so be
          // honest rather than implying a full sign-out happened.
          if (!remote) showInfoToast(STRINGS.SIGN_OUT_LOCAL_ONLY);
        } finally {
          dispatch(setAuthBusy(false));
        }
      },
    });
  }, [busy, dispatch]);

  return { status, user, busy, signIn, signOut };
};

export default useSsoActions;
