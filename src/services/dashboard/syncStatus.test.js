/* eslint-env jest */
/**
 * The header showed "last synced: never" for accounts that plainly had local
 * data, and there was no way to tell which of two opposite situations it meant:
 *
 *   - the push never ran (not signed in, restore gate shut, inside the cooldown)
 *   - the push ran and the server refused it
 *
 * The first is a client bug, the second is a contract or account problem, and
 * "never" alone cannot tell them apart. These tests pin that the reason
 * survives all the way to the label.
 */

let mockDiagnostics = false;
jest.mock("@common", () => ({
  constant: {
    get SYNC_DIAGNOSTICS() {
      return mockDiagnostics;
    },
  },
}));

// eslint-disable-next-line import/first
import { formatSyncStatus, SKIP_NOT_RESTORED, SKIP_COOLDOWN } from "./syncStatus";

const fmt = () => "18 Aug, 11:21";
const NEVER = "never";

// ── Release behaviour: a plain timestamp, never developer text ─────────────
// "never (HTTP 500)" is the right thing to show a developer and the wrong thing
// to show someone reading their nitnem — it reads as the app being broken even
// when the cause is server-side and already fixed.
describe("formatSyncStatus in a release build", () => {
  beforeEach(() => {
    mockDiagnostics = false;
  });

  it("shows a plain timestamp once a push has succeeded", () => {
    expect(formatSyncStatus({ push: { at: 1, ok: true } }, fmt, NEVER)).toBe("18 Aug, 11:21");
  });

  it("shows 'never' and nothing else before the first successful push", () => {
    expect(formatSyncStatus({ attempt: { at: 1, ok: false, status: 500 } }, fmt, NEVER)).toBe(
      "never"
    );
  });

  it("never leaks an HTTP status to the reader", () => {
    const out = formatSyncStatus(
      { push: { at: 1, ok: true }, attempt: { at: 2, ok: false, status: 500 } },
      fmt,
      NEVER
    );
    expect(out).toBe("18 Aug, 11:21");
    expect(out).not.toMatch(/HTTP|500/);
  });

  it("never leaks an internal gate name", () => {
    const out = formatSyncStatus({ attempt: { at: 1, skipped: SKIP_NOT_RESTORED } }, fmt, NEVER);
    expect(out).toBe("never");
    expect(out).not.toMatch(/restore-pending/);
  });

  it("never leaks a pull status", () => {
    expect(
      formatSyncStatus({ push: { at: 1, ok: true }, pull: { status: "failed" } }, fmt, NEVER)
    ).toBe("18 Aug, 11:21");
  });
});

describe("formatSyncStatus", () => {
  // The diagnostic machinery is kept, not deleted — this readout is how the
  // stale device-scoped unique index was finally identified.
  beforeEach(() => {
    mockDiagnostics = true;
  });

  it("reads 'never' when nothing has been attempted at all", () => {
    expect(formatSyncStatus({}, fmt, NEVER)).toBe(NEVER);
    expect(formatSyncStatus(undefined, fmt, NEVER)).toBe(NEVER);
  });

  it("shows a plain timestamp once a push has succeeded", () => {
    expect(formatSyncStatus({ push: { at: 1, ok: true } }, fmt, NEVER)).toBe("18 Aug, 11:21");
  });

  it("REGRESSION: a later cooldown skip does not erase a real success", () => {
    // Observed on device: synced at 10:42, then every backgrounding re-attempted
    // and was skipped by the cooldown. The header read "never (cooldown)" on a
    // device that had plainly synced — a failure reported where none happened.
    const afterCooldown = {
      push: { at: 1, ok: true },
      attempt: { at: 2, skipped: SKIP_COOLDOWN },
    };
    expect(formatSyncStatus(afterCooldown, fmt, NEVER)).toBe("18 Aug, 11:21");
  });

  it("keeps the last success visible even when a LATER attempt genuinely failed", () => {
    const brokeAfterworking = {
      push: { at: 1, ok: true },
      attempt: { at: 2, ok: false, status: 500 },
    };
    expect(formatSyncStatus(brokeAfterworking, fmt, NEVER)).toBe("18 Aug, 11:21 (HTTP 500)");
  });

  it("names the gate when the push never left the device", () => {
    expect(formatSyncStatus({ attempt: { at: 1, skipped: SKIP_NOT_RESTORED } }, fmt, NEVER)).toBe(
      "never (restore-pending)"
    );
  });

  it("stays silent about a cooldown on a device that has never synced", () => {
    // A cooldown means "we synced recently enough", so it is never the reason
    // something is wrong — reporting it only buries the real state.
    expect(formatSyncStatus({ attempt: { at: 1, skipped: SKIP_COOLDOWN } }, fmt, NEVER)).toBe(
      "never"
    );
  });

  it("shows the HTTP status when the server refused it — the case we could not see before", () => {
    expect(formatSyncStatus({ attempt: { at: 1, ok: false, status: 400 } }, fmt, NEVER)).toBe(
      "never (HTTP 400)"
    );
    expect(formatSyncStatus({ attempt: { at: 1, ok: false, status: 500 } }, fmt, NEVER)).toBe(
      "never (HTTP 500)"
    );
  });

  it("shows a transport failure, which has no status at all", () => {
    expect(
      formatSyncStatus(
        { attempt: { at: 1, ok: false, error: "Network request failed" } },
        fmt,
        NEVER
      )
    ).toBe("never (Network request failed)");
  });

  it("appends a failing pull, so a one-way failure is still visible", () => {
    expect(
      formatSyncStatus({ push: { at: 1, ok: true }, pull: { status: "failed" } }, fmt, NEVER)
    ).toBe("18 Aug, 11:21 · pull failed");
    expect(
      formatSyncStatus({ push: { at: 1, ok: true }, pull: { status: "unauthorized" } }, fmt, NEVER)
    ).toBe("18 Aug, 11:21 · pull unauthorized");
  });

  it("stays quiet about a healthy pull", () => {
    expect(
      formatSyncStatus({ push: { at: 1, ok: true }, pull: { status: "ok" } }, fmt, NEVER)
    ).toBe("18 Aug, 11:21");
  });

  it("distinguishes an account with no cloud data from one that failed to reach it", () => {
    // `empty` is a 404 — authoritative, and NOT an error. It should not be
    // dressed up as one, or a genuinely new account looks broken.
    const emptyPull = { push: { at: 1, ok: true }, pull: { status: "empty" } };
    expect(formatSyncStatus(emptyPull, fmt, NEVER)).toBe("18 Aug, 11:21 · pull empty");
  });
});
