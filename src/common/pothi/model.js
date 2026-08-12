// The My Pothi data model, as pure functions.
//
// A pothi is a user-made folder of banis. The reducer delegates every
// transition here so the rules — the pin ceiling, de-duplication, the server's
// limits — can be tested without a store, and so no component knows them.
//
// ── Shape ─────────────────────────────────────────────────────────────────
// State is the WIRE shape, deliberately:
//
//   { folders: FolderDto[], seededDefaults: boolean, lastSyncedAt: string|null }
//
// `folders` is exactly what `PUT /folders` accepts and `GET /folders` returns,
// so syncing is a straight serialise with no translation layer to drift. The
// two siblings are local-only and never sent.
//
// A FolderDto (khalis-users-api, src/folders/dto/folder.dto.ts):
//   { id, name, source, items[], createdAt, updatedAt, isPublic?, pinned? }
//
// Order is the ARRAY order — the server preserves it — so there is no separate
// order list that could disagree with the folders it indexes. Pinning is a
// per-folder boolean for the same reason: it is the server's field, and a
// parallel array of pinned ids would be a second source of truth.

/** Limits mirrored from the API's DTOs. Exceeding any of them is a 400. */
export const MAX_NAME_LENGTH = 50;
export const MAX_ITEM_TITLE_LENGTH = 200;
export const MAX_ITEMS_PER_FOLDER = 500;
export const MAX_FOLDERS = 50;
export const MAX_ID_LENGTH = 64;

// ── The two default pothis ────────────────────────────────────────────────
//
// Bani ids are taken from the bundled database's `Banis` table and match what
// khalis-users-api seeds in `DEFAULT_MYPOTHI_FOLDERS`, so a locally seeded pair
// and the server's own pair hold the same banis in the same order — which is
// what lets one stand down for the other in `mergeRemote`.
//
//    2  jpujI swihb            Japji Sahib
//    4  jwpu swihb             Jaap Sahib
//    6  qÍ pRswid sv`Xy        Tav Prasad Savaiye (Sraavag Sudh)
//    9  bynqI cOpeI swihb      Benati Chaupai Sahib
//   10  Anµdu swihb            Anand Sahib
//   21  rhrwis swihb           Rehras Sahib
//   23  soihlw swihb           Sohila Sahib (Kirtan Sohila — one bani, two names)
//
// Savaiye is 6, not 3 or 5 — Shabad Hazare (3) and Shabad Hazare Patishahi 10
// (5) are two other banis whose similar names make the wrong one easy to grab.
export const MORNING_ID = "default_morning_nitnem";
export const EVENING_ID = "default_evening_nitnem";

export const MORNING_NITNEM_IDS = [2, 4, 6, 9, 10];
export const EVENING_NITNEM_IDS = [21, 23];

/**
 * Ids of the pothis this app seeds while signed out. The API seeds its own
 * equivalents with random uuids, so these are the ones that stand down when the
 * two meet — see `mergeRemote`.
 */
export const LOCAL_DEFAULT_IDS = new Set([MORNING_ID, EVENING_ID]);

/** The two default pothis, by the role each plays. */
export const DEFAULT_KINDS = ["morning", "evening"];

/**
 * The names khalis-users-api gives the pair it seeds. Always English: the
 * server does not know the user's locale. Used only to recover the pointer
 * below when nothing better identifies them.
 */
const SERVER_DEFAULT_NAMES = { morning: "Morning Nitnem", evening: "Evening Nitnem" };

/** A folder's banis as one comparable string. */
const baniSignature = (folder) => (folder?.items ?? []).map((item) => item.baaniId).join(",");

const DEFAULT_SIGNATURES = {
  morning: MORNING_NITNEM_IDS.join(","),
  evening: EVENING_NITNEM_IDS.join(","),
};

/**
 * Which folder is the Morning (or Evening) Nitnem pothi.
 *
 * A pointer rather than a name check, because the name is not stable: the local
 * seed uses the user's language, the server's is always English, and either can
 * be renamed. Nor is the id stable — the API mints its own uuids — so the
 * pointer is re-resolved rather than assumed:
 *
 *   1. The recorded id, if that folder is still there. Survives rename and
 *      any edit to the contents, which is the whole point.
 *   2. The folder holding exactly the default banis in the default order. This
 *      is what re-points a device at the server's copy after `mergeRemote`
 *      retires its local one, and what recovers the pair for a user who signed
 *      in before this pointer existed.
 *   3. The server's own English name, for a pair whose contents were edited
 *      before this build could record them.
 *
 * Null when the pothi genuinely is not there — deleted from another client.
 */
const resolveDefaultId = (kind, folders, recorded) => {
  if (recorded && folders.some((folder) => folder.id === recorded)) return recorded;
  const bySignature = folders.find((folder) => baniSignature(folder) === DEFAULT_SIGNATURES[kind]);
  if (bySignature) return bySignature.id;
  const byName = folders.find((folder) => folder.name === SERVER_DEFAULT_NAMES[kind]);
  return byName ? byName.id : null;
};

/** The id of a default pothi, or null. `kind` is "morning" or "evening". */
export const defaultPothiId = (state, kind) => state?.defaultIds?.[kind] ?? null;

/** The default pothi itself, or null. */
export const defaultPothi = (state, kind) => {
  const id = defaultPothiId(state, kind);
  return id ? (state?.folders ?? []).find((folder) => folder.id === id) ?? null : null;
};

/** Whether a pothi is one of the two defaults, which cannot be deleted. */
export const isDefaultPothi = (state, id) =>
  Boolean(id) && DEFAULT_KINDS.some((kind) => defaultPothiId(state, kind) === id);

/** Client-side only: the product cap on pinned pothis. The API does not police it. */
export const MAX_PINNED = 3;

/** The only source this app writes. `sundar-gutka` is the bundled-folder namespace. */
export const SOURCE = "mypothi";

export const emptyPothis = () => ({
  folders: [],
  seededDefaults: false,
  lastSyncedAt: null,
  // Ids deleted on THIS device that the server may not know about yet.
  //
  // Without them a delete could not stick: the folder went from local state,
  // the next pull found it still on the server, `mergeRemote` saw an id local
  // did not have and adopted it as new — so every deleted pothi came back on
  // the next launch. A tombstone says "this absence is deliberate".
  deletedIds: [],
  // Which folder is Morning Nitnem and which is Evening — see resolveDefaultId.
  // Local only: the API has no such field, and `toUpsertBody` never sends it.
  defaultIds: { morning: null, evening: null },
});

// Short, unique per device, and well inside the API's 64-char ceiling. Ids are
// client-generated by contract, so a UUID's collision guarantees would be
// overkill and would cost a dependency the app does not otherwise need.
const rand = () => Math.random().toString(36).slice(2, 8);
export const makeId = () => `p_${Date.now().toString(36)}_${rand()}`;
export const makeItemId = () => `i_${Date.now().toString(36)}_${rand()}`;

const clamp = (value, max) =>
  String(value ?? "")
    .trim()
    .slice(0, max);

/** A name with surrounding whitespace gone, capped at the server's limit. */
export const normaliseName = (name) => clamp(name, MAX_NAME_LENGTH);

/** Whether a name can be saved. Gurmukhi, Latin and digits are all fine; empty is not. */
export const isValidName = (name) => normaliseName(name).length > 0;

/**
 * A bani item in the wire shape.
 *
 * `title` is required by the API and rendered verbatim, so it is stored at add
 * time rather than resolved later — a pothi must still list its contents when
 * the bani database is mid-update or the row has gone.
 */
export const makeBaniItem = ({ baaniId, title, preview }) => ({
  id: makeItemId(),
  type: "bani",
  baaniId,
  title: clamp(title || String(baaniId), MAX_ITEM_TITLE_LENGTH),
  ...(preview ? { preview: clamp(preview, MAX_ITEM_TITLE_LENGTH) } : {}),
});

export const createPothi = ({ id = makeId(), name, items = [], now = Date.now() } = {}) => ({
  id: clamp(id, MAX_ID_LENGTH),
  name: normaliseName(name),
  source: SOURCE,
  items: items.slice(0, MAX_ITEMS_PER_FOLDER),
  createdAt: now,
  updatedAt: now,
  // Part of the DTO and always false from this app — nothing here shares a
  // pothi yet. It is still round-tripped (see reconcile) so a pothi shared from
  // another Khalis client is not silently un-shared by this one syncing.
  isPublic: false,
  pinned: false,
});

const indexOf = (state, id) => state.folders.findIndex((folder) => folder.id === id);

/** Replaces one folder, stamping updatedAt. Returns the SAME state if it is absent. */
const patch = (state, id, change, now = Date.now()) => {
  const at = indexOf(state, id);
  if (at < 0) return state;
  const folders = [...state.folders];
  folders[at] = { ...folders[at], ...change, updatedAt: now };
  return { ...state, folders };
};

export const addPothi = (state, pothi) => {
  // The server rejects the whole PUT past 50, so the cap is enforced before the
  // pothi is ever created rather than surfacing as a failed sync later.
  if (state.folders.length >= MAX_FOLDERS) return state;
  // Newest first: a pothi just made is the one about to be used.
  return { ...state, folders: [pothi, ...state.folders.filter((f) => f.id !== pothi.id)] };
};

export const renamePothi = (state, id, name, now = Date.now()) =>
  isValidName(name) ? patch(state, id, { name: normaliseName(name) }, now) : state;

export const deletePothi = (state, id) => {
  if (indexOf(state, id) < 0) return state;
  const defaultIds = { ...state.defaultIds };
  // A dangling pointer would be re-resolved by signature on the next
  // reconcile, which could adopt an unrelated folder. Clear it here instead.
  // The UI refuses to delete a default (see isDefaultPothi); this covers a
  // deletion that arrived from another client.
  DEFAULT_KINDS.forEach((kind) => {
    if (defaultIds[kind] === id) defaultIds[kind] = null;
  });
  return {
    ...state,
    folders: state.folders.filter((folder) => folder.id !== id),
    deletedIds: [...new Set([...(state.deletedIds ?? []), id])],
    defaultIds,
  };
};

/**
 * Adds a bani. Returns the SAME state when the bani is already in the folder,
 * so the caller can tell "added" from "was already there" by identity and show
 * the right message rather than a success toast for a no-op.
 */
export const addBani = (state, id, item, now = Date.now()) => {
  const folder = state.folders[indexOf(state, id)];
  if (!folder) return state;
  if (folder.items.some((existing) => existing.baaniId === item.baaniId)) return state;
  if (folder.items.length >= MAX_ITEMS_PER_FOLDER) return state;
  return patch(state, id, { items: [...folder.items, item] }, now);
};

export const removeBani = (state, id, baaniId, now = Date.now()) => {
  const folder = state.folders[indexOf(state, id)];
  if (!folder || !folder.items.some((item) => item.baaniId === baaniId)) return state;
  return patch(state, id, { items: folder.items.filter((i) => i.baaniId !== baaniId) }, now);
};

/** Reorder. Ids the caller invented, or folders that vanished, are dropped. */
export const setOrder = (state, nextOrder) => {
  const byId = new Map(state.folders.map((folder) => [folder.id, folder]));
  const moved = nextOrder.map((id) => byId.get(id)).filter(Boolean);
  const movedIds = new Set(moved.map((folder) => folder.id));
  // Anything the caller left out stays, in its existing order, so a partial
  // list (one lane of a two-lane screen) can never delete a pothi.
  const rest = state.folders.filter((folder) => !movedIds.has(folder.id));
  return { ...state, folders: [...moved, ...rest] };
};

export const countPinned = (state) => state.folders.filter((folder) => folder.pinned).length;

/**
 * Pin or unpin. Pinning past MAX_PINNED is refused — the state comes back
 * unchanged, which the caller reads as "tell the user the limit".
 */
export const togglePin = (state, id, now = Date.now()) => {
  const folder = state.folders[indexOf(state, id)];
  if (!folder) return state;
  if (!folder.pinned && countPinned(state) >= MAX_PINNED) return state;
  return patch(state, id, { pinned: !folder.pinned }, now);
};

/**
 * Render order: pinned first, then the rest, each lane keeping its array order.
 *
 * Derived rather than stored, so the two lanes can never disagree about where a
 * pothi is — the bug a separate `pinnedOrder` invites.
 */
export const listPothis = (state) => {
  const folders = state?.folders ?? [];
  return [...folders.filter((f) => f.pinned), ...folders.filter((f) => !f.pinned)];
};

/** The ids of the pothis a bani already belongs to — drives the add modal's ticks. */
export const pothisContaining = (state, baaniId) =>
  listPothis(state)
    .filter((folder) => folder.items.some((item) => item.baaniId === baaniId))
    .map((folder) => folder.id);

/**
 * Collapses folders that are EXACT copies — same name and the same banis in
 * the same order — keeping the first.
 *
 * This is a self-heal, not a nicety. An earlier build minted a fresh random id
 * for the default pothis on every seed, so a device that seeded twice holds two
 * "Morning Nitnem" folders with different ids: de-duplicating by id cannot see
 * them, and they would sync to the server and come back. Matching on content is
 * what actually finds them.
 *
 * Narrow on purpose. Two pothis that merely share a name are left alone — the
 * moment a user renames or edits one of a pair they are no longer copies, and
 * removing a folder someone deliberately made would be far worse than showing
 * a duplicate.
 */
const dropExactDuplicates = (folders) => {
  const seen = new Set();
  return folders.filter((folder) => {
    const signature = `${folder.source}|${folder.name}|${folder.items
      .map((item) => item.baaniId)
      .join(",")}`;
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
};

/**
 * Drops anything a rehydrated or server payload should not carry: malformed
 * folders, items without a bani, pins past the ceiling, over-long names.
 *
 * Persisted state outlives the code that wrote it and a server response is
 * remote input, so both are treated as untrusted and pass through here.
 */
export const reconcile = (persisted) => {
  const base = emptyPothis();
  if (!persisted) return base;
  const raw = Array.isArray(persisted.folders) ? persisted.folders : [];
  let pinned = 0;
  const folders = raw
    .filter((folder) => folder && typeof folder.id === "string" && folder.id.length > 0)
    .slice(0, MAX_FOLDERS)
    .map((folder) => {
      const items = (Array.isArray(folder.items) ? folder.items : [])
        .filter((item) => item && Number.isInteger(item.baaniId) && item.baaniId > 0)
        .filter(
          // De-duplicate on the bani, keeping the first — a double-write must
          // not render the same shabad twice in the continuous reader.
          (item, at, all) => all.findIndex((other) => other.baaniId === item.baaniId) === at
        )
        .slice(0, MAX_ITEMS_PER_FOLDER)
        .map((item) => ({
          id: typeof item.id === "string" && item.id ? item.id : makeItemId(),
          type: "bani",
          baaniId: item.baaniId,
          title: clamp(item.title || String(item.baaniId), MAX_ITEM_TITLE_LENGTH),
          ...(item.preview ? { preview: clamp(item.preview, MAX_ITEM_TITLE_LENGTH) } : {}),
        }));
      const keepPin = Boolean(folder.pinned) && pinned < MAX_PINNED;
      if (keepPin) pinned += 1;
      return {
        id: clamp(folder.id, MAX_ID_LENGTH),
        name: normaliseName(folder.name) || folder.id,
        source: folder.source === "sundar-gutka" ? "sundar-gutka" : SOURCE,
        items,
        createdAt: Number.isFinite(folder.createdAt) ? folder.createdAt : Date.now(),
        updatedAt: Number.isFinite(folder.updatedAt) ? folder.updatedAt : Date.now(),
        isPublic: Boolean(folder.isPublic),
        pinned: keepPin,
      };
    });
  const kept = dropExactDuplicates(folders);
  // Every entry point — rehydrate, seed, merge — passes through here, so this
  // is the one place the two default pointers are re-established. A pointer at
  // a folder that is still present is left exactly as it is.
  const recorded = persisted.defaultIds ?? {};
  return {
    folders: kept,
    seededDefaults: Boolean(persisted.seededDefaults),
    lastSyncedAt: typeof persisted.lastSyncedAt === "string" ? persisted.lastSyncedAt : null,
    deletedIds: Array.isArray(persisted.deletedIds)
      ? persisted.deletedIds.filter((id) => typeof id === "string")
      : [],
    defaultIds: {
      morning: resolveDefaultId("morning", kept, recorded.morning),
      evening: resolveDefaultId("evening", kept, recorded.evening),
    },
  };
};

/**
 * Adds the pair this app seeds while signed out and records which is which.
 *
 * Marked seeded even when the list is empty, so the check short-circuits and
 * the bani database is not re-scanned on every launch.
 */
export const seedDefaults = (state, pothis = []) => {
  const seeded = pothis.reduce((acc, pothi) => addPothi(acc, pothi), state);
  const pick = (kind, id) =>
    pothis.some((pothi) => pothi.id === id) ? id : seeded.defaultIds?.[kind] ?? null;
  return {
    ...seeded,
    seededDefaults: true,
    defaultIds: { morning: pick("morning", MORNING_ID), evening: pick("evening", EVENING_ID) },
  };
};

/** Retires ONE tombstone, after the server confirmed that specific delete. */
export const clearTombstone = (state, id) => ({
  ...state,
  deletedIds: (state.deletedIds ?? []).filter((buried) => buried !== id),
});

/** The payload for `PUT /folders` — the local-only fields stripped. */
export const toUpsertBody = (state) => ({
  source: SOURCE,
  folders: listPothis(state).filter((folder) => folder.source === SOURCE),
});

/**
 * Merges the server's folders over local, per folder, by `updatedAt`.
 *
 * Last-write-wins at FOLDER granularity rather than whole-document: two devices
 * editing different pothis both keep their edit, which a document-level
 * comparison would not. A folder only local (never synced) is kept; a folder
 * only remote is adopted.
 */
export const mergeRemote = (state, remoteFolders = []) => {
  const local = new Map(state.folders.map((folder) => [folder.id, folder]));
  // A folder this device deleted is NOT a new one from the server.
  const buried = new Set(state.deletedIds ?? []);
  const remoteIds = new Set(remoteFolders.map((folder) => folder.id));
  const merged = [];
  remoteFolders.forEach((remote) => {
    if (buried.has(remote.id)) return;
    const mine = local.get(remote.id);
    merged.push(mine && mine.updatedAt > remote.updatedAt ? mine : remote);
    local.delete(remote.id);
  });
  // A local default gives way to the server’s own copy of it.
  //
  // The API seeds Morning/Evening Nitnem with random uuids; a device that
  // seeded its pair while signed out then has two of each, and they cannot be
  // collapsed by name because the local ones are localised. They ARE the same
  // pothi though — same banis in the same order — so the local copy stands
  // down in favour of the server’s, which is the one both clients agree on.
  //
  // The Morning/Evening pointer is NOT rewritten here: dropping the local
  // folder leaves the pointer dangling, and `reconcile` below re-resolves it by
  // bani signature — which lands on the server's copy, the very folder that
  // superseded it.
  const remoteBaniSets = new Set(remoteFolders.map(baniSignature));
  const supersededDefault = (folder) =>
    LOCAL_DEFAULT_IDS.has(folder.id) && remoteBaniSets.has(baniSignature(folder));

  // A tombstone retires ONLY when a pull proves the server no longer has that
  // id — not when DELETE returns 204.
  //
  // The difference matters because `PUT /folders` on the backend is a whole-
  // source replace with no revision check (see folders.service replaceSource).
  // Another client holding an older list — the web app — can upload it after
  // our delete and put the folder back. Retiring on 204 left nothing to
  // suppress that, so the pothi reappeared on the next pull; keeping the
  // tombstone until the server actually agrees means it stays gone here and
  // gets deleted again.
  const stillThere = (state.deletedIds ?? []).filter((id) => remoteIds.has(id));

  // Whatever is left is local-only — created offline, or before signing in.
  return reconcile({
    ...state,
    folders: [...[...local.values()].filter((f) => !supersededDefault(f)), ...merged],
    deletedIds: stillThere,
  });
};
