import { constant, logError } from "@common";
import { isOnline, OfflineError } from "./connectivity";

// Word of the Day for the Discover section.
// Source: our backend (constant.WORD_OF_DAY_API_URL) when configured. Falls back
// to a rotating local set (one per day-of-year) if there's no URL or the fetch fails.

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

// Tolerant mapping: accepts a few common key spellings for the word fields.
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

export const getWordOfDay = async ({ requireOnline = false } = {}) => {
  const url = constant.WORD_OF_DAY_API_URL;
  if (!url) {
    if (requireOnline && !(await isOnline())) throw new OfflineError();
    return mockWord();
  }
  try {
    const mapped = mapWord(await fetchJson(url));
    return mapped || mockWord();
  } catch (err) {
    logError(new Error(`getWordOfDay failed: ${err?.message || err}`));
    return mockWord();
  }
};

export default getWordOfDay;
