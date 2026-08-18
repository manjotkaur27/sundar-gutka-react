import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { deleteFolder, fetchFolders, putFolders } from "@service/pothiApi";
import { buildDefaultPothis } from "@common/pothi/defaults";
import { toUpsertBody } from "@common/pothi/model";
import createPothiSyncQueue from "@common/pothi/syncQueue";
import { actions, logMessage, STRINGS } from "@common";

// Keeps My Pothi in step with the account, and seeds the two default pothis.
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
// ── Local-first ONCE signed in ─────────────────────────────────────────────
// Every edit still lands in redux (and redux-persist) first and syncs
// afterwards, so an edit made offline is not lost — it queues and pushes once
// the connection returns. `mergeRemote` resolves per FOLDER by `updatedAt`, so
// two devices editing different pothis both keep their edit.
//
// ── Why a debounce ────────────────────────────────────────────────────────
// The API replaces a whole source per PUT — there is no per-folder write — so
// every keystroke-level change would otherwise re-upload every folder. Changes
// are coalesced and pushed once things settle.
const PUSH_DEBOUNCE_MS = 2500;

const usePothiSync = () => {
  const dispatch = useDispatch();
  const pothis = useSelector((state) => state.pothis);
  const isSignedIn = useSelector((state) => state.auth?.status === "signedIn");
  const baniList = useSelector((state) => state.baniList);

  const pulledFor = useRef(null);
  // Lets the delete handler re-pull without `pull` having to be a dependency
  // of the effect that queues deletes.
  const pullRef = useRef(null);
  // The `pothis` object already dispatched a seed for — not a boolean, so it
  // guards the gap between dispatching and the next render reflecting
  // `seededDefaults` WITHOUT permanently blocking a later, legitimate reseed.
  // A plain boolean latch trips on the hook instance's first seed and stays
  // true for the process lifetime, so any later reset of the slice could never
  // be reseeded and the Folders tab stayed empty until relaunch. Comparing by
  // reference means a genuinely NEW `pothis` object is never equal to what was
  // already seeded, so it reseeds correctly.
  const seededFor = useRef(null);
  const queue = useRef(createPothiSyncQueue()).current;
  const queuedDeletes = useRef(new Set());
  // The last body actually accepted by the server, so an unchanged state does
  // not re-upload on every render.
  const lastPushed = useRef(null);
  // Whether the first pull of this sign-in has landed.
  //
  // State, not a ref, because the push effect has to re-run the moment it flips
  // — a ref would leave a pending change unpushed until the next edit.
  const [pullDone, setPullDone] = useState(false);

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

  // ── Pull once per sign-in ───────────────────────────────────────────────
  // Queued alongside the pushes and deletes. Unqueued, a pull could resolve in
  // the middle of a push and merge a server list that predates it.
  const pull = useCallback(async () => {
    const result = await queue(() => fetchFolders());
    if (!result.ok) {
      // The API answers 404 — not an empty list — when a user has no folders
      // (folders.service `get` throws NotFoundException on zero rows). That is
      // an authoritative "nothing there", so it counts as a completed pull;
      // treating it as an error would block pushing forever once the user
      // deleted their last pothi.
      if (result.status === 404) {
        dispatch(actions.mergeRemotePothis([]));
        setPullDone(true);
        return;
      }
      logMessage(`usePothiSync: pull failed (${result.error ?? result.status})`);
      return;
    }
    // NOT setPothisSyncedAt here: that clears the tombstones, and a pull has
    // not yet told the server about them. Only a successful PUSH may do it.
    dispatch(actions.mergeRemotePothis(result.data?.folders ?? []));
    setPullDone(true);
  }, [dispatch, queue]);

  pullRef.current = pull;

  useEffect(() => {
    if (!isSignedIn) {
      // Signing out only forgets that we pulled — nothing is cleared and no
      // native or storage work is done here, so the sign-out path itself is
      // untouched by this feature. The pothis stay on the device exactly as
      // they were before signing in.
      pulledFor.current = null;
      setPullDone(false);
      // Belongs to the account that just left. Kept, the next account's first
      // identical body would be mistaken for already-uploaded and skipped.
      lastPushed.current = null;
      return;
    }
    if (pulledFor.current) return;
    pulledFor.current = true;
    pull();
  }, [isSignedIn, pull]);

  // ── Deletions go up immediately ─────────────────────────────────────────
  //
  // NOT left to the debounced whole-source PUT. That waits 2.5s and loses the
  // race against a pull, which is how a deleted pothi came back — and if the
  // app closed inside the window the server never heard about it at all.
  // DELETE /folders/:id is idempotent, so a repeat is harmless.
  const buried = pothis?.deletedIds;
  useEffect(() => {
    if (!isSignedIn || !buried?.length) return;
    buried.forEach((id) => {
      if (queuedDeletes.current.has(id)) return;
      queuedDeletes.current.add(id);
      queue(() => deleteFolder(id))
        .then((result) => {
          // The tombstone is NOT retired here. 204 only says the row is gone
          // right now; another client can PUT its stale list a moment later and
          // bring it back. `mergeRemote` retires it when a pull shows the
          // server genuinely no longer has the id.
          if (!result.ok && result.status !== 404) {
            logMessage(`usePothiSync: delete ${id} failed (${result.error ?? result.status})`);
            return;
          }
          // Confirm against the server rather than assume.
          pullRef.current?.();
        })
        .finally(() => queuedDeletes.current.delete(id));
    });
  }, [isSignedIn, buried, dispatch, queue]);

  // ── Push on change, debounced ───────────────────────────────────────────
  //
  // Nothing may be pushed before the first pull of this sign-in has landed.
  // `lastPushed` is empty on a cold start, so the persisted list was otherwise
  // uploaded ~2.5s after launch — beating the pull on any slow network and
  // re-creating every folder another client had deleted while the app was
  // closed. Since `PUT /folders` is a whole-source replace with no revision
  // check, that upload wins outright. This is the resurrection seen after a
  // force-stop, and it is the app's own half of the bug.
  useEffect(() => {
    if (!isSignedIn || !pothis || !pullDone) return undefined;
    const body = toUpsertBody(pothis);
    const serialised = JSON.stringify(body);
    if (serialised === lastPushed.current) return undefined;

    const timer = setTimeout(() => {
      queue(() => putFolders(body)).then((result) => {
        if (!result.ok) {
          // Left unrecorded on purpose: the next change retries, and a failed
          // upload must not be mistaken for a successful one.
          logMessage(`usePothiSync: push failed (${result.error ?? result.status})`);
          return;
        }
        lastPushed.current = serialised;
        dispatch(actions.setPothisSyncedAt(new Date().toISOString()));
      });
    }, PUSH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [isSignedIn, pothis, pullDone, dispatch, queue]);

  return { pull };
};

export default usePothiSync;
