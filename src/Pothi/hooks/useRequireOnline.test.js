import { useSelector } from "react-redux";
import { renderHook } from "@testing-library/react-native";
import { useNetwork } from "@common/context/NetworkContext";
import { showToast } from "@common";
import useRequireOnline from "./useRequireOnline";

jest.mock("react-redux", () => ({ useSelector: jest.fn() }));
jest.mock("@common/context/NetworkContext", () => ({ useNetwork: jest.fn() }));
jest.mock("@common", () => ({
  showToast: jest.fn(),
  STRINGS: {
    POTHI_INTERNET_REQUIRED: "Internet required",
    POTHI_SIGN_IN_REQUIRED: "Sign in required",
  },
}));

// A pothi is cached for READING offline and signed out; changing one requires
// both an account and a connection. This is the single gate every mutation
// goes through, so its three behaviours — let the edit through, or block it
// and say why — are what the whole rule rests on.

const guard = () => renderHook(() => useRequireOnline()).result.current;

const mockAuth = (status) => {
  useSelector.mockImplementation((fn) => fn({ auth: { status } }));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth("signedIn");
});

describe("useRequireOnline", () => {
  it("lets an edit through when online and signed in, silently", () => {
    useNetwork.mockReturnValue({ isOffline: false });
    expect(guard()()).toBe(true);
    expect(showToast).not.toHaveBeenCalled();
  });

  it("blocks an edit when offline and says why", () => {
    useNetwork.mockReturnValue({ isOffline: true });
    expect(guard()()).toBe(false);
    expect(showToast).toHaveBeenCalledWith("Internet required");
  });

  it("allows the edit while connectivity is still unknown", () => {
    // NetworkProvider reports `isOffline: false` until NetInfo answers. Blocking
    // during that startup window would refuse a legitimate edit made in the
    // first second after launch.
    useNetwork.mockReturnValue({ isOffline: false, isConnected: null });
    expect(guard()()).toBe(true);
    expect(showToast).not.toHaveBeenCalled();
  });

  it("blocks an edit when signed out, even online, and says why", () => {
    useNetwork.mockReturnValue({ isOffline: false });
    mockAuth("signedOut");
    expect(guard()()).toBe(false);
    expect(showToast).toHaveBeenCalledWith("Sign in required");
  });

  it("blocks an edit before the session is restored (status unknown)", () => {
    useNetwork.mockReturnValue({ isOffline: false });
    mockAuth("unknown");
    expect(guard()()).toBe(false);
  });

  it("prefers the sign-in message when both signed out and offline", () => {
    // Signing in needs a connection anyway, so it is the more useful of the
    // two things to tell a signed-out, offline user.
    useNetwork.mockReturnValue({ isOffline: true });
    mockAuth("signedOut");
    expect(guard()()).toBe(false);
    expect(showToast).toHaveBeenCalledWith("Sign in required");
    expect(showToast).toHaveBeenCalledTimes(1);
  });
});
