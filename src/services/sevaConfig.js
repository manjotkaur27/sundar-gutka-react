import AsyncStorage from "@react-native-async-storage/async-storage";
import { constant, logError } from "@common";
import STRINGS from "../common/localization";

/**
 * Seva configuration service.
 *
 * Fetches the dynamic Seva config from the Khalis backend (constant.SEVA_CONFIG_API_URL)
 * and maps it onto the app-facing SevaConfig shape that SevaScreen + BottomNavigation
 * already consume. The page COPY stays app-local (6 languages via STRINGS); the backend
 * only drives the dynamic bits: payment (Qgiv) config, country, and the Seva dot (redDot).
 * Donation amounts are fixed app-local (see FILLER_CONFIG.amounts) — the backend no longer
 * provides them. Falls back to the last cached config, then bundled defaults, offline.
 */

/** @typedef {'one_time' | 'recurring' | 'unknown'} DonorType */
/** @typedef {'stripe' | 'qgiv' | 'unknown'} DonorSource */
/** @typedef {'qgiv_prefill_open' | 'stripe' | 'qgiv_embedded'} PaymentMode */

/**
 * @typedef {Object} SevaConfig
 * @property {string}      configVersion
 * @property {string}      country          - ISO 3166-1 alpha-2, e.g. "US"
 * @property {Object}      content
 * @property {string}      content.headline
 * @property {string}      content.description
 * @property {number[]}    amounts
 * @property {number}      selectedAmount
 * @property {PaymentMode} payment_mode
 * @property {boolean}     showSevaDot   - true whenever sevaDotCount > 0
 * @property {number}      sevaDotCount  - 0 none / 1 plain dot / 2+ numbered badge
 */

/** App-local copy + fixed donation amounts, used as the base and the offline fallback. */
const FILLER_CONFIG = {
  configVersion: "mock-v1",
  country: "US",
  content: {
    headline: "ਸੁੰਦਰ ਗੁਟਕਾ",
    description:
      "Is built by volunteers at Khalis Foundation, a non-profit organization " +
      "that builds software like Sundar Gutka and SikhiToTheMax. Khalis helps " +
      "millions of Sikhs around the world connect with Gurbani. You can be part " +
      "of this seva as well; serve millions with a single donation.",
    descriptionLinks: [
      { text: "Khalis Foundation", url: "https://khalisfoundation.org/" },
      { text: "SikhiToTheMax", url: "https://sikhitothemax.org/" },
    ],
    taxMessage: "Your donation is tax-deductible. You will receive a receipt via email.",
    nonUsTaxMessage: "Thank you for your generous support of Khalis Foundation.",
    footerText: "Know coding? You can also do seva through open source contributions.",
    donatedHeadline: "ਵਾਹਿਗੁਰੂ ਜੀ ਕਾ ਖਾਲਸਾ",
    donatedDescription:
      "Thank you for your generous support. Your seva helps Sikhs around the world connect with Gurbani.",
    recurringRetentionDescription:
      "Your monthly seva is making a difference. Thank you for your continued support.",
    convertToRecurringCTA: "Upgrade to Monthly Giving",
  },
  amounts: [10, 50, 100],
  selectedAmount: 10,
  payment_mode: "qgiv_prefill_open",
  showSevaDot: true,
};

// Cache only the backend's dynamic bits (not the localized copy, which is rebuilt each
// call with the current language). Keyed v1 in case the shape changes later.
const CACHE_KEY = "@seva_config_dynamic_v1";
// The config version the user has acknowledged by OPENING the Seva page. Sent as
// ?v= so the backend computes redDot = currentVersion − seenVersion. Persisted
// separately from the cached config so the dot survives background refetches and
// only clears when the user actually opens Seva (see markSevaSeen). Defaults to 0
// (never opened) → the dot shows whenever the backend version is ≥ 1.
const SEEN_VERSION_KEY = "@seva_seen_version";

// Latest payment block from the backend. Kept module-level so buildQgivUrl() can use it
// without changing its call site in SevaScreen (no UI change).
let cachedPayment = null;
// Latest currentVersion observed from the backend — what markSevaSeen() records.
let latestVersion = 0;

// Tiny pub/sub so the Seva tab's red dot clears instantly when the user opens the
// Seva page (markSevaSeen), without waiting for the bottom bar's next refetch.
// Carries the actual missed-version count (0 = none), not just a boolean, so
// subscribers can render 0 none / 1 plain dot / 2+ numbered badge.
const dotListeners = new Set();
export const subscribeSevaDot = (listener) => {
  dotListeners.add(listener);
  return () => {
    dotListeners.delete(listener);
  };
};
const emitSevaDot = (count) => {
  dotListeners.forEach((fn) => {
    try {
      fn(count);
    } catch (_) {
      // one listener throwing must not stop the rest
    }
  });
};

const readSeenVersion = async () => {
  try {
    const raw = await AsyncStorage.getItem(SEEN_VERSION_KEY);
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch (_) {
    return 0;
  }
};

/** Merge the backend dynamic bits onto the app-local copy → SevaConfig. */
const buildConfig = (dyn) => ({
  ...FILLER_CONFIG,
  configVersion: dyn?.version != null ? String(dyn.version) : FILLER_CONFIG.configVersion,
  country: dyn?.country || FILLER_CONFIG.country,
  payment_mode: dyn?.payment?.mode || FILLER_CONFIG.payment_mode,
  // Only let the backend control the dot once we actually have a response.
  showSevaDot: dyn ? (dyn.redDot ?? 0) > 0 : FILLER_CONFIG.showSevaDot,
  // Real count for the numbered-badge UI (0 none / 1 plain dot / 2+ shows the
  // number). No response yet (offline, first-ever launch) falls back to 1
  // rather than a real count, since we can't know the true value.
  sevaDotCount: dyn ? dyn.redDot ?? 0 : Number(FILLER_CONFIG.showSevaDot),
  content: {
    ...FILLER_CONFIG.content,
    description: STRINGS.SEVA_DESCRIPTION,
    footerText: STRINGS.SEVA_FOOTER_TEXT,
    taxMessage: STRINGS.SEVA_TAX_DEDUCTIBLE,
    nonUsTaxMessage: STRINGS.SEVA_NON_US_TAX,
  },
});

const fetchJson = async (url) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
};

const readCache = async () => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
};

/**
 * Returns the Seva configuration (backend dynamic bits + app-local copy).
 * @returns {Promise<SevaConfig>}
 */
export const getSevaConfig = async () => {
  const cached = await readCache();
  const url = constant.SEVA_CONFIG_API_URL;
  try {
    if (!url) throw new Error("SEVA_CONFIG_API_URL not set");
    // Send the version the user has SEEN (not merely the last one fetched): the
    // backend returns redDot = currentVersion − seenVersion, so the dot stays up
    // until the user opens the Seva page (markSevaSeen). A background refetch by
    // the bottom bar must NOT clear it.
    const seenVersion = await readSeenVersion();
    const resp = await fetchJson(`${url}?v=${encodeURIComponent(seenVersion)}`);
    const dyn = {
      version: resp?.version,
      country: resp?.country,
      payment: resp?.payment,
      redDot: resp?.redDot,
    };
    latestVersion = Number(resp?.version) || 0;
    cachedPayment = resp?.payment ?? null;
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(dyn)).catch(() => {});
    emitSevaDot(dyn.redDot ?? 0);
    return buildConfig(dyn);
  } catch (err) {
    logError(new Error(`getSevaConfig failed: ${err?.message || err}`));
    if (cached) {
      cachedPayment = cached.payment ?? null;
      latestVersion = Number(cached.version) || latestVersion;
      return buildConfig(cached);
    }
    return buildConfig(null);
  }
};

/**
 * Acknowledge the current Seva config version — call when the user opens the Seva
 * page. Persists it as the "seen" version so the next /seva/config sends
 * ?v=<current> (backend then returns redDot=0) and clears the tab dot right now.
 * The dot only reappears when the backend increments the version.
 */
export const markSevaSeen = async () => {
  let version = latestVersion;
  if (!version) {
    const cached = await readCache();
    version = Number(cached?.version) || 0;
  }
  try {
    await AsyncStorage.setItem(SEEN_VERSION_KEY, String(version));
  } catch (_) {
    // best-effort; the dot re-clears on the next successful fetch anyway
  }
  emitSevaDot(0);
};

/**
 * Builds a Qgiv prefill URL using Qgiv's path-segment format.
 *
 * Qgiv URL shortcuts stack as path segments:
 *   /amount/[value]          – selects a preset suggested amount on the form
 *   /amount/other/[value]    – pre-fills the "other amount" field
 *   /frequency/[letter]      – m=monthly, a=annually, w=weekly, q=quarterly, s=semiannually
 *   /onetime                 – forces the One Time option
 *
 * The form base comes from the backend payment config when available
 * (constant.SEVA_CONFIG_API_URL → payment.baseUrl), else the bundled default.
 *
 * @param {Object} params
 * @param {number} params.amount
 * @param {'one_time'|'recurring'} params.donationType
 * @param {'Monthly'|'Annually'} [params.frequency]
 * @returns {string}
 */
export const buildQgivUrl = ({ amount, donationType, frequency }) => {
  // Backend-owned Qgiv form (falls back to the bundled default).
  let url = cachedPayment?.baseUrl || "https://secure.qgiv.com/for/khalisfoundation";

  // Amount segment - always pre-fill the "other" field to guarantee pre-filling on the Qgiv form
  if (amount) {
    const formatted = Number(amount).toFixed(2);
    url += `/amount/other/${formatted}`;
  }

  // Frequency segment. Qgiv does NOT fall back to One Time when this is omitted —
  // it uses the form's default (Monthly), which made one-time donations open the
  // monthly form. So be explicit in both cases:
  //   recurring → /frequency/[letter]      one-time → /onetime
  if (donationType === "recurring") {
    const freqLetter = frequency === "Annually" ? "a" : "m"; // default monthly
    url += `/frequency/${freqLetter}`;
  } else {
    url += "/onetime";
  }

  return url;
};
