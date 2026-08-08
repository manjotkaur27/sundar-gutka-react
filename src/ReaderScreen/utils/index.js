import { constant, baseFontSize, logError, logMessage } from "@common";
import htmlTemplate from "./gutkahtml";
import script from "./gutkaScript";

// `readerTheme` is a resolved READING-theme record (src/theme/reader), not the
// app theme. The light and dark records are derived from the app's own palette,
// so "Follow app theme" resolves to exactly the roles this used to read
// directly — `c.textBrand` for headings and transliteration, `c.textPrimary`
// for everything else.
export const fontColorForReader = (header, readerTheme, text) => {
  const { GURMUKHI, TRANSLATION, TRANSLITERATION } = constant;

  // Header level 1 (and all transliteration) use the theme's heading colour.
  // Everything else uses its body Gurbani colour; header 2/6 are deliberately
  // regular (not the heading colour).
  const getHeaderColor1 = () => readerTheme.text.gurbaniHeading.color;
  const getHeaderColor2 = () => readerTheme.text.gurbani.color;

  const defaultColor = getHeaderColor2();
  const gurmukhiMapping = {
    1: getHeaderColor1(),
    2: defaultColor,
    6: defaultColor,
    default: defaultColor,
  };

  const colorMapping = {
    [GURMUKHI]: gurmukhiMapping,
    // Their own slots now, so a theme can separate translation from body
    // Gurbani. The two bases point both at the same roles as before.
    [TRANSLITERATION]: readerTheme.text.transliteration.color,
    [TRANSLATION]: readerTheme.text.translation.color,
  };

  const color = colorMapping[text];
  if (typeof color === "object") {
    return color[header] || color.default;
  }
  return color || defaultColor;
};

// `themeFontScale` is a MULTIPLIER on the user's font-size setting, never an
// override — a reading theme can offer its own comfortable reading size without
// taking the user's accessibility control away from them.
export const fontSizeForReader = (
  fontSizeString,
  headerLevel,
  hasTransliteration,
  themeFontScale = 1
) => {
  const SCALE_FACTOR = 0.9;
  const fontSize =
    baseFontSize(fontSizeString, hasTransliteration) * SCALE_FACTOR * (themeFontScale || 1);
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
  readerTheme,
  isLarivaar,
  punjabiTranslation = "",
  fontFace = null
) => {
  const fontClass =
    type === constant.GURMUKHI.toLowerCase() || punjabiTranslation !== ""
      ? constant.GURMUKHI.toLowerCase()
      : type;
  // Optional per-theme text treatment. Emitted ONLY when the theme sets it, so
  // the light/dark records — which set none of it — produce byte-identical
  // markup to the Reader's original. The shadow applies to Gurmukhi alone; on a
  // translation line it would just blur the reading.
  const { lineHeightRatio, letterSpacing } = readerTheme.typography;
  const gurbaniSlot =
    header === 1 ? readerTheme.text.gurbaniHeading : readerTheme.text.gurbani;
  const shadow = type === constant.GURMUKHI.toLowerCase() ? gurbaniSlot.shadow : null;
  const extraStyle = [
    lineHeightRatio ? `line-height: ${lineHeightRatio};` : "",
    letterSpacing ? `letter-spacing: ${letterSpacing}px;` : "",
    shadow ? `text-shadow: ${shadow};` : "",
  ].join("");
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
    type === constant.TRANSLITERATION.toLowerCase() || type === constant.TRANSLATION.toLowerCase(),
    readerTheme.typography.fontScale
  )}px; font-size: var(--fs); font-family: ${fontFace}; color: ${fontColorForReader(
    header,
    readerTheme,
    type.toUpperCase()
  )};${extraStyle}">
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
  readerTheme,
  isLarivaar
) => {
  try {
    // The reading theme's ground. Its light/dark records take this from
    // `c.backgroundAlt`, the same role the Reader header and every other screen
    // use — so following the app keeps the page, its chrome and the rest of the
    // app in agreement, exactly as before.
    const backColor = readerTheme.background.color;
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
          readerTheme,
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
            readerTheme,
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
            readerTheme,
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
            readerTheme,
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
            readerTheme,
            isLarivaar
          );
        }

        contentHtml += `</div>`;
        return contentHtml;
      })
      .join("");
    const htmlContent = htmlTemplate(backColor, fontFace, content, readerTheme);
    return htmlContent;
  } catch (error) {
    logError(error);
    logMessage("loadHTML: Failed to load HTML");
    throw new Error(error);
  }
};
export { script, htmlTemplate };
