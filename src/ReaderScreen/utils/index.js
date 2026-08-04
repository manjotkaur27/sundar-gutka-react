import { constant, baseFontSize, logError, logMessage } from "@common";
import htmlTemplate from "./gutkahtml";
import script from "./gutkaScript";

export const fontColorForReader = (header, theme, text) => {
  const { GURMUKHI, TRANSLATION, TRANSLITERATION } = constant;

  // Header level 1 (and all transliteration) use the accent blue. Everything
  // else uses the regular primary text color; header 2/6 are deliberately
  // regular (not blue).
  //
  // `textBrand`, not a pair of hex literals: it is the app's one blue, so the
  // Reader matches the rest of the app instead of carrying its own two shades.
  const getHeaderColor1 = () => theme.c.textBrand;
  const getHeaderColor2 = () => theme.colors.primaryText;

  const defaultColor = getHeaderColor2();
  const gurmukhiMapping = {
    1: getHeaderColor1(),
    2: defaultColor,
    6: defaultColor,
    default: defaultColor,
  };

  const colorMapping = {
    [GURMUKHI]: gurmukhiMapping,
    [TRANSLITERATION]: getHeaderColor1(),
    [TRANSLATION]: defaultColor,
  };

  const color = colorMapping[text];
  if (typeof color === "object") {
    return color[header] || color.default;
  }
  return color || defaultColor;
};

export const fontSizeForReader = (fontSizeString, headerLevel, hasTransliteration) => {
  const SCALE_FACTOR = 0.9;
  const fontSize = baseFontSize(fontSizeString, hasTransliteration) * SCALE_FACTOR;
  switch (headerLevel) {
    case 6:
      return fontSize * 0.75;
    case 2:
      return fontSize * 1.1;
    case 1:
      return fontSize * 1.2;
    default:
      return fontSize;
  }
};

export const createDiv = (
  content,
  header,
  type,
  textAlign,
  fontSize,
  theme,
  isLarivaar,
  punjabiTranslation = "",
  fontFace = null
) => {
  const fontClass =
    type === constant.GURMUKHI.toLowerCase() || punjabiTranslation !== ""
      ? constant.GURMUKHI.toLowerCase()
      : type;
  // data-type carries the semantic role: the Punjabi translation div shares the
  // gurmukhi CSS CLASS (for its font), so class alone can't identify the main
  // Gurmukhi line — the sync-scroll enlargement targets [data-type="gurmukhi"].
  // The size is baked as the --fs custom property (font-size: var(--fs)) so the
  // .sync-enlarged CSS rule can derive the enlarged size as calc(var(--fs) * scale)
  // without any JS px bookkeeping.
  return `
    <div class="content-item ${fontClass} ${textAlign}" data-type="${type}" style="--fs: ${fontSizeForReader(
    fontSize,
    header,
    type === constant.TRANSLITERATION.toLowerCase() || type === constant.TRANSLATION.toLowerCase()
  )}px; font-size: var(--fs); font-family: ${fontFace}; color: ${fontColorForReader(
    header,
    theme,
    type.toUpperCase()
  )};">
      ${content}
    </div>
  `;
};

export const loadHTML = (
  shabad,
  isTransliteration,
  fontSize,
  fontFace,
  isEnglishTranslation,
  isPunjabiTranslation,
  isSpanishTranslation,
  theme,
  isLarivaar
) => {
  try {
    const isDarkMode = theme.mode === "dark";
    const backColor = isDarkMode ? "rgba(18, 18, 18, 1)" : "#FFFFFF";
    const content = shabad
      .map((item) => {
        const textAlignMap = {
          0: "left",
          1: "center",
          2: "center",
        };

        let textAlign = textAlignMap[item.header];
        if (textAlign === undefined) {
          textAlign = "right";
        }
        // Use pipe delimiters for easy CSS selector matching
        const paragraphId = item.sequences ? item.sequences[0] : item.sequence;
        const sequencesData = item.sequences
          ? ` data-sequences='|${item.sequences.join("|")}|'`
          : "";
        const sequenceData = ` data-sequence='${paragraphId}'`;
        let contentHtml = `<div id="${item.id}" class='text-item'${sequenceData}${sequencesData}>`;
        contentHtml += createDiv(
          fontFace === constant.BALOO_PAAJI ? item.gurmukhiUni : item.gurmukhi,
          item.header,
          constant.GURMUKHI.toLowerCase(),
          textAlign,
          fontSize,
          theme,
          isLarivaar,
          "",
          fontFace
        );

        if (isTransliteration) {
          contentHtml += createDiv(
            item.translit,
            item.header,
            constant.TRANSLITERATION.toLowerCase(),
            textAlign,
            fontSize,
            theme,
            isLarivaar
          );
        }

        if (isEnglishTranslation) {
          contentHtml += createDiv(
            item.englishTranslations,
            item.header,
            constant.TRANSLATION.toLowerCase(),
            textAlign,
            fontSize,
            theme,
            isLarivaar
          );
        }

        if (isPunjabiTranslation) {
          contentHtml += createDiv(
            item.punjabiTranslations,
            item.header,
            constant.TRANSLATION.toLowerCase(),
            textAlign,
            fontSize,
            theme,
            isLarivaar,
            constant.GURMUKHI.toLowerCase(),
            constant.GURBANI_AKHAR_TRUE
          );
        }

        if (isSpanishTranslation) {
          contentHtml += createDiv(
            item.spanishTranslations,
            item.header,
            constant.TRANSLATION.toLowerCase(),
            textAlign,
            fontSize,
            theme,
            isLarivaar
          );
        }

        contentHtml += `</div>`;
        return contentHtml;
      })
      .join("");
    const htmlContent = htmlTemplate(backColor, fontFace, content, theme);
    return htmlContent;
  } catch (error) {
    logError(error);
    logMessage("loadHTML: Failed to load HTML");
    throw new Error(error);
  }
};
export { script, htmlTemplate };
