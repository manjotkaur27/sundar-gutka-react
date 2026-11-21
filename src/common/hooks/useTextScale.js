import { useContext } from "react";
import { TextScaleContext } from "../context/TextScaleContext";

/**
 * `{ app, max }`: the app's Font Size multiplier and the ceiling text may grow
 * to here (see common/textScale.js). `{ app: 1, max: FONT_SCALE_MAX }` outside
 * the provider.
 */
const useTextScale = () => useContext(TextScaleContext);

export default useTextScale;
