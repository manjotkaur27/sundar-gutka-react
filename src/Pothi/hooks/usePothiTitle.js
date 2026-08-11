import { useCallback } from "react";
import { useSelector } from "react-redux";
import constant from "@common/constant";
import { convertToUnicode } from "@common";

/**
 * A pothi's display name, and the type face it must be drawn in.
 *
 * ONLY a bundled Sundar Gutka folder needs converting: its name comes from the
 * Banis table as GurbaniAkhar ASCII with no Unicode column, which renders as
 * mojibake ("sv`Xy") under Baloo. That is the same fallback the bani list
 * applies.
 *
 * A user pothi must never go through the converter. Its name is either typed by
 * the user or a localised string (the two default Nitnem pothis), and running a
 * Gurmukhi transliterator over real text mangles it — which is exactly what
 * turned Morning Nitnem into broken Punjabi once before.
 *
 * `variantFor` goes with it because the two cannot be decided apart: the
 * GurbaniAkhar face is right for a bundled folder's ASCII name and wrong for a
 * name somebody typed.
 */
const usePothiTitle = () => {
  const fontFace = useSelector((state) => state.fontFace);
  const isUnicode = fontFace === constant.BALOO_PAAJI;

  const titleFor = useCallback(
    (pothi) => {
      if (!pothi) return "";
      if (pothi.titleUni) return pothi.titleUni;
      return pothi.system && isUnicode ? convertToUnicode(pothi.name) : pothi.name;
    },
    [isUnicode]
  );

  /** The ScreenHeader title variant a pothi's name should be rendered with. */
  const variantFor = useCallback(
    (pothi) => (pothi?.system && !pothi?.titleUni && !isUnicode ? "baniTitle" : "heading"),
    [isUnicode]
  );

  return { titleFor, variantFor };
};

export default usePothiTitle;
