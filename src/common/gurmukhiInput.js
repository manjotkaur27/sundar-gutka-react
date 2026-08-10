// Gurmukhi input rules.
//
// The layout comes from `simple-keyboard-layouts` (MIT) — the standard InScript
// Punjabi arrangement, the same one Android and iOS use, so anyone who already
// types Punjabi recognises it. That package ships DATA only; its renderer is
// DOM-based, so the keys are drawn by our own component.
//
// A layout alone is not enough. Nothing in it stops a dependent sign being typed
// where there is no letter to attach to, which is how "ਅਨੀਾਾਿਿੀੁੁ" happened —
// vowel signs stacked on vowel signs with no base. These are the rules that make
// the field only accept writable Punjabi.
//
// Ranges are from the Unicode Gurmukhi block (U+0A00–U+0A7F).

/** Consonants, including the nukta-composed set (ਲ਼ ਸ਼ ਖ਼ ਗ਼ ਜ਼ ੜ ਫ਼). */
const CONSONANT = /[ਕ-ਹਖ਼-ਫ਼]/;
/** Independent vowels and Ura/Aira/Iri, which can start a syllable. */
const VOWEL_LETTER = /[ਅ-ਔੲੳ]/;
/** Dependent vowel signs (matras) — must attach to something. */
const MATRA = /[ਾ-ੌ]/;
/** Halant/virama — joins two consonants. */
const VIRAMA = "੍";
/** Bindi, tippi, addhak: nasal and gemination marks. */
const NASAL_OR_ADDHAK = /[ਁਂੰੱ]/;
/** Nukta — modifies the consonant before it. */
const NUKTA = "਼";

const isBase = (ch) => Boolean(ch) && (CONSONANT.test(ch) || VOWEL_LETTER.test(ch));

/**
 * Whether `next` may follow `text`.
 *
 * Independent letters, digits, spaces and punctuation are always allowed; the
 * rules only constrain the marks that have no meaning on their own.
 *
 * @param {string} text  what is already typed
 * @param {string} next  the single character being added
 * @returns {boolean}
 */
export const canAppend = (text, next) => {
  const prev = text.slice(-1);
  const beforePrev = text.slice(-2, -1);

  // A matra needs a letter, or a consonant already carrying a nukta/virama.
  if (MATRA.test(next)) {
    if (MATRA.test(prev)) return false; // no stacking two vowel signs
    if (prev === NUKTA || prev === VIRAMA) return isBase(beforePrev);
    return isBase(prev);
  }

  // Virama joins consonants; it is meaningless after a vowel sign or nothing.
  if (next === VIRAMA) {
    return CONSONANT.test(prev) || (prev === NUKTA && CONSONANT.test(beforePrev));
  }

  // Nukta modifies the consonant immediately before it, and never doubles.
  if (next === NUKTA) return CONSONANT.test(prev);

  // A nasal mark or addhak attaches to a letter or a completed matra, and does
  // not repeat.
  if (NASAL_OR_ADDHAK.test(next)) {
    if (NASAL_OR_ADDHAK.test(prev)) return false;
    return isBase(prev) || MATRA.test(prev);
  }

  return true;
};

/**
 * Appends `next` if the rules allow it, otherwise returns `text` unchanged.
 * The caller can compare identity to know whether the key was rejected.
 */
export const appendGurmukhi = (text, next) => (canAppend(text, next) ? text + next : text);

/** Strips any character that could not legally have been typed, left to right. */
export const sanitizeGurmukhi = (text) =>
  [...String(text ?? "")].reduce((acc, ch) => appendGurmukhi(acc, ch), "");

export default appendGurmukhi;
