import {
  logEvent,
  getAnalytics,
  setAnalyticsCollectionEnabled,
} from "@react-native-firebase/analytics";
import { getApp } from "@react-native-firebase/app";
import { logError } from "./crashlytics";
import { sanitizeName } from "./helper";

const app = getApp();
const analytics = getAnalytics(app);

const MAX_PARAM_LENGTH = 40;
const MAX_VALUE_LENGTH = 100;
const DISALLOWED_PREFIXES = ["firebase_", "google_", "ga_"];

const sanitize = (value, fallback) => {
  const sanitized = sanitizeName(value, MAX_PARAM_LENGTH, fallback);
  const lower = sanitized.toLowerCase();
  if (DISALLOWED_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
    return fallback;
  }
  return sanitized;
};

const safeStr = (value, fallback = "unknown") =>
  value != null && String(value).trim() !== ""
    ? String(value).slice(0, MAX_VALUE_LENGTH)
    : fallback;

const safeInt = (value, fallback = 0) => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.max(0, n) : fallback;
};

// Safely log events with error handling
const trackEvent = async (category, action, label) => {
  const eventName = sanitize(category, "custom_event");
  const paramName = sanitize(action, "detail");
  const paramValue = label == null ? "" : String(label).slice(0, MAX_VALUE_LENGTH);

  try {
    await logEvent(analytics, eventName, {
      [paramName]: paramValue,
    });
  } catch (error) {
    logError(
      new Error(
        `Analytics tracking failed for category: ${eventName}, param: ${paramName} - ${
          error?.message || "Unknown error"
        }`
      )
    );
  }
};

const allowTracking = async (isStatistics) => {
  try {
    await setAnalyticsCollectionEnabled(analytics, isStatistics);
  } catch (error) {
    logError(
      new Error(`Failed to initialize analytics tracking - ${error?.message || "Unknown error"}`)
    );
  }
};

const trackScreenView = async (screenName, key, title) => {
  try {
    const params = {
      screen_name: screenName || "unknown",
      screen_class: (screenName || "unknown").replace(/\s+/g, ""),
    };

    if (key != null) {
      params.key = String(key).slice(0, MAX_VALUE_LENGTH);
    }
    if (title != null) {
      params.title = String(title).slice(0, MAX_VALUE_LENGTH);
    }

    await logEvent(analytics, "screen_view", params);
  } catch (error) {
    logError(
      new Error(`Failed to track screen view: ${screenName} - ${error?.message || "Unknown error"}`)
    );
  }
};

const trackReaderEvent = async (action, label) => {
  await trackEvent("reader", action, label);
};

const trackAudioEvent = async (action, label) => {
  await trackEvent("audio", action, label);
};

const trackSettingEvent = async (action, label) => {
  await trackEvent("setting", action, label);
};

const trackReminderEvent = async (action, label) => {
  await trackEvent("reminder", action, label);
};

// ---------------------------------------------------------------------------
// Dedicated audio analytics events — one Firebase event name per action type.
// This eliminates (not set) values that result from sharing a single "audio"
// event name across params that only some sub-events populate.
// ---------------------------------------------------------------------------

const trackBaniOpen = async (baniID, title, artist) => {
  try {
    await logEvent(analytics, "bani_open", {
      bani_id: safeStr(baniID),
      bani_title: safeStr(title),
      artist: safeStr(artist, "none"),
    });
  } catch (error) {
    logError(new Error(`bani_open tracking failed - ${error?.message || "Unknown error"}`));
  }
};

// Fires when a listening session ends (artist changed, paused, or screen exit).
// trackLengthSec is the full track duration; durationSec is the actual time listened.
const trackBaniListen = async (baniID, baniTitle, artist, durationSec, trackLengthSec) => {
  try {
    const sec = safeInt(durationSec);
    const min = sec > 0 ? parseFloat((sec / 60).toFixed(1)) : 0;
    await logEvent(analytics, "bani_listen", {
      bani_id: safeStr(baniID),
      bani_title: safeStr(baniTitle),
      artist: safeStr(artist, "none"),
      duration_sec: sec,
      duration_min: min,
      track_length_sec: safeInt(trackLengthSec),
    });
  } catch (error) {
    logError(new Error(`bani_listen tracking failed - ${error?.message || "Unknown error"}`));
  }
};

// Fires when playback session ends (navigation away / unmount) with position context.
// Enables % completion and half-listened segmentation in Firebase Explore.
const completionTier = (percent, complete, halfway, completeLabel = "completed") => {
  if (percent >= complete) return completeLabel;
  if (percent >= halfway) return "half";
  return "partial";
};

const trackBaniListenCompletion = async (baniID, title, artist, positionSec, trackLengthSec) => {
  try {
    const position = safeInt(positionSec);
    const length = safeInt(trackLengthSec);
    const pct = length > 0 ? Math.min(100, Math.round((position / length) * 100)) : 0;
    const tier = completionTier(pct, 90, 40);
    await logEvent(analytics, "bani_listen_completion", {
      bani_id: safeStr(baniID),
      bani_title: safeStr(title),
      artist: safeStr(artist, "none"),
      position_sec: position,
      track_length_sec: length,
      percent_complete: pct,
      completion_tier: tier,
    });
  } catch (error) {
    logError(
      new Error(`bani_listen_completion tracking failed - ${error?.message || "Unknown error"}`)
    );
  }
};

const trackBaniArtistDefault = async (baniID, artist) => {
  try {
    await logEvent(analytics, "bani_artist_default", {
      bani_id: safeStr(baniID),
      artist: safeStr(artist, "none"),
    });
  } catch (error) {
    logError(
      new Error(`bani_artist_default tracking failed - ${error?.message || "Unknown error"}`)
    );
  }
};

const trackTrackDownload = async (baniID, artist, baniTitle, networkType) => {
  try {
    await logEvent(analytics, "track_download", {
      bani_id: safeStr(baniID),
      artist: safeStr(artist, "none"),
      bani_title: safeStr(baniTitle),
      // Connection used for the download — always "wifi" | "mobile_data" |
      // "unknown", never blank/null, so this Firebase dimension has no (not set).
      network_type: safeStr(networkType, "unknown"),
    });
  } catch (error) {
    logError(new Error(`track_download tracking failed - ${error?.message || "Unknown error"}`));
  }
};

// Fires when user taps "Request audio" for a bani that has no recorded tracks.
const trackAudioLinkRequest = async (baniTitle, baniID, baniLength) => {
  try {
    await logEvent(analytics, "audio_link_request", {
      bani_title: safeStr(baniTitle),
      bani_id: safeStr(baniID),
      bani_length: safeStr(baniLength),
    });
  } catch (error) {
    logError(
      new Error(`audio_link_request tracking failed - ${error?.message || "Unknown error"}`)
    );
  }
};

// Fires once when user leaves the ReaderScreen.
// sync_scroll "on"/"off" lets Firebase segment users who used audio sync scroll.
const trackScrollProgress = async (baniID, baniTitle, scrollPercent, syncScrollEnabled) => {
  try {
    const pct = Math.min(100, Math.max(0, safeInt(scrollPercent)));
    const tier = completionTier(pct, 90, 40, "complete");
    await logEvent(analytics, "scroll_progress", {
      bani_id: safeStr(baniID),
      bani_title: safeStr(baniTitle),
      scroll_percent: pct,
      scroll_tier: tier,
      sync_scroll: syncScrollEnabled ? "on" : "off",
    });
  } catch (error) {
    logError(new Error(`scroll_progress tracking failed - ${error?.message || "Unknown error"}`));
  }
};

// Nav-bar (top app bar + bottom navigation) show/hide. `trigger` is one of
// tap | scroll_up | scroll_down | auto_hide_idle; `mode` is reading | autoscroll | audio.
const trackNavBar = async (visible, trigger, mode) => {
  try {
    await logEvent(analytics, visible ? "NAV_BAR_SHOW" : "NAV_BAR_HIDE", {
      trigger: safeStr(trigger, "unknown"),
      mode: safeStr(mode, "reading"),
    });
  } catch (error) {
    logError(new Error(`nav_bar visibility tracking failed - ${error?.message || "Unknown error"}`));
  }
};

// Seva donation funnel — IN-APP, OBSERVABLE steps only. Funnel:
//   opened (landing) → frequency_changed (donation type) → amount_selected
//   → payment_started (Donate tapped) → payment_success (Qgiv handoff opened).
// On exit before the handoff we emit checkout_abandoned with the furthest step
// reached.
// NOTE on payment_success: real payment confirmation lives on Qgiv (external
// WebView), which the app cannot observe. Per product decision, OPENING the Qgiv
// handoff is counted as a successful donation, so payment_success fires on
// browser-open — it is a conversion proxy, not a Qgiv-confirmed payment. Donor
// details, payment failures and locality remain unobservable and are not emitted.
// Every param is sanitized so nothing reaches Firebase as null/empty/wrong-type
// (which would surface as "(not set)"): booleans → "true"/"false", numbers →
// safe ints, strings trimmed; null/undefined/empty values are dropped entirely.
// Call sites always pass real values for the required dimensions (donation_type,
// amount_bucket, last_step_reached).
const SEVA_EVENT_NAMES = {
  opened: "seva_opened",
  frequency_changed: "seva_frequency_changed",
  amount_selected: "seva_amount_selected",
  payment_started: "seva_payment_started",
  payment_success: "seva_payment_success",
  checkout_abandoned: "seva_checkout_abandoned",
};

// Firebase drops a param that is null, empty or the wrong type, and silently
// truncates a long one. Shared by every namespaced tracker below so they cannot
// drift on what they consider a safe param.
const sanitizeParams = (params) => {
  const safeParams = {};
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value == null) {
      return; // drop null/undefined — never emit an empty param
    }
    const paramName = sanitize(key, "param");
    if (typeof value === "boolean") {
      safeParams[paramName] = value ? "true" : "false";
    } else if (typeof value === "number") {
      if (Number.isFinite(value)) {
        safeParams[paramName] = safeInt(value);
      }
    } else {
      const str = String(value).trim();
      if (str !== "") {
        safeParams[paramName] = str.slice(0, MAX_VALUE_LENGTH);
      }
    }
  });
  return safeParams;
};

const trackSevaEvent = async (action, params = {}) => {
  try {
    const eventName = SEVA_EVENT_NAMES[action] || sanitize(`seva_${action}`, "seva_event");
    await logEvent(analytics, eventName, sanitizeParams(params));
  } catch (error) {
    logError(new Error(`Seva analytics failed for ${action} - ${error?.message || "Unknown error"}`));
  }
};

// My Pothi. One event name per action, so each carries only the params it
// actually populates — a shared "pothi" umbrella would leave (not set) on every
// param the other actions do not set, which is why the audio events were split.
const POTHI_EVENT_NAMES = {
  created: "pothi_created",
  bani_added: "pothi_bani_added",
  bani_removed: "pothi_bani_removed",
  opened: "pothi_opened",
  renamed: "pothi_renamed",
  deleted: "pothi_deleted",
  reordered: "pothi_reordered",
  pinned: "pothi_pinned",
  unpinned: "pothi_unpinned",
};

const trackPothiEvent = async (action, params = {}) => {
  try {
    const eventName = POTHI_EVENT_NAMES[action] || sanitize(`pothi_${action}`, "pothi_event");
    await logEvent(analytics, eventName, sanitizeParams(params));
  } catch (error) {
    logError(
      new Error(`Pothi analytics failed for ${action} - ${error?.message || "Unknown error"}`)
    );
  }
};

// Onboarding tour funnel — fires when the first-run spotlight tour starts,
// is skipped (with the step the user bailed at), or is fully completed.
const trackTourEvent = async (eventName, stepId) => {
  try {
    const params = {};
    if (stepId != null) {
      params.step_id = safeStr(stepId);
    }
    await logEvent(analytics, eventName, params);
  } catch (error) {
    logError(new Error(`${eventName} tracking failed - ${error?.message || "Unknown error"}`));
  }
};

// ─── Journey dashboard events ─────────────────────────────────────────────────

const trackJourneyView = async (currentStreak, totalActiveDays) => {
  try {
    await logEvent(analytics, "journey_viewed", {
      current_streak: safeInt(currentStreak),
      total_active_days: safeInt(totalActiveDays),
    });
  } catch (error) {
    logError(new Error(`journey_viewed tracking failed - ${error?.message || "Unknown error"}`));
  }
};

const trackKhalisAppClicked = async (appName) => {
  try {
    await logEvent(analytics, "khalis_app_clicked", {
      app_name: safeStr(appName),
    });
  } catch (error) {
    logError(new Error(`khalis_app_clicked tracking failed - ${error?.message || "Unknown error"}`));
  }
};

// ─── Session lifecycle events ─────────────────────────────────────────────────

const trackBaniCompleted = async (baniId, baniTitle, durationSeconds) => {
  try {
    await logEvent(analytics, "bani_completed", {
      bani_id: safeStr(baniId),
      bani_title: safeStr(baniTitle),
      duration_seconds: safeInt(durationSeconds),
    });
  } catch (error) {
    logError(new Error(`bani_completed tracking failed - ${error?.message || "Unknown error"}`));
  }
};

const trackAudioStarted = async (audioId, baniName, artistName) => {
  try {
    await logEvent(analytics, "audio_started", {
      audio_id: safeStr(audioId),
      bani_name: safeStr(baniName),
      artist_name: safeStr(artistName),
    });
  } catch (error) {
    logError(new Error(`audio_started tracking failed - ${error?.message || "Unknown error"}`));
  }
};

const trackAudioCompleted = async (durationSeconds, artistId) => {
  try {
    await logEvent(analytics, "audio_completed", {
      duration_seconds: safeInt(durationSeconds),
      artist_id: safeStr(artistId),
    });
  } catch (error) {
    logError(new Error(`audio_completed tracking failed - ${error?.message || "Unknown error"}`));
  }
};

export {
  allowTracking,
  trackReaderEvent,
  trackSettingEvent,
  trackReminderEvent,
  trackScreenView,
  trackAudioEvent,
  trackSevaEvent,
  trackPothiEvent,
  // Dedicated per-action events (replace the old single "audio" umbrella event)
  trackBaniOpen,
  trackBaniListen,
  trackBaniListenCompletion,
  trackBaniArtistDefault,
  trackTrackDownload,
  trackAudioLinkRequest,
  trackScrollProgress,
  trackNavBar,
  trackTourEvent,
  // Journey + session lifecycle events
  trackJourneyView,
  trackKhalisAppClicked,
  trackBaniCompleted,
  trackAudioStarted,
  trackAudioCompleted,
};
