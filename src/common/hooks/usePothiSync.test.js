/* eslint-env jest */
import { act, renderHook } from "@testing-library/react-native";
import usePothiSync from "./usePothiSync";

const mockDispatch = jest.fn();
const mockFetchFolders = jest.fn();
const mockPutFolders = jest.fn();
const mockDeleteFolder = jest.fn();

let mockState = {};

jest.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (fn) => fn(mockState),
}));

// Pulls in anvaad-js, which touches `self` and cannot load under jsdom-less
// jest. A jest.fn() so the seeding describe block below can give it a real
// return value; every other test leaves it at this empty default.
jest.mock("@common/pothi/defaults", () => ({ buildDefaultPothis: jest.fn(() => []) }));
const { buildDefaultPothis } = jest.requireMock("@common/pothi/defaults");

jest.mock("@service/pothiApi", () => ({
  fetchFolders: (...args) => mockFetchFolders(...args),
  putFolders: (...args) => mockPutFolders(...args),
  deleteFolder: (...args) => mockDeleteFolder(...args),
}));

jest.mock("@common", () => ({
  actions: {
    mergeRemotePothis: (folders) => ({ type: "MERGE_REMOTE_POTHIS", folders }),
    seedDefaultPothis: (folders) => ({ type: "SEED_DEFAULT_POTHIS", folders }),
    setPothisSyncedAt: (at) => ({ type: "SET_POTHIS_SYNCED_AT", at }),
  },
  logMessage: jest.fn(),
  STRINGS: { POTHI_DEFAULT_MORNING: "Morning", POTHI_DEFAULT_EVENING: "Evening" },
}));

const pothi = (id) => ({
  id,
  name: id,
  source: "mypothi",
  items: [],
  createdAt: 1,
  updatedAt: 1,
  isPublic: false,
  pinned: false,
});

const signedInWith = (folders) => {
  mockState = {
    auth: { status: "signedIn" },
    baniList: [],
    pothis: { folders, seededDefaults: true, lastSyncedAt: null, deletedIds: [] },
  };
};

// A fresh object each call — mirrors `emptyPothis()`, which CLEAR_AUTH_SESSION
// dispatches on sign-out. The seeding-latch tests below depend on this NOT
// being the same reference twice.
const signedOutWith = ({ folders = [], seededDefaults = false } = {}) => {
  mockState = {
    auth: { status: "signedOut" },
    baniList: [{ id: 1 }],
    pothis: { folders, seededDefaults, lastSyncedAt: null, deletedIds: [] },
  };
};

describe("usePothiSync push gating", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockDispatch.mockClear();
    mockFetchFolders.mockReset();
    mockPutFolders.mockReset().mockResolvedValue({ ok: true });
    mockDeleteFolder.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // The cold-start resurrection: on launch `lastPushed` is empty, so without a
  // gate the persisted list uploads ~2.5s in and beats a slow pull. Because the
  // API's PUT is a whole-source replace with no revision check, that upload
  // re-creates every folder another client deleted while the app was closed.
  it("does not push the persisted list before the first pull has landed", async () => {
    let releasePull;
    mockFetchFolders.mockReturnValue(
      new Promise((resolve) => {
        releasePull = resolve;
      })
    );
    signedInWith([pothi("stale-a"), pothi("stale-b")]);

    renderHook(() => usePothiSync());

    // Well past the debounce, with the pull still in flight.
    await act(async () => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockPutFolders).not.toHaveBeenCalled();

    await act(async () => {
      releasePull({ ok: true, data: { folders: [] } });
    });
    expect(mockDispatch).toHaveBeenCalledWith({ type: "MERGE_REMOTE_POTHIS", folders: [] });
  });

  it("pushes once the pull has resolved", async () => {
    mockFetchFolders.mockResolvedValue({ ok: true, data: { folders: [] } });
    signedInWith([pothi("mine")]);

    renderHook(() => usePothiSync());

    // First pass lets the pull resolve and flip the gate; the debounce is only
    // scheduled after that, so it takes a second pass to fire.
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(mockPutFolders).toHaveBeenCalledTimes(1);
    expect(mockPutFolders).toHaveBeenCalledWith({
      source: "mypothi",
      folders: [expect.objectContaining({ id: "mine" })],
    });
  });

  // The API throws NotFoundException rather than returning [] for a user with
  // no folders, so 404 has to count as a completed pull — otherwise deleting
  // the last pothi would block every future push.
  it("treats a 404 pull as an authoritative empty and still pushes", async () => {
    mockFetchFolders.mockResolvedValue({ ok: false, status: 404 });
    signedInWith([pothi("local-only")]);

    renderHook(() => usePothiSync());

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(mockPutFolders).toHaveBeenCalledTimes(1);
  });

  it("keeps the push blocked when the pull fails for any other reason", async () => {
    mockFetchFolders.mockResolvedValue({ ok: false, status: 500 });
    signedInWith([pothi("stale")]);

    renderHook(() => usePothiSync());

    await act(async () => {
      jest.advanceTimersByTime(10000);
    });
    expect(mockPutFolders).not.toHaveBeenCalled();
  });
});

describe("usePothiSync default-pothi reseeding", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockDispatch.mockClear();
    buildDefaultPothis.mockReset().mockReturnValue([{ id: "default_morning_nitnem" }]);
    mockFetchFolders.mockReset().mockResolvedValue({ ok: true, data: { folders: [] } });
    mockPutFolders.mockReset().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // The bug as reported: sign out once, and the Folders tab is empty forever
  // after — not even the two defaults — because the seeding effect's
  // re-entrancy latch tripped on the FIRST seed of the hook's lifetime (which
  // can happen before the user ever signs in) and then never released.
  it("reseeds after sign-out even though this hook instance already seeded once before", async () => {
    // Fresh install: signed out, nothing seeded yet — seeds immediately.
    signedOutWith({ seededDefaults: false });
    const { rerender } = renderHook(() => usePothiSync());
    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "SEED_DEFAULT_POTHIS",
      folders: [{ id: "default_morning_nitnem" }],
    });
    mockDispatch.mockClear();

    // Signs in — reducer.js would mark seededDefaults true once synced.
    signedInWith([{ id: "default_morning_nitnem" }]);
    rerender();

    // Signs out — reducer.js's CLEAR_AUTH_SESSION resets `pothis` to a FRESH
    // emptyPothis() object: seededDefaults false again, on a new reference.
    signedOutWith({ seededDefaults: false });
    rerender();
    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "SEED_DEFAULT_POTHIS",
      folders: [{ id: "default_morning_nitnem" }],
    });
  });

  it("does not reseed while already seeded", () => {
    signedOutWith({ folders: [{ id: "default_morning_nitnem" }], seededDefaults: true });
    renderHook(() => usePothiSync());
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "SEED_DEFAULT_POTHIS" })
    );
  });
});
