/* eslint-env jest */
import { useSelector } from "react-redux";
import { act, renderHook } from "@testing-library/react-native";
import { useNetwork } from "@common/context/NetworkContext";
import { showToast } from "@common";
import usePothiActions from "./usePothiActions";

jest.mock("react-redux", () => ({
  useDispatch: () => jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock("@common/context/NetworkContext", () => ({ useNetwork: jest.fn() }));

jest.mock("@common", () => ({
  actions: { toggleAudio: (v) => ({ type: "TOGGLE_AUDIO", v }) },
  constant: { READER: "Reader", POTHI_READER: "PothiReader", SETTINGS: "Settings" },
  showToast: jest.fn(),
  STRINGS: {
    POTHI_SIGN_IN_REQUIRED: "Sign in required",
    POTHI_CREATED: "Pothi created",
    POTHI_PIN_LIMIT: "Limit {count}",
    formatString: (s, vars) => s.replace("{count}", vars.count),
  },
  trackPothiEvent: jest.fn(),
}));

const mockAuth = (status) => {
  useSelector.mockImplementation((fn) => fn({ auth: { status } }));
};

describe("usePothiActions.openCreate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNetwork.mockReturnValue({ isOffline: false });
  });

  // "+ New Pothi" while signed out cannot just toast and stay put — there is
  // no account for a signed-out pothi to belong to (see usePothiSync), so the
  // create sheet has nothing useful to submit to. It sends the user to the
  // one place that fixes that.
  it("redirects to Settings and does not open the sheet when signed out", () => {
    mockAuth("signedOut");
    const navigate = jest.fn();
    const { result } = renderHook(() => usePothiActions(navigate));

    act(() => result.current.openCreate());

    expect(navigate).toHaveBeenCalledWith("Settings");
    expect(showToast).toHaveBeenCalledWith("Sign in required");
    expect(result.current.creating).toBe(false);
  });

  it("opens the sheet when signed in and online", () => {
    mockAuth("signedIn");
    const navigate = jest.fn();
    const { result } = renderHook(() => usePothiActions(navigate));

    act(() => result.current.openCreate());

    expect(navigate).not.toHaveBeenCalled();
    expect(result.current.creating).toBe(true);
  });

  it("stays blocked offline even when signed in", () => {
    mockAuth("signedIn");
    useNetwork.mockReturnValue({ isOffline: true });
    const navigate = jest.fn();
    const { result } = renderHook(() => usePothiActions(navigate));

    act(() => result.current.openCreate());

    expect(navigate).not.toHaveBeenCalled();
    expect(result.current.creating).toBe(false);
  });
});
