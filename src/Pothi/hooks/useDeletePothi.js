import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { actions, showConfirm, showToast, STRINGS, trackPothiEvent } from "@common";
import useRequireOnline from "./useRequireOnline";

/**
 * Confirm, then delete a whole pothi.
 *
 * Shared by the two places that offer it — long-pressing a row in the Folders
 * tab, and the folder screen's overflow — so the wording, the destructive
 * styling and the gate cannot drift apart between them.
 *
 * The pothi is named in the question rather than described in a second line of
 * body text: "Delete Nitnem pothi?" already says which one and what happens, and
 * a dialog with a title alone is one line to read instead of three.
 *
 * Connectivity is checked on CONFIRM rather than on open, so the answer is the
 * one that applies at the moment the write would actually happen.
 *
 * @returns {(pothi: {id: string, name: string, count: number}, onDeleted?: Function) => void}
 */
const useDeletePothi = () => {
  const dispatch = useDispatch();
  const requireOnline = useRequireOnline();

  return useCallback(
    ({ id, name, count }, onDeleted = null) => {
      showConfirm({
        title: STRINGS.formatString(STRINGS.POTHI_DELETE_CONFIRM, { name }),
        cancelText: STRINGS.CANCEL,
        confirmText: STRINGS.POTHI_DELETE,
        destructive: true,
        onConfirm: () => {
          if (!requireOnline()) return;
          dispatch(actions.deletePothi(id));
          trackPothiEvent("deleted", { size: count });
          showToast(STRINGS.POTHI_DELETED, "success");
          if (onDeleted) onDeleted();
        },
      });
    },
    [dispatch, requireOnline]
  );
};

export default useDeletePothi;
