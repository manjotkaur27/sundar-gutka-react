import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import { isTransientStatus } from "@service/khalisRequest";
import { deleteFolder, fetchFolders, putFolders } from "@service/pothiApi";
import {
  OUTCOME_DONE,
  OUTCOME_FATAL,
  OUTCOME_RETRY,
  registerSyncFeature,
} from "@service/sync/syncRegistry";
import { buildDefaultPothis } from "@common/pothi/defaults";
import { toUpsertBody } from "@common/pothi/model";
import { actions, logMessage, STRINGS } from "@common";

// Keeps My Pothi in step with the account — and with every other device
// signed into it — and seeds the two default pothis.
//
// ── Signed out is read-only ────────────────────────────────────────────────
// Signed-out browsing shows exactly Morning and Evening Nitnem — see the
// seeding effect below — and every mutation (create, rename, delete, add/
// remove a bani) is refused by `useRequireOnline`, which gates on sign-in as
// well as connectivity. There is nowhere for a signed-out edit to go: it
// cannot reach the account it isn't attached to, and letting it sit local-only
// is how the app ended up with pothis that outlived the session that made
// them. The slice is person-owned data, so it is listed in `reducer.js`'s
// USER_DATA_SLICES and wiped when a DIFFERENT account signs in — see
// sso/accountScope. NOT on sign-out: the same account coming back, offline,
// keeps the pothis it already had.
//
// ── Local-first, through the outbox ────────────────────────────────────────
// Every edit lands in redux (and redux-persist) first. The change is then
// queued in the persisted outbox (see common/sync/outboxModel) as one
// `put` of the whole source — coalesced, so a burst of edits is one upload —
// and one `delete` per removed pothi. The outbox drains them in order,
// retries them with backoff when the network is away, and survives the app
// being killed, which the old in-memory queue did not.
//
// ── Two devices ────────────────────────────────────────────────────────────
// The server merges per FOLDER, newest wins, and tells this device two
// things it could not know before: `deletedFolderIds` — pothis another device
// deleted since this one last read (so a deletion finally propagates) — and
// `rejectedFolderIds` — pothis whose upload lost to a newer copy from another
// device (so this device adopts that copy instead of believing its own).
export const FEATURE = "pothis";
const PUT_KEY = "mypothi";

// The API replaces a whole source per PUT, so a rename typed one letter at a
// time would otherwise re-upload every folder per keystroke. The outbox
// coalesces, but the drain runs at once; this holds the enqueue until the
// edit settles.
const PUSH_DEBOUNCE_MS = 2500;

const usePothiSync = () => {
  const store = useStore();
  const dispatch = useDispatch();
  const pothis = useSelector((state) => state.pothis);
  const isSignedIn = useSelector((state) => state.auth?.status === "signedIn");
  const baniList = useSelector((state) => state.baniList);

  // The `pothis` object already dispatched a seed for — not a boolean, so it
  // guards the gap between dispatching and the next render reflecting
  // `seededDefaults` WITHOUT permanently blocking a later, legitimate reseed.
  const seededFor = useRef(null);
  // What was last handed to the outbox, so an unchanged state is not queued
  // again on every render.
  const lastEnqueued = useRef(null);
  const queuedDeletes = useRef(new Set());
  // Whether the first pull of this sign-in has landed. State, not a ref: the
  // enqueue effect must re-run the moment it flips.
  const [pullDone, setPullDone] = useState(false);
  const signedInRef = useRef(isSignedIn);
  signedInRef.current = isSignedIn;

  // ── Seed the two default pothis, once per signed-out period ─────────────
  //
  // The API seeds Morning and Evening Nitnem itself on a user's first
  // GET /folders — same bani ids, gated by `defaultFoldersSeeded` so deleting
  // one does not bring it back. Seeding locally as well produced a second pair
  // with different ids (and different names under a non-English locale), which
  // is the duplicate Morning/Evening people saw.
  //
  // Signed out there is no server to provide them, so the local pair is what a
  // signed-out user browses; `mergeRemote` retires it on the first pull after
  // sign-in, in favour of the server's own.
  useEffect(() => {
    if (isSignedIn) return;
    if (!pothis || pothis.seededDefaults || seededFor.current === pothis) return;
    if (pothis.folders?.length) return;
    const defaults = buildDefaultPothis(baniList, {
      morning: STRINGS.POTHI_DEFAULT_MORNING,
      evening: STRINGS.POTHI_DEFAULT_EVENING,
    });
    // An empty result means the bani database has not loaded yet. Not latching
    // here is deliberate: latching would leave the user permanently without the
    // defaults because of a cold-start race.
    if (defaults.length === 0) return;
    seededFor.current = pothis;
    dispatch(actions.seedDefaultPothis(defaults));
  }, [isSignedIn, pothis, baniList, dispatch]);

  // ── Pull: the account's folders, and what it deleted since we last looked ─
  const applyRead = useCallback(
    (data) => {
      dispatch(actions.mergeRemotePothis(data?.folders ?? [], data?.deletedFolderIds ?? []));
      if (data?.syncedAt) dispatch(actions.setPothiSyncWatermark(data.syncedAt));
    },
    [dispatch]
  );

  const pull = useCallback(async () => {
    if (!signedInRef.current) return false;
    const since = store.getState().pothis?.syncWatermark ?? 0;
    const result = await fetchFolders(since);
    if (!result.ok) {
      logMessage(`usePothiSync: pull failed (${result.error ?? result.status})`);
      return false;
    }
    applyRead(result.data);
    setPullDone(true);
    return true;
  }, [store, applyRead]);

  // ── Bulk reconcile: pull, then push what we hold, then take the answer ────
  const reconcile = useCallback(async () => {
    if (!(await pull())) return false;
    const body = toUpsertBody(store.getState().pothis);
    if (body.folders.length === 0) return true;
    const result = await putFolders(body);
    if (!result.ok) {
      logMessage(`usePothiSync: reconcile push failed (${result.error ?? result.status})`);
      return false;
    }
    lastEnqueued.current = JSON.stringify(body);
    applyRead(result.data);
    dispatch(actions.setPothisSyncedAt(new Date().toISOString()));
    return true;
  }, [pull, store, dispatch, applyRead]);

  // ── One outbox op ─────────────────────────────────────────────────────────
  const drain = useCallback(
    async (op) => {
      const outcomeFor = (res) => {
        if (res.ok) return OUTCOME_DONE;
        if (res.status === 401 || isTransientStatus(res.status)) return OUTCOME_RETRY;
        return OUTCOME_FATAL;
      };
      if (op.kind === "put") {
        // Built at send time, not enqueue time: the freshest state is what
        // should go up, and a stale payload would only lose to itself.
        const body = toUpsertBody(store.getState().pothis);
        const result = await putFolders(body);
        if (!result.ok) return outcomeFor(result);
        lastEnqueued.current = JSON.stringify(body);
        dispatch(actions.setPothisSyncedAt(new Date().toISOString()));
        const rejected = result.data?.rejectedFolderIds ?? [];
        if (rejected.length) {
          // Another device wrote those pothis more recently. The response
          // already carries the winning copies; adopting them here is the
          // reconcile, so no separate round trip is needed.
          logMessage(`usePothiSync: ${rejected.length} pothi(s) superseded by another device`);
        }
        applyRead(result.data);
        return OUTCOME_DONE;
      }
      if (op.kind === "delete") {
        const result = await deleteFolder(op.key);
        // 204 says the row is gone right now; the tombstone is retired only
        // when a later read confirms it (see mergeRemote), so a stale upload
        // from elsewhere cannot bring the pothi back unnoticed.
        if (result.ok || result.status === 404) return OUTCOME_DONE;
        return outcomeFor(result);
      }
      return OUTCOME_FATAL;
    },
    [store, dispatch, applyRead]
  );

  useEffect(() => registerSyncFeature(FEATURE, { drain, reconcile }), [drain, reconcile]);

  // ── Sign-out forgets the pull; the next reconcile (dashboard sync) redoes it ─
  useEffect(() => {
    if (!isSignedIn) {
      // Signing out only forgets that we pulled — nothing is cleared. The
      // pothis stay on the device exactly as they were before signing in.
      setPullDone(false);
      lastEnqueued.current = null;
      queuedDeletes.current.clear();
    }
  }, [isSignedIn]);

  // ── Deletions go to the outbox at once ────────────────────────────────────
  const buried = pothis?.deletedIds;
  useEffect(() => {
    if (!isSignedIn || !buried?.length) return;
    buried.forEach((id) => {
      if (queuedDeletes.current.has(id)) return;
      queuedDeletes.current.add(id);
      dispatch(actions.enqueueSyncOp({ feature: FEATURE, kind: "delete", key: id }));
    });
  }, [isSignedIn, buried, dispatch]);

  // ── Edits go to the outbox once they settle ───────────────────────────────
  //
  // Nothing is queued before the first pull of this sign-in has landed: the
  // persisted list would otherwise go up ~2.5s after launch, ahead of the
  // pull on any slow network, and re-create every folder another device had
  // deleted while the app was closed.
  useEffect(() => {
    if (!isSignedIn || !pothis || !pullDone) return undefined;
    const serialised = JSON.stringify(toUpsertBody(pothis));
    if (serialised === lastEnqueued.current) return undefined;
    const timer = setTimeout(() => {
      lastEnqueued.current = serialised;
      dispatch(actions.enqueueSyncOp({ feature: FEATURE, kind: "put", key: PUT_KEY }));
    }, PUSH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [isSignedIn, pothis, pullDone, dispatch]);

  return { pull };
};

export default usePothiSync;
