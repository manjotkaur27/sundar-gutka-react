/* eslint-env jest */
import { useSelector } from "react-redux";
import { renderHook } from "@testing-library/react-native";
import { showToast } from "@common";
import useRequireSignIn from "./useRequireSignIn";

jest.mock("react-redux", () => ({ useSelector: jest.fn() }));
jest.mock("@common", () => ({
  constant: { SETTINGS: "Settings" },
  showToast: jest.fn(),
  STRINGS: { POTHI_SIGN_IN_REQUIRED: "Sign in required" },
}));

// The gate for an ENTRY POINT rather than a mutation: a toast alone would leave
// the user looking at a control that does nothing, so this also takes them to
// the one screen that fixes the problem.

const mockAuth = (status) => {
  useSelector.mockImplementation((fn) => fn({ auth: { status } }));
};

const guard = (navigate, params) =>
  renderHook(() => useRequireSignIn(navigate, params)).result.current;

beforeEach(() => jest.clearAllMocks());

describe("useRequireSignIn", () => {
  it("lets a signed-in user through without toasting or navigating", () => {
    mockAuth("signedIn");
    const navigate = jest.fn();

    expect(guard(navigate)()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it("says why and sends a signed-out user to Settings", () => {
    mockAuth("signedOut");
    const navigate = jest.fn();

    expect(guard(navigate)()).toBe(false);
    expect(showToast).toHaveBeenCalledWith("Sign in required");
    expect(navigate).toHaveBeenCalledWith("Settings", undefined);
  });

  it("blocks before the session is restored, when the status is not yet known", () => {
    // Anything other than a confirmed session is treated as signed out: opening
    // a sheet that cannot sync is worse than a redirect the user can back out
    // of.
    mockAuth("unknown");
    expect(guard(jest.fn())()).toBe(false);
  });

  it("forwards the caller's route params to Settings", () => {
    // The Reader passes `fromReader` so Settings keeps the reader's bottom bar
    // instead of dropping the user onto the home one.
    mockAuth("signedOut");
    const navigate = jest.fn();

    guard(navigate, { fromReader: true })();

    expect(navigate).toHaveBeenCalledWith("Settings", { fromReader: true });
  });
});
