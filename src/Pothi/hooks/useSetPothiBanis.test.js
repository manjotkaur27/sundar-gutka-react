/* eslint-env jest */
import { useSelector } from "react-redux";
import { renderHook } from "@testing-library/react-native";
import { useNetwork } from "@common/context/NetworkContext";
import { actions, showToast } from "@common";
import useSetPothiBanis from "./useSetPothiBanis";

const mockDispatch = jest.fn();

jest.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: jest.fn(),
}));
jest.mock("@common/context/NetworkContext", () => ({ useNetwork: jest.fn() }));
jest.mock("@common", () => ({
  actions: {
    addBaniToPothi: jest.fn((id, item) => ({ type: "ADD", id, baaniId: item.baaniId })),
    removeBaniFromPothi: jest.fn((id, baaniId) => ({ type: "REMOVE", id, baaniId })),
  },
  showToast: jest.fn(),
  constant: { POTHI_ENABLED: true },
  STRINGS: {
    POTHI_INTERNET_REQUIRED: "Internet required",
    POTHI_SIGN_IN_REQUIRED: "Sign in required",
  },
  trackPothiEvent: jest.fn(),
}));

// One apply for the Add Banis sheet and the Dashboard's Nitnem editor. The
// point of it is that a pothi is edited by DIFFERENCE: a whole-list write would
// re-stamp `updatedAt` on items nobody touched and lose them to the other
// device's copy on the next merge.

const apply = () => renderHook(() => useSetPothiBanis()).result.current;
const item = (baaniId) => ({ id: `i${baaniId}`, type: "bani", baaniId, title: `B${baaniId}` });
const pothi = { id: "p1", items: [item(2), item(4)] };

const dispatched = () => mockDispatch.mock.calls.map((call) => call[0]);

beforeEach(() => {
  jest.clearAllMocks();
  useSelector.mockImplementation((fn) => fn({ auth: { status: "signedIn" } }));
  useNetwork.mockReturnValue({ isOffline: false });
});

describe("useSetPothiBanis", () => {
  it("dispatches only the difference, leaving untouched banis alone", () => {
    expect(apply()(pothi, [item(2), item(9)])).toBe(true);

    // 2 was already there and is not rewritten; 9 is added and 4 removed.
    expect(dispatched()).toEqual([
      { type: "ADD", id: "p1", baaniId: 9 },
      { type: "REMOVE", id: "p1", baaniId: 4 },
    ]);
  });

  it("writes nothing when the selection has not changed", () => {
    apply()(pothi, [item(2), item(4)]);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("removes every bani when the selection is emptied", () => {
    apply()(pothi, []);
    expect(dispatched()).toEqual([
      { type: "REMOVE", id: "p1", baaniId: 2 },
      { type: "REMOVE", id: "p1", baaniId: 4 },
    ]);
  });

  it("refuses, and says why, when the edit cannot reach the account", () => {
    useSelector.mockImplementation((fn) => fn({ auth: { status: "signedOut" } }));
    expect(apply()(pothi, [item(9)])).toBe(false);
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith("Sign in required");
  });

  it("refuses when offline", () => {
    useNetwork.mockReturnValue({ isOffline: true });
    expect(apply()(pothi, [item(9)])).toBe(false);
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith("Internet required");
  });

  it("does nothing without a pothi to write to", () => {
    expect(apply()(null, [item(9)])).toBe(false);
    expect(actions.addBaniToPothi).not.toHaveBeenCalled();
  });
});
