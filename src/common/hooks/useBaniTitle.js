import { useCallback } from "react";
import { useSelector } from "react-redux";
import constant from "../constant";
import convertToUnicode from "../utils";

/**
 * How a bani's name is displayed, and in which face.
 *
 * ONE implementation. This is the rule the home bani list has always used
 * (`BaniList.getBaniTuk`); My Pothi grew a second, shorter copy of it that
 * skipped the transliteration branch entirely, so the same bani appeared in
 * Gurmukhi inside a pothi while the list behind it showed Latin. Anything that
 * renders a bani name reads this instead of re-deriving it.
 *
 * The order matters: transliteration WINS. It is an explicit user choice about
 * the script they read in, so it is checked before the Gurmukhi font question
 * is asked at all.
 *
 * `titleFontFamily` comes back with it because the two cannot be decided apart
 * — Gurmukhi text needs the bani face, and transliterated Latin must NOT get
 * it. Returning the string alone is what let callers draw Gurmukhi in the UI
 * font.
 */
const useBaniTitle = () => {
  const fontFace = useSelector((state) => state.fontFace);
  const isTransliteration = useSelector((state) => state.isTransliteration);
  const isUnicode = fontFace === constant.BALOO_PAAJI;

  const titleFor = useCallback(
    (bani) => {
      if (!bani) return "";
      if (isTransliteration) return bani.translit;
      if (isUnicode) return bani.gurmukhiUni || convertToUnicode(bani.gurmukhi);
      return bani.gurmukhi;
    },
    [isTransliteration, isUnicode]
  );

  return {
    titleFor,
    /** Null under transliteration — that is Latin, and the UI font is right. */
    titleFontFamily: isTransliteration ? null : fontFace,
    isTransliteration,
  };
};

export default useBaniTitle;
