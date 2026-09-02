// What counts as "the connection's fault" rather than ours.
//
// A pure predicate with no Firebase behind it, so anything can ask — including
// a test mocking `@common`, which is the reason it does not simply live inside
// the crashlytics wrapper that first needed it.
//
// It was written out by hand three separate times before this — in the database
// update check, in khalisRequest, and again for Crashlytics — and only two of
// the three agreed on which failures counted.
//
// The strings come from the platforms, not from us:
//   "Network request failed"  React Native's fetch, Android and iOS
//   "Failed to fetch"         Chromium, which the WebView paths surface
//   "Load failed"             WebKit/iOS
//   "Aborted" / timeouts      AbortController and our own request deadlines
const NETWORK_FAILURE =
  /^(network request failed|failed to fetch|load failed)$|timed out|timeout|aborted|network error/i;

/**
 * True when `error` is a connection problem rather than a fault in the app.
 *
 * Give it the RAW caught value. A message the app composed around it — say
 * "getSevaConfig failed: Network request failed" — contains the platform's
 * words inside our own sentence, and matching that would be matching our
 * wording rather than the failure. The anchors above are deliberate.
 */
export const isNetworkFailure = (error) =>
  NETWORK_FAILURE.test(String(error?.message || error).trim());

export default isNetworkFailure;
