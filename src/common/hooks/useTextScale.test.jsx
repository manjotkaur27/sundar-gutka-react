import React from "react";

import { renderHook } from "@testing-library/react-native";
import { CHROME_SCALE_MAX, FONT_SCALE_MAX } from "@theme/scale";

import constant from "../constant";
import { TextScaleLimit, TextScaleProvider } from "../context/TextScaleContext";

import useTextScale from "./useTextScale";

let mockFontSize;
jest.mock("react-redux", () => ({
  useSelector: (selector) => selector({ fontSize: mockFontSize }),
}));

/* eslint-disable react/prop-types -- test wrappers */
const provider = ({ children }) => <TextScaleProvider>{children}</TextScaleProvider>;
const limited = ({ children }) => (
  <TextScaleProvider>
    <TextScaleLimit max={CHROME_SCALE_MAX}>{children}</TextScaleLimit>
  </TextScaleProvider>
);
/* eslint-enable react/prop-types */

describe("useTextScale", () => {
  it("is the default size under the app-wide ceiling outside the provider", () => {
    const { result } = renderHook(() => useTextScale());
    expect(result.current).toEqual({ app: 1, max: FONT_SCALE_MAX });
  });

  it("follows the Font Size setting inside the provider", () => {
    mockFontSize = constant.LARGE;
    const { result } = renderHook(() => useTextScale(), { wrapper: provider });
    expect(result.current).toEqual({ app: 1.3, max: FONT_SCALE_MAX });
  });

  it("clamps the multiplier and the ceiling inside a TextScaleLimit", () => {
    mockFontSize = constant.EXTRA_LARGE;
    const { result } = renderHook(() => useTextScale(), { wrapper: limited });
    expect(result.current).toEqual({ app: CHROME_SCALE_MAX, max: CHROME_SCALE_MAX });
  });

  it("leaves a smaller step alone inside a TextScaleLimit", () => {
    mockFontSize = constant.MEDIUM;
    const { result } = renderHook(() => useTextScale(), { wrapper: limited });
    expect(result.current).toEqual({ app: 1.15, max: CHROME_SCALE_MAX });
  });
});
