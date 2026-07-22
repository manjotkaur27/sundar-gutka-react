import { NativeModules, Platform } from "react-native";

/**
 * Currency localisation for the Seva page.
 *
 * The donation is ultimately processed by Qgiv **in USD** — the app cannot
 * charge in other currencies. So this module keeps a single USD "base" ladder
 * ($10 / $50 / $100) and only localises how those figures are *displayed*:
 *   • the right symbol for the donor's region (₹, $, CA$, €, A$, £), and
 *   • a "simplified" round figure (e.g. $10 shown as ₹1000 in India — a x100
 *     factor, per the product spec: "$10 in USD can be shown as Rs. 1000").
 * Whatever the donor picks or types is converted **back to USD** before the
 * Qgiv hand-off, so the charge always matches the base tier.
 *
 * Region is detected from the device locale (works fully offline, on first
 * launch, with no backend dependency). Defaults to USD for anywhere not in the
 * table below.
 */

// symbol = what the donor sees; rate = local units per 1 USD (display only).
// Non-INR currencies use rate 1 (round, plausible figures at the same tier),
// matching the "simplified figures" intent; INR uses x100 so amounts read
// naturally (₹10 would feel tiny; ₹1000 does not).
// NB: the ₹ (U+20B9) glyph renders as a Devanagari-style form in the app's Baloo
// Paaji font, so the Seva UI draws currency *symbols* in the system font (which
// has a correct ₹) while keeping the digits in Baloo — see styles.symbolFont.
//
// `presets` (optional) are the LOCAL suggested-amount tiers to show for that
// currency; the first is the default/base. When absent, the app derives tiers
// from the backend's USD base amounts × rate. INR uses its own round local
// ladder (₹100 / ₹1,000 / ₹5,000, base ₹100) per product; those map back to
// USD via `rate` for the Qgiv charge (₹100 → $1, ₹1,000 → $10, ₹5,000 → $50).
export const CURRENCIES = {
  USD: { symbol: "$", rate: 1 },
  CAD: { symbol: "CA$", rate: 1 },
  EUR: { symbol: "€", rate: 1 },
  AUD: { symbol: "A$", rate: 1 },
  GBP: { symbol: "£", rate: 1 },
  INR: { symbol: "₹", rate: 100, presets: [100, 1000, 5000] },
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
 * Resolves the currency to display. Pass an explicit ISO country code to
 * override device detection (e.g. a future backend-provided country); omit it
 * to use the device locale.
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

/** Groups thousands with commas without relying on Intl (Hermes-safe). */
const groupThousands = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** A USD base amount → its localised **display** figure (rounded, whole). */
export const usdToLocal = (usd, currency) => {
  const c = asCurrency(currency);
  return Math.round((Number(usd) || 0) * c.rate);
};

/**
 * A locally-entered/displayed figure → the USD amount to hand to Qgiv, kept to
 * 2 decimals. This is the inverse of usdToLocal, so a selected preset round-trips
 * back to its exact base tier.
 */
export const localToUsd = (local, currency) => {
  const c = asCurrency(currency);
  const usd = (Number(local) || 0) / c.rate;
  return Math.round(usd * 100) / 100;
};

/** A whole number with thousands grouping and no symbol, e.g. 1000 → "1,000". */
export const formatNumber = (amount) => groupThousands(Math.round(Number(amount) || 0));

/** "₹1,000" / "$10" — symbol + grouped whole figure. */
export const formatCurrency = (amount, currency) => {
  const c = asCurrency(currency);
  return `${c.symbol}${formatNumber(amount)}`;
};

/** Maps the USD preset ladder to localised display figures. */
export const localPresets = (usdPresets, currency) =>
  (usdPresets || []).map((usd) => usdToLocal(usd, currency));

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
