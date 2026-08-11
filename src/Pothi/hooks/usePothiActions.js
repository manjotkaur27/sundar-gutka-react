import { useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { MAX_PINNED } from "@common/pothi/model";
import { actions, constant, showToast, STRINGS } from "@common";
import useRequireOnline from "./useRequireOnline";
import useRequireSignIn from "./useRequireSignIn";

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
  // Covers connectivity too, so Create keeps refusing offline exactly as
  // before — this just adds the sign-in half of the same gate.
  const requireOnline = useRequireOnline();
  const requireSignIn = useRequireSignIn(navigate);
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

  // Opens a pothi's banis as an ordinary bani list on its own screen, rather
  // than expanding a second list inside the first. FolderScreen is that list —
  // it already renders `BaniList` and opens a bani exactly as All Banis does,
  // so a bani reached through a pothi behaves identically to one reached
  // anywhere else. The caller resolves the rows and the title; see PothiList.
  const openPothi = useCallback(
    (payload) => {
      navigate(constant.FOLDERSCREEN, { params: payload });
    },
    [navigate]
  );

  const onPinLimit = useCallback(
    () => showToast(STRINGS.formatString(STRINGS.POTHI_PIN_LIMIT, { count: MAX_PINNED })),
    []
  );

  // Signed out, tapping "+ New Pothi" does not open the create sheet at all: it
  // sends the user to Settings to sign in. See useRequireSignIn, which the
  // Reader's add-to-pothi action shares — the two entry points that would
  // otherwise dead-end in a sheet the user cannot submit.
  const openCreate = useCallback(() => {
    if (!requireSignIn()) return;
    if (!requireOnline()) return;
    setCreating(true);
  }, [requireSignIn, requireOnline]);

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
