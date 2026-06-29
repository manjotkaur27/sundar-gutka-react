import { constant, logError } from "@common";
import { isOnline, OfflineError } from "./connectivity";

// Word of the Day for the Discover section.
// Source priority:
//   1. A dedicated backend word-of-day endpoint (constant.WORD_OF_DAY_API_URL),
//      when configured.
//   2. Derived from today's REAL Hukamnama (the same source as Today's Vaak): we
//      pick the most prominent word of the opening line and show it with its
//      transliteration and the line's translation as context. Meaning is the
//      line's translation, not a dictionary gloss of the single word — there's
//      no word-level dictionary in the payload, so this is contextual by design.
//   3. A rotating local set (one per day-of-year) when offline or if both fail,
//      so the card is never empty.

// Reuse the vaak's hukamnama source so dev (local backend) and release (BaniDB)
// both work. The clean backend shape exposes { lines, translation }; raw BaniDB
// exposes { shabads:[{ verses:[{ verse, transliteration, translation }] }] }.
const HUKAMNAMA_FALLBACK_URL = "https://api.banidb.com/v2/hukamnamas/today";
const hukamnamaUrl = () => constant.DAILY_VAAK_API_URL || HUKAMNAMA_FALLBACK_URL;

const MOCK_WORDS = [
  { gurmukhi: "ਨਦਰਿ", transliteration: "nadar", meaning: "The glance of grace; divine mercy." },
  { gurmukhi: "ਸਹਜ", transliteration: "sahaj", meaning: "Intuitive peace; natural equilibrium." },
  { gurmukhi: "ਹੁਕਮ", transliteration: "hukam", meaning: "The Divine Order; God's command." },
  { gurmukhi: "ਸੇਵਾ", transliteration: "sevaa", meaning: "Selfless service." },
  { gurmukhi: "ਅਨੰਦ", transliteration: "anand", meaning: "Bliss; spiritual joy." },
];

const mockWord = () => {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((new Date() - start) / 86400000);
  return { ...MOCK_WORDS[dayOfYear % MOCK_WORDS.length], _source: "mock" };
};

const fetchJson = async (url) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
};

// Tolerant mapping for a dedicated backend endpoint: accepts a few common key
// spellings for the word fields.
const mapWord = (d) => {
  if (!d || typeof d !== "object") return null;
  const gurmukhi = d.gurmukhi || d.word || d.unicode || "";
  if (!gurmukhi) return null;
  return {
    gurmukhi,
    transliteration: d.transliteration || d.translit || d.roman || d.english || "",
    meaning: d.meaning || d.definition || d.translation || d.english || "",
    _source: "api",
  };
};

// Tokens that are only a danda (॥ ।) or Gurmukhi digits aren't real words.
const isWordToken = (t) => t && !/^[।॥੦-੯]+$/.test(t);

// Pick the most prominent word of a Gurmukhi line (longest content token — a
// cheap heuristic to skip short connectives/particles), with its aligned
// transliteration token when the line and its transliteration tokenize 1:1.
const pickWord = (gurmukhiLine, transliterationLine) => {
  const gurTokens = (gurmukhiLine || "").trim().split(/\s+/).filter(Boolean);
  const trTokens = (transliterationLine || "").trim().split(/\s+/).filter(Boolean);
  let bestIdx = -1;
  let bestLen = 0;
  gurTokens.forEach((t, i) => {
    if (isWordToken(t) && t.length > bestLen) {
      bestLen = t.length;
      bestIdx = i;
    }
  });
  if (bestIdx < 0) return null;
  const aligned = gurTokens.length === trTokens.length ? trTokens[bestIdx] : "";
  return {
    gurmukhi: gurTokens[bestIdx],
    transliteration: aligned.replace(/[.,;:]+$/, ""),
  };
};

// Derive a word from today's hukamnama, handling both the clean backend shape
// and a raw BaniDB payload.
const deriveFromHukamnama = (data) => {
  // Clean backend shape: { lines:[...], translation }
  if (Array.isArray(data?.lines) && data.lines.length) {
    const picked = pickWord(data.lines[0], "");
    if (!picked) return null;
    return { ...picked, meaning: data.translation ?? "", _source: "hukamnama" };
  }
  // Raw BaniDB shape: { shabads:[{ verses:[...] }] }
  const verse = data?.shabads?.[0]?.verses?.[0];
  if (!verse) return null;
  const translitLine =
    verse?.transliteration?.english || verse?.transliteration?.en || "";
  const picked = pickWord(verse?.verse?.unicode, translitLine);
  if (!picked) return null;
  return { ...picked, meaning: verse?.translation?.en?.bdb ?? "", _source: "hukamnama" };
};

export const getWordOfDay = async ({ requireOnline = false } = {}) => {
  // 1. Dedicated backend endpoint, when configured.
  const url = constant.WORD_OF_DAY_API_URL;
  if (url) {
    try {
      const mapped = mapWord(await fetchJson(url));
      if (mapped) return mapped;
    } catch (err) {
      logError(new Error(`getWordOfDay (api) failed: ${err?.message || err}`));
    }
  }

  // 2. Derive from today's real hukamnama.
  try {
    if (requireOnline && !(await isOnline())) throw new OfflineError();
    const derived = deriveFromHukamnama(await fetchJson(hukamnamaUrl()));
    if (derived) return derived;
  } catch (err) {
    if (err instanceof OfflineError) throw err;
    logError(new Error(`getWordOfDay (hukamnama) failed: ${err?.message || err}`));
  }

  // 3. Local fallback so the card is never empty.
  return mockWord();
};

export default getWordOfDay;
