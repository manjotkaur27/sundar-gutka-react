/* eslint-env jest */
/**
 * Tests for the Khalis SSO `auth` slice.
 *
 * The default `status: "unknown"` is load-bearing, not cosmetic: the slice is
 * blacklisted from redux-persist (see store.js), so every cold start begins
 * here and the UI must be able to tell "not known yet" apart from "signed out"
 * — otherwise it flashes a signed-out state before the Keychain read resolves.
 *
 * Actions are built from `actionTypes` rather than imported from `./actions`:
 * that barrel pulls in Firebase analytics, which Jest does not transform. The
 * shapes below mirror the creators exactly (see actions/index.js).
 */

import * as actionTypes from "./actions/actionTypes";
import rootReducer from "./reducer";

const setAuthSession = (value) => ({ type: actionTypes.SET_AUTH_SESSION, value });
const clearAuthSession = () => ({ type: actionTypes.CLEAR_AUTH_SESSION });
const setAuthBusy = (value) => ({ type: actionTypes.SET_AUTH_BUSY, value });
const setUserProfile = (value) => ({ type: actionTypes.SET_USER_PROFILE, value });

const initial = () => rootReducer(undefined, { type: "@@INIT" });

const USER = {
  firstname: "Test",
  lastname: "User",
  email: "test@khalis.net",
  nameID: "test@khalis.net",
  nameIDFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
};

describe("auth slice defaults", () => {
  it("starts as 'unknown', not 'signedOut'", () => {
    expect(initial().auth.status).toBe("unknown");
  });

  it("has no user, expiry or busy flag by default", () => {
    const { auth } = initial();
    expect(auth.user).toBeNull();
    expect(auth.expiresAt).toBeNull();
    expect(auth.busy).toBe(false);
  });
});

describe("setAuthSession", () => {
  it("moves to signedIn and stores the claims + expiry", () => {
    const expiresAt = Date.now() + 60000;
    const state = rootReducer(undefined, setAuthSession({ user: USER, expiresAt }));
    expect(state.auth).toEqual({ status: "signedIn", user: USER, expiresAt, busy: false });
  });

  it("clears a pending busy flag, so a spinner cannot outlive the sign-in", () => {
    let state = rootReducer(undefined, setAuthBusy(true));
    expect(state.auth.busy).toBe(true);
    state = rootReducer(state, setAuthSession({ user: USER, expiresAt: 1 }));
    expect(state.auth.busy).toBe(false);
  });

  it("tolerates a missing payload rather than throwing", () => {
    const state = rootReducer(undefined, setAuthSession(undefined));
    expect(state.auth.status).toBe("signedIn");
    expect(state.auth.user).toBeNull();
    expect(state.auth.expiresAt).toBeNull();
  });
});

describe("clearAuthSession", () => {
  it("goes to signedOut and drops every trace of the session", () => {
    const signedIn = rootReducer(undefined, setAuthSession({ user: USER, expiresAt: Date.now() }));
    const state = rootReducer(signedIn, clearAuthSession());
    expect(state.auth).toEqual({
      status: "signedOut",
      user: null,
      expiresAt: null,
      busy: false,
    });
  });

  // Sign-out is reachable while a request is in flight; a stuck busy flag would
  // leave the row spinning forever.
  it("clears busy as well", () => {
    let state = rootReducer(undefined, setAuthBusy(true));
    state = rootReducer(state, clearAuthSession());
    expect(state.auth.busy).toBe(false);
  });
});

describe("setAuthBusy", () => {
  it("toggles without disturbing the session", () => {
    const expiresAt = Date.now() + 60000;
    let state = rootReducer(undefined, setAuthSession({ user: USER, expiresAt }));
    state = rootReducer(state, setAuthBusy(true));
    expect(state.auth).toEqual({ status: "signedIn", user: USER, expiresAt, busy: true });
    state = rootReducer(state, setAuthBusy(false));
    expect(state.auth.busy).toBe(false);
    expect(state.auth.user).toEqual(USER);
  });

  it("coerces truthy/falsy values to a real boolean", () => {
    expect(rootReducer(undefined, setAuthBusy("yes")).auth.busy).toBe(true);
    expect(rootReducer(undefined, setAuthBusy(undefined)).auth.busy).toBe(false);
  });
});

describe("auth is kept separate from userProfile", () => {
  // userProfile.name is written by the device-keyed cloud restore. If the two
  // were merged, a stale snapshot could overwrite the signed-in user's real
  // name — so signing in must not touch userProfile at all.
  it("signing in does not write to userProfile", () => {
    const before = initial().userProfile;
    const state = rootReducer(undefined, setAuthSession({ user: USER, expiresAt: Date.now() }));
    expect(state.userProfile).toEqual(before);
  });

  it("a userProfile update does not touch the auth session", () => {
    const signedIn = rootReducer(undefined, setAuthSession({ user: USER, expiresAt: Date.now() }));
    const state = rootReducer(signedIn, setUserProfile({ name: "From Cloud Restore" }));
    expect(state.auth.user).toEqual(USER);
    expect(state.userProfile.name).toBe("From Cloud Restore");
  });
});
