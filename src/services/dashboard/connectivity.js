import { constant } from "@common";

// Lightweight reachability check, mirrors BottomNavigation's checkInternetConnection.
// Used by dashboard network services so they can surface an offline state.
export const isOnline = async () => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(constant.INTERNET_CHECK_URL, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });
    return response?.ok ?? false;
  } catch (_) {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
};

// Thrown by services when there is no connectivity, so consumers can render
// the shared OfflineNotice instead of a generic error.
export class OfflineError extends Error {
  constructor(message = "offline") {
    super(message);
    this.name = "OfflineError";
    this.offline = true;
  }
}

export default isOnline;
