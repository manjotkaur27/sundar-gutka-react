/* eslint-env jest */
import {
  countryToCurrencyCode,
  resolveCurrency,
  usdToLocal,
  localToUsd,
  formatCurrency,
  formatNumber,
  localPresets,
  CURRENCIES,
} from "./currency";

describe("currency", () => {
  describe("countryToCurrencyCode", () => {
    it("maps the six supported regions", () => {
      expect(countryToCurrencyCode("IN")).toBe("INR");
      expect(countryToCurrencyCode("US")).toBe("USD");
      expect(countryToCurrencyCode("CA")).toBe("CAD");
      expect(countryToCurrencyCode("AU")).toBe("AUD");
      expect(countryToCurrencyCode("GB")).toBe("GBP");
      expect(countryToCurrencyCode("UK")).toBe("GBP");
    });

    it("maps eurozone members to EUR", () => {
      ["FR", "DE", "ES", "IT", "NL", "IE"].forEach((c) =>
        expect(countryToCurrencyCode(c)).toBe("EUR")
      );
    });

    it("defaults the rest of the world (and junk) to USD", () => {
      expect(countryToCurrencyCode("JP")).toBe("USD");
      expect(countryToCurrencyCode("")).toBe("USD");
      expect(countryToCurrencyCode(undefined)).toBe("USD");
      expect(countryToCurrencyCode("zz")).toBe("USD");
    });

    it("is case-insensitive", () => {
      expect(countryToCurrencyCode("in")).toBe("INR");
    });
  });

  describe("figure conversion", () => {
    it("shows $10 as ₹1000 in INR (x100, per the spec example)", () => {
      const inr = { code: "INR", ...CURRENCIES.INR };
      expect(usdToLocal(10, inr)).toBe(1000);
      expect(localPresets([10, 50, 100], inr)).toEqual([1000, 5000, 10000]);
    });

    it("leaves same-tier currencies at the base figure", () => {
      const gbp = { code: "GBP", ...CURRENCIES.GBP };
      expect(usdToLocal(10, gbp)).toBe(10);
      expect(usdToLocal(50, gbp)).toBe(50);
    });

    it("round-trips a local figure back to its exact USD base for Qgiv", () => {
      const inr = { code: "INR", ...CURRENCIES.INR };
      expect(localToUsd(usdToLocal(10, inr), inr)).toBe(10);
      expect(localToUsd(1000, inr)).toBe(10);
      expect(localToUsd(500, inr)).toBe(5); // custom ₹500 → $5
    });

    it("accepts a currency code string as well as an object", () => {
      expect(usdToLocal(10, "INR")).toBe(1000);
      expect(localToUsd(1000, "INR")).toBe(10);
    });
  });

  describe("formatting", () => {
    it("groups thousands without a symbol", () => {
      expect(formatNumber(1000)).toBe("1,000");
      expect(formatNumber(10000)).toBe("10,000");
      expect(formatNumber(10)).toBe("10");
    });

    it("prefixes the currency symbol", () => {
      expect(formatCurrency(1000, "INR")).toBe("₹1,000");
      expect(formatCurrency(10, "USD")).toBe("$10");
      expect(formatCurrency(10, "CAD")).toBe("CA$10");
    });
  });

  describe("resolveCurrency", () => {
    it("honours an explicit country override", () => {
      expect(resolveCurrency("IN")).toEqual({
        code: "INR",
        symbol: "₹",
        rate: 100,
        presets: [100, 1000, 5000],
      });
      expect(resolveCurrency("DE").code).toBe("EUR");
    });

    it("returns a well-formed currency object with no override (device locale)", () => {
      const c = resolveCurrency();
      expect(typeof c.symbol).toBe("string");
      expect(typeof c.rate).toBe("number");
      expect(CURRENCIES[c.code]).toBeDefined();
    });
  });
});
