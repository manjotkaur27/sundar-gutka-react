import { FONT_SCALE_MAX } from "@theme/scale";
import constant from "./constant";
import { effectiveTextScale, osScaleCap, scaleForFontSize } from "./textScale";

describe("scaleForFontSize", () => {
  it("maps each Font Size step to its multiplier, Small being today's size", () => {
    expect(scaleForFontSize(constant.EXTRA_SMALL)).toBe(0.85);
    expect(scaleForFontSize(constant.SMALL)).toBe(1);
    expect(scaleForFontSize(constant.MEDIUM)).toBe(1.15);
    expect(scaleForFontSize(constant.LARGE)).toBe(1.3);
    expect(scaleForFontSize(constant.EXTRA_LARGE)).toBe(1.5);
  });

  it("treats a missing or unknown setting as the default", () => {
    expect(scaleForFontSize(undefined)).toBe(1);
    expect(scaleForFontSize("UNKNOWN")).toBe(1);
  });
});

describe("osScaleCap", () => {
  it("leaves the OS cap as it was at the default size", () => {
    expect(osScaleCap(1)).toBe(FONT_SCALE_MAX);
    expect(osScaleCap(0.85)).toBe(FONT_SCALE_MAX);
  });

  it("leaves the OS nothing to add once the app's step reaches the ceiling", () => {
    expect(osScaleCap(1.5)).toBe(1);
  });
});

describe("effectiveTextScale", () => {
  it("is exactly the OS behaviour for someone on the default size", () => {
    expect(effectiveTextScale(1, 1)).toBe(1);
    expect(effectiveTextScale(1, 1.3)).toBeCloseTo(1.3);
    expect(effectiveTextScale(1, 3)).toBe(FONT_SCALE_MAX);
  });

  it("multiplies the app's step by the OS setting below the ceiling", () => {
    expect(effectiveTextScale(1.15, 1.2)).toBeCloseTo(1.38);
    expect(effectiveTextScale(0.85, 1.3)).toBeCloseTo(1.105);
  });

  it("never exceeds the ceiling with both settings at their largest", () => {
    expect(effectiveTextScale(1.5, 2)).toBeCloseTo(FONT_SCALE_MAX);
    expect(effectiveTextScale(1.3, 2)).toBeCloseTo(FONT_SCALE_MAX);
    expect(effectiveTextScale(1.5, 1)).toBeCloseTo(FONT_SCALE_MAX);
  });

  it("stays under a lower ceiling when given one", () => {
    expect(effectiveTextScale(1, 2, 1.3)).toBeCloseTo(1.3);
    expect(effectiveTextScale(1.3, 2, 1.3)).toBeCloseTo(1.3);
    expect(effectiveTextScale(1, 1.1, 1.3)).toBeCloseTo(1.1);
  });

  it("treats a missing OS scale as 1", () => {
    expect(effectiveTextScale(1.15, undefined)).toBeCloseTo(1.15);
    expect(effectiveTextScale(1.15, 0)).toBeCloseTo(1.15);
  });
});
