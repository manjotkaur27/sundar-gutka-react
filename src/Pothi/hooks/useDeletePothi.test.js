/* eslint-env jest */
import { useSelector } from "react-redux";
import { renderHook } from "@testing-library/react-native";
import { useNetwork } from "@common/context/NetworkContext";
import { actions, showConfirm, showToast } from "@common";
import useDeletePothi from "./useDeletePothi";

const mockDispatch = jest.fn();

jest.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: jest.fn(),
}));
jest.mock("@common/context/NetworkContext", () => ({ useNetwork: jest.fn() }));
jest.mock("@common", () => ({
  actions: { deletePothi: jest.fn((id) => ({ type: "DELETE_POTHI", id })) },
  showConfirm: jest.fn(),
  showToast: jest.fn(),
  // useRequireOnline reads this; without it the gate short-circuits open.
  constant: { POTHI_ENABLED: true },
  STRINGS: {
    CANCEL: "Cancel",
    POTHI_DELETE: "Delete",
    POTHI_DELETE_CONFIRM: "Delete {name} pothi?",
    POTHI_DELETED: "Pothi deleted",
    POTHI_INTERNET_REQUIRED: "Internet required",
    POTHI_SIGN_IN_REQUIRED: "Sign in required",
    formatString: (s, vars) => s.replace("{name}", vars.name),
  },
  trackPothiEvent: jest.fn(),
}));

// One confirm-then-delete for both places that offer it. What matters is that
// deleting is never silent, never immediate, and never happens when the write
// cannot reach the account.

const remove = () => renderHook(() => useDeletePothi()).result.current;

/** Runs whatever the confirm dialog would run if the user tapped Delete. */
const confirmIt = () => showConfirm.mock.calls[0][0].onConfirm();

beforeEach(() => {
  jest.clearAllMocks();
  useSelector.mockImplementation((fn) => fn({ auth: { status: "signedIn" } }));
  useNetwork.mockReturnValue({ isOffline: false });
});

describe("useDeletePothi", () => {
  it("asks first and deletes nothing until the confirm is answered", () => {
    remove()({ id: "p1", name: "Nitnem", count: 3 });

    expect(mockDispatch).not.toHaveBeenCalled();
    const dialog = showConfirm.mock.calls[0][0];
    expect(dialog.destructive).toBe(true);
    // Names the pothi in the question, and asks nothing else — no second line
    // of body text under it.
    expect(dialog.title).toBe("Delete Nitnem pothi?");
    expect(dialog.message).toBeUndefined();
  });

  it("deletes and reports success once confirmed", () => {
    remove()({ id: "p1", name: "Nitnem", count: 3 });
    confirmIt();

    expect(actions.deletePothi).toHaveBeenCalledWith("p1");
    expect(mockDispatch).toHaveBeenCalledWith({ type: "DELETE_POTHI", id: "p1" });
    expect(showToast).toHaveBeenCalledWith("Pothi deleted", "success");
  });

  it("runs the caller's callback after deleting, so the screen can leave", () => {
    const onDeleted = jest.fn();
    remove()({ id: "p1", name: "Nitnem", count: 0 }, onDeleted);
    confirmIt();

    expect(onDeleted).toHaveBeenCalled();
  });

  it("refuses on confirm when the write cannot reach the account", () => {
    // Checked at CONFIRM, not at open: the answer that matters is the one at
    // the moment the write would happen.
    useNetwork.mockReturnValue({ isOffline: true });
    const onDeleted = jest.fn();
    remove()({ id: "p1", name: "Nitnem", count: 3 }, onDeleted);
    confirmIt();

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith("Internet required");
  });
});
