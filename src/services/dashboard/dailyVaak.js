import { constant, logError } from "@common";
import { isOnline, OfflineError } from "./connectivity";

// Today's Vaak — the official daily Hukamnama from Sri Darbar Sahib.
// Source: our backend (constant.DAILY_VAAK_API_URL) when configured, else BaniDB
// v2 hukamnamas/today directly. If the configured backend is unreachable (e.g. a
// teammate without the local dev server running) we fall back to BaniDB — it's the
// same real hukamnama, so the "never fake it" guarantee holds.
//
// Only when BOTH sources fail (or offline) does this throw, and the card shows an
// offline notice rather than presenting placeholder lines as the official vaak.
const FALLBACK_URL = "https://api.banidb.com/v2/hukamnamas/today";
const vaakUrl = () => constant.DAILY_VAAK_API_URL || FALLBACK_URL;

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

// Maps a raw BaniDB hukamnama payload ({ shabads: [{ shabadInfo, verses }] }).
const fromBaniDb = (data) => {
  const shabad = data?.shabads?.[0];
  const info = shabad?.shabadInfo ?? {};
  const verses = Array.isArray(shabad?.verses) ? shabad.verses : [];
  const lines = verses
    .slice(0, 2)
    .map((v) => v?.verse?.unicode)
    .filter(Boolean);
  if (!lines.length) return null;
  const trs = verses.map((v) => v?.translation?.en?.bdb).filter((t) => t && t.trim());
  const translation = trs.find((t) => !t.trim().endsWith(":")) || trs[0] || "";
  return {
    lines,
    translation,
    raag: info?.raag?.unicode ?? "",
    ang: info?.pageNo ?? verses[0]?.pageNo ?? null,
    shabadId: info?.shabadId ?? null,
    source: "Sri Darbar Sahib",
    _source: "api",
  };
};

// Accepts either our backend's clean shape ({ lines, translation, ... }) or a raw
// BaniDB payload.
const parseVaak = (data) => {
  if (Array.isArray(data?.lines) && data.lines.length) {
    return {
      lines: data.lines.slice(0, 2),
      translation: data.translation ?? "",
      raag: data.raag ?? "",
      ang: data.ang ?? null,
      shabadId: data.shabadId ?? null,
      source: data.source ?? "Sri Darbar Sahib",
      _source: "api",
    };
  }
  return fromBaniDb(data);
};

export const getDailyVaak = async ({ requireOnline = false } = {}) => {
  if (requireOnline && !(await isOnline())) {
    throw new OfflineError();
  }
  const primary = vaakUrl();
  let data;
  try {
    data = await fetchJson(primary);
  } catch (err) {
    if (primary === FALLBACK_URL) throw err; // already direct → genuine failure
    // Configured backend unreachable → fall back to BaniDB directly.
    logError(new Error(`daily vaak backend failed, using BaniDB: ${err?.message || err}`));
    data = await fetchJson(FALLBACK_URL);
  }

  const mapped = parseVaak(data);
  if (!mapped) throw new Error("daily vaak unavailable");
  return mapped;
};

export default getDailyVaak;
