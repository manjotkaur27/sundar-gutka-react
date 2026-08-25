import constant from "@common/constant";
import { baseFontSize, logError, logMessage } from "@common";
import htmlTemplate from "./gutkahtml";
import script from "./gutkaScript";

// Everything below is fixed for the life of the module and used once per DIV —
// a long bani emits thousands of them, and these were all being rebuilt inside
// that loop. Nothing here changes what is emitted; it is the same values,
// computed once instead of per line.
//
// `constant` is imported from its own module rather than the @common barrel for
// exactly this reason: the barrel reaches back to this file, so at module-scope
// time its `constant` is still undefined and reading it here would throw while
// the app was still starting up — see moduleLoad.test.js.
const GURMUKHI_LC = constant.GURMUKHI.toLowerCase();
const TRANSLITERATION_LC = constant.TRANSLITERATION.toLowerCase();
const TRANSLATION_LC = constant.TRANSLATION.toLowerCase();
// The reverse of the `.toUpperCase()` each div used to do on its own type.
const TYPE_TO_ROLE = {
  [GURMUKHI_LC]: constant.GURMUKHI,
  [TRANSLITERATION_LC]: constant.TRANSLITERATION,
  [TRANSLATION_LC]: constant.TRANSLATION,
};
// Header 1 is the only Gurmukhi level with a colour of its own. Kept as a
// lookup rather than `header === 1` so a header arriving as a string keys
// exactly as it did when this was an object literal built per call.
const GURMUKHI_HEADING_LEVELS = { 1: true };
const TEXT_ALIGN_BY_HEADER = { 0: "left", 1: "center", 2: "center" };

// `readerTheme` is a resolved READING-theme record (src/theme/reader), not the
// app theme. The light and dark records are derived from the app's own palette,
// so "Follow app theme" resolves to exactly the roles this used to read
// directly — `c.textBrand` for headings and transliteration, `c.textPrimary`
// for everything else.
export const fontColorForReader = (header, readerTheme, text) => {
  const { GURMUKHI, TRANSLATION, TRANSLITERATION } = constant;

  // Header level 1 uses the theme's heading colour. Everything else uses its
  // body Gurbani colour; header 2/6 are deliberately regular (not the heading
  // colour), and so is any other level.
  //
  // This used to build two objects and two closures on every call, for a value
  // that is one of three colours. Branching instead allocates nothing, and each
  // branch keeps the `|| defaultColor` the map lookup ended with — so a theme
  // that leaves a slot empty still falls back exactly as it did.
  const defaultColor = readerTheme.text.gurbani.color;

  if (text === GURMUKHI) {
    if (GURMUKHI_HEADING_LEVELS[header]) {
      return readerTheme.text.gurbaniHeading.color || defaultColor;
    }
    return defaultColor;
  }
  // Their own slots, so a theme can separate translation from body Gurbani.
  if (text === TRANSLITERATION) return readerTheme.text.transliteration.color || defaultColor;
  if (text === TRANSLATION) return readerTheme.text.translation.color || defaultColor;
  return defaultColor;
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
  const fontClass = type === GURMUKHI_LC || punjabiTranslation !== "" ? GURMUKHI_LC : type;
  // Optional per-theme text treatment. Emitted ONLY when the theme sets it, so
  // the light/dark records — which set none of it — produce byte-identical
  // markup to the Reader's original. The shadow applies to Gurmukhi alone; on a
  // translation line it would just blur the reading.
  const { lineHeightRatio, letterSpacing } = readerTheme.typography;
  const gurbaniSlot = header === 1 ? readerTheme.text.gurbaniHeading : readerTheme.text.gurbani;
  const shadow = type === GURMUKHI_LC ? gurbaniSlot.shadow : null;
  // Concatenated rather than built as an array and joined: same string, one
  // fewer array per div, and a long bani emits thousands of them.
  let extraStyle = "";
  if (lineHeightRatio) extraStyle += `line-height: ${lineHeightRatio};`;
  if (letterSpacing) extraStyle += `letter-spacing: ${letterSpacing}px;`;
  if (shadow) extraStyle += `text-shadow: ${shadow};`;
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
    type === TRANSLITERATION_LC || type === TRANSLATION_LC,
    readerTheme.typography.fontScale
  )}px; font-size: var(--fs); font-family: ${fontFace}; color: ${fontColorForReader(
    header,
    readerTheme,
    // The role this type maps to. `type.toUpperCase()` built a throwaway string
    // per div for one of three known constants.
    TYPE_TO_ROLE[type] || type.toUpperCase()
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
        let textAlign = TEXT_ALIGN_BY_HEADER[item.header];
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
          GURMUKHI_LC,
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
            TRANSLITERATION_LC,
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
            TRANSLATION_LC,
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
            TRANSLATION_LC,
            textAlign,
            fontSize,
            readerTheme,
            isLarivaar,
            GURMUKHI_LC,
            constant.GURBANI_AKHAR_TRUE
          );
        }

        if (isSpanishTranslation) {
          contentHtml += createDiv(
            item.spanishTranslations,
            item.header,
            TRANSLATION_LC,
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
