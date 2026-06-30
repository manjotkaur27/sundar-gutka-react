import AsyncStorage from "@react-native-async-storage/async-storage";
import { constant, logError } from "@common";
import STRINGS from "../common/localization";

/**
 * Seva configuration service.
 *
 * Fetches the dynamic Seva config from the Khalis backend (constant.SEVA_CONFIG_API_URL)
 * and maps it onto the app-facing SevaConfig shape that SevaScreen + BottomNavigation
 * already consume. The page COPY stays app-local (6 languages via STRINGS); the backend
 * only drives the dynamic bits: donation amounts, payment (Qgiv) config, country, and the
 * Seva dot (redDot). Falls back to the last cached config, then bundled defaults, offline.
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
 * @property {Object}      defaults
 * @property {number[]}    defaults.amounts
 * @property {number}      defaults.selectedAmount
 * @property {PaymentMode} payment_mode
 * @property {boolean}     showSevaDot
 */

/** App-local copy + defaults, used as the base and the offline fallback. */
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
  defaults: {
    amounts: [10, 50, 100],
    selectedAmount: 10,
  },
  payment_mode: "qgiv_prefill_open",
  showSevaDot: true,
};

// Cache only the backend's dynamic bits (not the localized copy, which is rebuilt each
// call with the current language). Keyed v1 in case the shape changes later.
const CACHE_KEY = "@seva_config_dynamic_v1";

// Latest payment block from the backend. Kept module-level so buildQgivUrl() can use it
// without changing its call site in SevaScreen (no UI change).
let cachedPayment = null;

/** Merge the backend dynamic bits onto the app-local copy → SevaConfig. */
const buildConfig = (dyn) => ({
  ...FILLER_CONFIG,
  configVersion: dyn?.version != null ? String(dyn.version) : FILLER_CONFIG.configVersion,
  country: dyn?.country || FILLER_CONFIG.country,
  defaults: {
    amounts:
      Array.isArray(dyn?.defaults?.amounts) && dyn.defaults.amounts.length
        ? dyn.defaults.amounts
        : FILLER_CONFIG.defaults.amounts,
    selectedAmount: dyn?.defaults?.selectedAmount ?? FILLER_CONFIG.defaults.selectedAmount,
  },
  payment_mode: dyn?.payment?.mode || FILLER_CONFIG.payment_mode,
  // Only let the backend control the dot once we actually have a response.
  showSevaDot: dyn ? (dyn.redDot ?? 0) > 0 : FILLER_CONFIG.showSevaDot,
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
    // Send the last cached version so the backend can compute missedVersions/redDot.
    const v = cached?.version != null ? cached.version : "";
    const resp = await fetchJson(`${url}?v=${encodeURIComponent(v)}`);
    const dyn = {
      version: resp?.version,
      country: resp?.country,
      defaults: resp?.defaults,
      payment: resp?.payment,
      redDot: resp?.redDot,
    };
    cachedPayment = resp?.payment ?? null;
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(dyn)).catch(() => {});
    return buildConfig(dyn);
  } catch (err) {
    logError(new Error(`getSevaConfig failed: ${err?.message || err}`));
    if (cached) {
      cachedPayment = cached.payment ?? null;
      return buildConfig(cached);
    }
    return buildConfig(null);
  }
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
