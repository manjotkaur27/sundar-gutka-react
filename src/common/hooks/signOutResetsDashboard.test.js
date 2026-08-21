/* eslint-env jest */
/**
 * Signing out has to reset BOTH halves of the dashboard, and they live in
 * different places.
 *
 * The reported bug: after signing out, the layout and reminders reset but the
 * streak and the completed-banis count stayed on screen. The cause was that
 * `signOut` reset only redux. The numbers do not come from redux — they come
 * from SQLite, and the app was still reading the signed-in account's own
 * database file because nothing had pointed it back at the signed-out store.
 *
 * The two calls are easy to separate again, and missing either one leaves half
 * a session on screen with no error anywhere, so this pins both.
 *
 * A source-level guard rather than a render test: what is being protected is
 * that two specific calls exist on one code path — a fact about the file, not
 * about any particular render.
 */
import fs from "fs";
import path from "path";

const read = (file) => fs.readFileSync(path.join(__dirname, file), "utf8");

describe("signing out resets the whole dashboard", () => {
  const source = () => read("useSsoActions.js").replace(/\r\n/g, "\n");

  /** The body of the sign-out confirmation handler. */
  const signOutBody = () => {
    const src = source();
    const start = src.indexOf("const signOut = useCallback(");
    expect(start).toBeGreaterThan(-1);
    return src.slice(start);
  };

  it("points SQLite back at the signed-out store", () => {
    // Without this the streak, the calendar and the completed count keep
    // reading the account's own database file after sign-out.
    expect(signOutBody()).toContain("switchAnalyticsAccount(null)");
  });

  it("resets the redux preferences", () => {
    // Layout, reminders, nitnem, bookmarks.
    expect(signOutBody()).toContain("purgeLocalUserData(dispatch)");
  });

  it("forgets which account the device belonged to", () => {
    expect(signOutBody()).toContain("writeLastAccount(null)");
  });

  it("switches the database BEFORE resetting preferences", () => {
    // Otherwise a frame can render signed-out preferences over the previous
    // account's numbers.
    const body = signOutBody();
    expect(body.indexOf("switchAnalyticsAccount(null)")).toBeLessThan(
      body.indexOf("purgeLocalUserData(dispatch)")
    );
  });

  it("does NOT delete the account's history on the way out", () => {
    // Sign-out detaches; it does not destroy. Deleting here is what let a
    // device holding a few minutes of reading push over a real account.
    expect(source()).not.toContain("clearAllAnalyticsData");
  });

  // Token EXPIRY is not a sign-out. Resetting there would cost a user their own
  // dashboard for not opening the app for a week.
  it("leaves expiry alone — only an explicit sign-out resets", () => {
    const session = read("useSsoSession.js").replace(/\r\n/g, "\n");
    const endSession = session.slice(
      session.indexOf("const endSession = useCallback("),
      session.indexOf("const beginSession = useCallback(")
    );
    expect(endSession).not.toContain("purgeLocalUserData");
    expect(endSession).not.toContain("switchAnalyticsAccount");
  });
});
