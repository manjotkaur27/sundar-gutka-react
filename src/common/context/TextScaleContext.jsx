import React, { createContext, useContext, useMemo } from "react";
import { useSelector } from "react-redux";
import { FONT_SCALE_MAX } from "@theme/scale";
import PropTypes from "prop-types";
import { scaleForFontSize } from "../textScale";

// The app's Font Size multiplier and the ceiling text may grow to, read from
// the store ONCE at the root and handed down, rather than through a store
// subscription in every piece of text on screen. Outside the provider the
// multiplier is 1, the default size, under the app-wide ceiling.
export const TextScaleContext = createContext({ app: 1, max: FONT_SCALE_MAX });

export const TextScaleProvider = ({ children }) => {
  const fontSize = useSelector((state) => state.fontSize);
  const value = useMemo(
    () => ({ app: scaleForFontSize(fontSize), max: FONT_SCALE_MAX }),
    [fontSize]
  );
  return <TextScaleContext.Provider value={value}>{children}</TextScaleContext.Provider>;
};

TextScaleProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Lowers the ceiling for everything inside it, for bars whose width cannot grow
 * with their text (see CHROME_SCALE_MAX). Both settings still apply below it;
 * the app's multiplier is clamped to it so the two together never pass it.
 */
export const TextScaleLimit = ({ max, children }) => {
  const parent = useContext(TextScaleContext);
  const value = useMemo(() => {
    const ceiling = Math.min(parent.max, max);
    return { app: Math.min(parent.app, ceiling), max: ceiling };
  }, [parent, max]);
  return <TextScaleContext.Provider value={value}>{children}</TextScaleContext.Provider>;
};

TextScaleLimit.propTypes = {
  max: PropTypes.number.isRequired,
  children: PropTypes.node.isRequired,
};
