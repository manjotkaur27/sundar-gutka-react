/* eslint-env jest */
import { act, renderHook } from "@testing-library/react-native";
import usePothiSync, { FEATURE } from "./usePothiSync";

const mockDispatch = jest.fn();
const mockFetchFolders = jest.fn();
const mockPutFolders = jest.fn();
const mockDeleteFolder = jest.fn();
const mockRegister = jest.fn(() => () => {});

let mockState = {};

jest.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (fn) => fn(mockState),
  useStore: () => ({ getState: () => mockState, dispatch: mockDispatch }),
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
jest.mock("@service/khalisRequest", () => ({
  isTransientStatus: (status) => status === 0 || status === 429 || status >= 500,
}));
jest.mock("@service/sync/syncRegistry", () => ({
  OUTCOME_DONE: "done",
  OUTCOME_RETRY: "retry",
  OUTCOME_CONFLICT: "conflict",
  OUTCOME_FATAL: "fatal",
  registerSyncFeature: (...args) => mockRegister(...args),
}));

jest.mock("@common", () => ({
  actions: {
    mergeRemotePothis: (folders, deletedFolderIds) => ({
      type: "MERGE_REMOTE_POTHIS",
      folders,
      deletedFolderIds,
    }),
    setPothiSyncWatermark: (at) => ({ type: "SET_POTHI_SYNC_WATERMARK", at }),
    seedDefaultPothis: (folders) => ({ type: "SEED_DEFAULT_POTHIS", folders }),
    setPothisSyncedAt: (at) => ({ type: "SET_POTHIS_SYNCED_AT", at }),
    enqueueSyncOp: (op) => ({ type: "ENQUEUE_SYNC_OP", op }),
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

const signedInWith = (folders, extra = {}) => {
  mockState = {
    auth: { status: "signedIn", user: { email: "a@x" } },
    baniList: [],
    pothis: {
      folders,
      seededDefaults: true,
      lastSyncedAt: null,
      deletedIds: [],
      syncWatermark: 0,
      ...extra,
    },
  };
};

const signedOutWith = ({ folders = [], seededDefaults = false } = {}) => {
  mockState = {
    auth: { status: "signedOut" },
    baniList: [{ id: 1 }],
    pothis: { folders, seededDefaults, lastSyncedAt: null, deletedIds: [] },
  };
};

const impl = () => mockRegister.mock.calls[mockRegister.mock.calls.length - 1][1];
const enqueued = () =>
  mockDispatch.mock.calls.map(([a]) => a).filter((a) => a.type === "ENQUEUE_SYNC_OP");
const flush = async (ms = 0) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};
const okRead = (folders = [], extra = {}) => ({
  ok: true,
  data: { folders, deletedFolderIds: [], syncedAt: 1000, rejectedFolderIds: [], ...extra },
});

describe("usePothiSync edits and the outbox", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockDispatch.mockClear();
    mockRegister.mockClear();
    mockFetchFolders.mockReset();
    mockPutFolders.mockReset().mockResolvedValue(okRead());
    mockDeleteFolder.mockReset();
  });
  afterEach(() => jest.useRealTimers());

  it("registers itself with the sync registry", () => {
    signedOutWith();
    renderHook(() => usePothiSync());
    expect(mockRegister).toHaveBeenCalledWith(
      FEATURE,
      expect.objectContaining({
        drain: expect.any(Function),
        reconcile: expect.any(Function),
      })
    );
  });

  // The cold-start resurrection: without a gate the persisted list uploads
  // ~2.5s in and beats a slow pull, re-creating every folder another device
  // deleted while the app was closed.
  it("queues nothing before the first pull of this sign-in has landed", async () => {
    let releasePull;
    mockFetchFolders.mockReturnValue(
      new Promise((resolve) => {
        releasePull = resolve;
      })
    );
    signedInWith([pothi("stale-a")]);
    renderHook(() => usePothiSync());
    let reconciled;
    await act(async () => {
      reconciled = impl().reconcile();
    });
    await flush(10000);
    expect(enqueued()).toEqual([]);
    await act(async () => {
      releasePull(okRead([]));
      await reconciled;
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "MERGE_REMOTE_POTHIS",
      folders: [],
      deletedFolderIds: [],
    });
  });

  it("reconcile pulls with the watermark, pushes what it holds, takes the answer", async () => {
    mockFetchFolders.mockResolvedValue(okRead([], { deletedFolderIds: ["gone"], syncedAt: 777 }));
    signedInWith([pothi("mine")], { syncWatermark: 500 });
    renderHook(() => usePothiSync());
    await act(async () => {
      await impl().reconcile();
    });
    expect(mockFetchFolders).toHaveBeenCalledWith(500);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "MERGE_REMOTE_POTHIS",
      folders: [],
      deletedFolderIds: ["gone"],
    });
    expect(mockDispatch).toHaveBeenCalledWith({ type: "SET_POTHI_SYNC_WATERMARK", at: 777 });
    expect(mockPutFolders).toHaveBeenCalledWith({
      source: "mypothi",
      folders: [expect.objectContaining({ id: "mine" })],
    });
  });

  it("a later edit is queued as one coalesced put, once it settles", async () => {
    mockFetchFolders.mockResolvedValue(okRead([]));
    signedInWith([pothi("mine")]);
    const { rerender } = renderHook(() => usePothiSync());
    await act(async () => {
      await impl().reconcile();
    });
    mockDispatch.mockClear();
    signedInWith([pothi("mine"), pothi("second")]);
    rerender();
    await flush(1000);
    expect(enqueued()).toEqual([]);
    await flush(2000);
    expect(enqueued()).toEqual([
      { type: "ENQUEUE_SYNC_OP", op: { feature: FEATURE, kind: "put", key: "mypothi" } },
    ]);
  });

  it("a deletion is queued at once, once per id", async () => {
    mockFetchFolders.mockResolvedValue(okRead([]));
    signedInWith([], { deletedIds: ["d1"] });
    const { rerender } = renderHook(() => usePothiSync());
    await flush(0);
    rerender();
    await flush(0);
    expect(enqueued().filter((a) => a.op.kind === "delete")).toEqual([
      { type: "ENQUEUE_SYNC_OP", op: { feature: FEATURE, kind: "delete", key: "d1" } },
    ]);
  });

  it("keeps everything queued when the pull fails", async () => {
    mockFetchFolders.mockResolvedValue({ ok: false, status: 500 });
    signedInWith([pothi("stale")]);
    renderHook(() => usePothiSync());
    await act(async () => {
      expect(await impl().reconcile()).toBe(false);
    });
    await flush(10000);
    expect(mockPutFolders).not.toHaveBeenCalled();
    expect(enqueued()).toEqual([]);
  });
});

describe("usePothiSync drain outcomes", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockDispatch.mockClear();
    mockRegister.mockClear();
    mockFetchFolders.mockReset().mockResolvedValue(okRead([]));
    mockPutFolders.mockReset().mockResolvedValue(okRead([]));
    mockDeleteFolder.mockReset();
    signedInWith([pothi("mine")]);
    renderHook(() => usePothiSync());
  });
  afterEach(() => jest.useRealTimers());

  it("a put sends the CURRENT state and adopts what the server returns", async () => {
    mockPutFolders.mockResolvedValue(
      okRead([pothi("mine"), pothi("theirs")], { rejectedFolderIds: ["mine"], syncedAt: 42 })
    );
    const outcome = await impl().drain({ kind: "put", key: "mypothi" });
    expect(outcome).toBe("done");
    expect(mockPutFolders).toHaveBeenCalledWith({
      source: "mypothi",
      folders: [expect.objectContaining({ id: "mine" })],
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "MERGE_REMOTE_POTHIS", folders: expect.any(Array) })
    );
    expect(mockDispatch).toHaveBeenCalledWith({ type: "SET_POTHI_SYNC_WATERMARK", at: 42 });
  });

  it("network and server errors are retried; a bad request is not", async () => {
    mockPutFolders.mockResolvedValueOnce({ ok: false, status: 0 });
    expect(await impl().drain({ kind: "put" })).toBe("retry");
    mockPutFolders.mockResolvedValueOnce({ ok: false, status: 503 });
    expect(await impl().drain({ kind: "put" })).toBe("retry");
    mockPutFolders.mockResolvedValueOnce({ ok: false, status: 413 });
    expect(await impl().drain({ kind: "put" })).toBe("fatal");
  });

  it("a delete is done on 204 and on an already-gone 404", async () => {
    mockDeleteFolder.mockResolvedValueOnce({ ok: true, status: 204 });
    expect(await impl().drain({ kind: "delete", key: "d1" })).toBe("done");
    mockDeleteFolder.mockResolvedValueOnce({ ok: false, status: 404 });
    expect(await impl().drain({ kind: "delete", key: "d1" })).toBe("done");
    expect(mockDeleteFolder).toHaveBeenCalledWith("d1");
  });
});

describe("usePothiSync default-pothi reseeding", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockDispatch.mockClear();
    buildDefaultPothis.mockReset().mockReturnValue([{ id: "default_morning_nitnem" }]);
    mockFetchFolders.mockReset().mockResolvedValue(okRead([]));
    mockPutFolders.mockReset().mockResolvedValue(okRead([]));
  });
  afterEach(() => jest.useRealTimers());

  // Sign out once, and the Folders tab was empty forever after — the seeding
  // effect's re-entrancy latch tripped on the FIRST seed of the hook's lifetime
  // and never released.
  it("reseeds after sign-out even though this hook instance already seeded once before", async () => {
    signedOutWith({ seededDefaults: false });
    const { rerender } = renderHook(() => usePothiSync());
    await flush(0);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "SEED_DEFAULT_POTHIS",
      folders: [{ id: "default_morning_nitnem" }],
    });
    mockDispatch.mockClear();

    signedInWith([{ id: "default_morning_nitnem" }]);
    rerender();
    signedOutWith({ seededDefaults: false });
    rerender();
    await flush(0);

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
