import { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MAX_PINNED } from "@common/pothi/model";
import { actions, constant, showToast, STRINGS, trackPothiEvent } from "@common";
import useRequireOnline from "./useRequireOnline";

/**
 * Everything the Folders list needs from its host screen.
 *
 * Shared by the Folders tab on Home and the standalone My Pothis screen, which
 * render the same `PothiList`. Without this the two would each carry their own
 * copy of open-bani, open-pothi, the create sheet's state and the pin-limit
 * toast — four chances for them to drift apart.
 *
 * @param {Function} navigate the host's navigation.navigate
 */
const usePothiActions = (navigate) => {
  const dispatch = useDispatch();
  const isSignedIn = useSelector((state) => state.auth?.status === "signedIn");
  // Covers connectivity too, so Create keeps refusing offline exactly as
  // before — this just adds the sign-in half of the same gate.
  const requireOnline = useRequireOnline();
  const [creating, setCreating] = useState(false);

  // Opening a single shabad from inside a pothi is the same navigation the bani
  // list's own rows do, so it goes through one path rather than two.
  const openBani = useCallback(
    (bani) => {
      dispatch(actions.toggleAudio(false));
      navigate(constant.READER, {
        key: `Reader-${bani.id}`,
        params: { id: bani.id, title: bani.gurmukhi, titleUni: bani.gurmukhiUni },
      });
    },
    [dispatch, navigate]
  );

  const openPothi = useCallback(
    (pothi) => {
      trackPothiEvent("opened", { size: pothi.count, system: pothi.system });
      dispatch(actions.toggleAudio(false));
      navigate(constant.POTHI_READER, {
        key: `Pothi-${pothi.id}`,
        params: { pothiId: pothi.id, title: pothi.titleUni || pothi.name, baniIds: pothi.baniIds },
      });
    },
    [dispatch, navigate]
  );

  const onPinLimit = useCallback(
    () => showToast(STRINGS.formatString(STRINGS.POTHI_PIN_LIMIT, { count: MAX_PINNED })),
    []
  );

  // Signed out, tapping "+ New Pothi" does not open the create sheet at all —
  // there is nowhere for a signed-out pothi to sync to (see usePothiSync) — it
  // sends the user to Settings to sign in instead. `requireOnline` covers
  // every OTHER mutation with a toast alone; this one extra step is specific
  // to the entry point that would otherwise dead-end the user in a sheet they
  // cannot submit.
  const openCreate = useCallback(() => {
    if (!isSignedIn) {
      showToast(STRINGS.POTHI_SIGN_IN_REQUIRED);
      navigate(constant.SETTINGS);
      return;
    }
    if (!requireOnline()) return;
    setCreating(true);
  }, [isSignedIn, requireOnline, navigate]);

  return {
    openBani,
    openPothi,
    onPinLimit,
    creating,
    openCreate,
    closeCreate: useCallback(() => setCreating(false), []),
    onCreated: useCallback(() => showToast(STRINGS.POTHI_CREATED, "success"), []),
  };
};

export default usePothiActions;
