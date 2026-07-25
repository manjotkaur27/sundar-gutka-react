import { NativeModules, Platform } from "react-native";
import { getLiveRate } from "./exchangeRates";

/**
 * Currency localisation for the Seva page.
 *
 * The donation is ultimately processed by Qgiv **in USD** — the app cannot
 * charge in other currencies. So this module keeps a single USD "base" ladder
 * ($10 / $50 / $100) and localises it two ways:
 *   • the right symbol for the donor's region (₹, $, CA$, €, A$, £), and
 *   • a *real* conversion at live ECB exchange rates (services/exchangeRates.js),
 *     rounded to a clean local figure for display (e.g. the $10 tier shows as
 *     CA$15, not CA$14.09).
 * Whatever the donor picks or types (a local figure) is converted **back to USD
 * at the same live rate and rounded to whole dollars** before the Qgiv hand-off,
 * so Qgiv is prefilled with the correct USD amount for what the donor saw.
 *
 * The `rate` values below are STATIC FALLBACKS (local units per 1 USD, roughly
 * current). They're used only until — or when — live rates are unavailable
 * (first launch before the fetch lands, offline, or the FX endpoint is down),
 * so conversion always works fully offline. getLiveRate() overrides them the
 * moment real rates are cached; see effectiveRate() below.
 *
 * Region prefers the backend's IP-resolved countryCode (SevaScreen passes
 * `config?.countryCode` in) — more accurate than locale for "what jurisdiction
 * is this donor actually in right now". Falls back to the device locale
 * whenever that's unavailable. Defaults to USD for anywhere not in the table.
 */

// symbol = what the donor sees; rate = static fallback (local units per 1 USD),
// overridden by live ECB rates when available (see effectiveRate).
// NB: the ₹ (U+20B9) glyph renders as a Devanagari-style form in the app's Baloo
// Paaji font, so the Seva UI draws currency *symbols* in the system font (which
// has a correct ₹) while keeping the digits in Baloo — see styles.symbolFont.
//
// `presets` (optional) are the LOCAL suggested-amount tiers to show for that
// currency; the first is the default/base. When absent, the app derives tiers
// from the backend's USD base amounts × rate, nice-rounded for display. INR
// keeps its own fixed round ladder (₹100 / ₹1,000 / ₹5,000, base ₹100) per
// product; those convert to USD via the live rate for the Qgiv charge
// (≈ ₹100 → $1, ₹1,000 → $10, ₹5,000 → $52 at ~₹96/USD).
export const CURRENCIES = {
  USD: { symbol: "$", rate: 1 },
  CAD: { symbol: "CA$", rate: 1.41 },
  EUR: { symbol: "€", rate: 0.88 },
  AUD: { symbol: "A$", rate: 1.43 },
  GBP: { symbol: "£", rate: 0.75 },
  INR: { symbol: "₹", rate: 96, presets: [100, 1000, 5000] },
};

export const DEFAULT_CURRENCY_CODE = "USD";

// Eurozone members → EUR. (The common ones; the list is easy to extend.)
const EUROZONE = new Set([
  "AT",
  "BE",
  "HR",
  "CY",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PT",
  "SK",
  "SI",
  "ES",
]);

/**
 * Maps an ISO 3166-1 alpha-2 country code to one of the supported currencies,
 * defaulting to USD for the rest of the world.
 */
export const countryToCurrencyCode = (countryCode) => {
  const c = String(countryCode || "")
    .trim()
    .toUpperCase();
  if (c === "IN") return "INR";
  if (c === "US") return "USD";
  if (c === "CA") return "CAD";
  if (c === "AU") return "AUD";
  if (c === "GB" || c === "UK") return "GBP";
  if (EUROZONE.has(c)) return "EUR";
  return DEFAULT_CURRENCY_CODE;
};

/**
 * Best-effort device region (ISO alpha-2) from the platform locale, e.g.
 * "en_IN" → "IN". Dependency-free (reads the same native locale RN itself uses)
 * and safe: any failure returns "" so callers fall back to USD.
 */
export const getDeviceCountryCode = () => {
  try {
    let locale = "";
    if (Platform.OS === "ios") {
      const settings = NativeModules.SettingsManager?.settings;
      locale =
        settings?.AppleLocale ||
        (Array.isArray(settings?.AppleLanguages) ? settings.AppleLanguages[0] : "") ||
        "";
    } else {
      locale = NativeModules.I18nManager?.localeIdentifier || "";
    }
    // Region subtag: "en_IN" / "en-IN" / "pa_IN" → "IN".
    const match = /[-_]([A-Za-z]{2})(?:[-_@#]|$)/.exec(String(locale));
    return match ? match[1].toUpperCase() : "";
  } catch (_) {
    return "";
  }
};

/**
 * Resolves the currency to display. Pass an explicit ISO country code (e.g.
 * the backend's `countryCode`, from services/sevaConfig.js) to override
 * device detection; omit it, or pass null/undefined, to fall back to the
 * device locale.
 * @returns {{code: string, symbol: string, rate: number}}
 */
export const resolveCurrency = (overrideCountryCode) => {
  const country = overrideCountryCode || getDeviceCountryCode();
  const code = countryToCurrencyCode(country);
  return { code, ...CURRENCIES[code] };
};

/** Coerces a currency arg (code string or object) to a currency object. */
const asCurrency = (currency) => {
  if (currency && typeof currency === "object" && currency.rate != null) return currency;
  const code = CURRENCIES[currency] ? currency : DEFAULT_CURRENCY_CODE;
  return { code, ...CURRENCIES[code] };
};

/**
 * The rate to convert with: the live ECB rate for this currency when we have it,
 * else the static fallback baked into CURRENCIES. Keeping this in one place means
 * display figures and the Qgiv USD charge always use the SAME rate, so what the
 * donor sees and what they're charged can never drift apart.
 */
const effectiveRate = (c) => getLiveRate(c.code) ?? c.rate;

/** Groups thousands with commas without relying on Intl (Hermes-safe). */
const groupThousands = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/**
 * Rounds a raw converted local figure to a clean, donation-friendly number so
 * the cards read nicely (e.g. CA$14.09 → CA$15, £75.1 → £75), with the step
 * scaling by magnitude. Small tiers snap to 5s, mid tiers to 10s, large to
 * 25/100/500. Never returns 0 for a positive input (floors at one step).
 */
export const niceRoundLocal = (value) => {
  const v = Number(value) || 0;
  if (v <= 0) return 0;
  let step;
  if (v < 30) step = 5;
  else if (v < 150) step = 10;
  else if (v < 600) step = 25;
  else if (v < 2000) step = 100;
  else step = 500;
  return Math.max(step, Math.round(v / step) * step);
};

/** A USD base amount → its raw localised figure at the effective rate (whole). */
export const usdToLocal = (usd, currency) => {
  const c = asCurrency(currency);
  return Math.round((Number(usd) || 0) * effectiveRate(c));
};

/**
 * A locally-entered/displayed figure → the USD amount to hand to Qgiv, converted
 * at the same effective (live) rate and **rounded to whole US dollars** — Qgiv is
 * prefilled with a clean figure, and it matches the donor's ₹1000 → $10 mental
 * model. Floors at $1 so a hand-off can never be $0.
 */
export const localToUsd = (local, currency) => {
  const c = asCurrency(currency);
  const usd = (Number(local) || 0) / effectiveRate(c);
  if (!(usd > 0)) return 0;
  return Math.max(1, Math.round(usd));
};

/** A whole number with thousands grouping and no symbol, e.g. 1000 → "1,000". */
export const formatNumber = (amount) => groupThousands(Math.round(Number(amount) || 0));

/** "₹1,000" / "$10" — symbol + grouped whole figure. */
export const formatCurrency = (amount, currency) => {
  const c = asCurrency(currency);
  return `${c.symbol}${formatNumber(amount)}`;
};

/**
 * Maps the USD preset ladder to localised **display** figures — converted at the
 * live rate, then nice-rounded so the cards show clean numbers (CA$15, not
 * CA$14.09). USD itself stays exact (its rate is 1, so nice-rounding a round
 * base tier is a no-op).
 */
export const localPresets = (usdPresets, currency) =>
  (usdPresets || []).map((usd) => niceRoundLocal(usdToLocal(usd, currency)));

/**
 * The LOCAL preset ladder to display for a currency, resolving in priority order:
 *   1. backend per-currency override — `backendPresets[currency.code]`, used
 *      verbatim (already local figures, e.g. INR [100,1000,5000]);
 *   2. the currency's own built-in local ladder (`currency.presets` — INR);
 *   3. the backend USD base `amounts` converted to local figures.
 * Always returns a non-empty array of positive whole local figures, so the
 * donate widget can never render an empty tier row.
 * @param {{code:string, presets?:number[]}} currency
 * @param {number[]} [backendAmounts]   USD base ladder from the backend
 * @param {Record<string, number[]>} [backendPresets]  per-currency local overrides
 */
export const resolveLocalPresets = (currency, backendAmounts, backendPresets) => {
  const c = asCurrency(currency);
  const override = backendPresets && backendPresets[c.code];
  const cleanOverride = Array.isArray(override)
    ? override.map((n) => Math.round(Number(n) || 0)).filter((n) => n > 0)
    : [];
  if (cleanOverride.length) return cleanOverride;
  if (Array.isArray(currency.presets) && currency.presets.length) return currency.presets;
  const base =
    Array.isArray(backendAmounts) && backendAmounts.length ? backendAmounts : [10, 50, 100];
  return localPresets(base, c);
};
