import { readToken } from "@common/sso/tokenStore";
import { constant, logError, logMessage } from "@common";

// The Khalis folders API — khalis-users-api, src/folders.
//
//   GET    /folders                              all sources, for the caller
//   PUT    /folders                              replace ONE source wholesale
//   DELETE /folders?source=…                     drop a whole source
//   DELETE /folders/:folderId                    drop one folder, idempotent
//
// Every authed call needs the SSO bearer token.
//
// The API also exposes /public/folders/:ownerId/:folderId (+ /save) for shared
// pothis. Deliberately not wired: sharing is not a shipped feature yet, and an
// unused client for it would be dead code that drifts from the contract.

const BASE = `${constant.DASHBOARD_API_BASE_URL}/folders`;

/** The API rejects a body over 256 KB outright, so it is checked before sending. */
export const MAX_PAYLOAD_BYTES = 256 * 1024;

const TIMEOUT_MS = 15000;

/**
 * One fetch, with a timeout and a typed failure.
 *
 * Sync is a background concern: nothing here throws into a render path. Callers
 * get `{ ok, status, data, error }` and decide, which is what lets an offline
 * device keep working on local state instead of showing an error it cannot act
 * on.
 */
const request = async (url, { method = "GET", body, token } = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    if (payload && payload.length > MAX_PAYLOAD_BYTES) {
      return { ok: false, status: 413, error: "payload-too-large" };
    }
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        ...(payload ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: payload,
    });
    // 204 on both DELETE paths — no body to parse.
    if (response.status === 204) return { ok: true, status: 204, data: null };
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      return { ok: false, status: response.status, data, error: data?.message ?? "request-failed" };
    }
    return { ok: true, status: response.status, data };
  } catch (error) {
    // An abort is a timeout or a dropped connection; neither is a bug worth a
    // crash report, so it is logged as a message and reported as offline.
    if (error?.name === "AbortError") {
      logMessage(`pothiApi: ${method} ${url} timed out`);
      return { ok: false, status: 0, error: "timeout" };
    }
    logError(error);
    return { ok: false, status: 0, error: "network" };
  } finally {
    clearTimeout(timer);
  }
};

const authed = async (url, options = {}) => {
  const token = await readToken();
  if (!token) return { ok: false, status: 401, error: "signed-out" };
  return request(url, { ...options, token });
};

/** Every folder the signed-in user has, across sources. 404 means "none yet". */
export const fetchFolders = async () => {
  const result = await authed(BASE);
  if (result.status === 404) return { ok: true, status: 404, data: { folders: [] } };
  return result;
};

/**
 * Replace one source's folders wholesale.
 *
 * @param {{source: string, folders: object[]}} body from `toUpsertBody(state)`.
 */
export const putFolders = (body) => authed(BASE, { method: "PUT", body });

/** Drop a single folder. Idempotent — 204 even when it was already gone. */
export const deleteFolder = (folderId) =>
  authed(`${BASE}/${encodeURIComponent(folderId)}`, { method: "DELETE" });

/** Drop every folder of one source. */
export const deleteSource = (source) =>
  authed(`${BASE}?source=${encodeURIComponent(source)}`, { method: "DELETE" });

export default { fetchFolders, putFolders, deleteFolder, deleteSource };
