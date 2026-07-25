import { constant, logError } from "@common";
import { isOnline, OfflineError } from "./connectivity";
import { readFreshCache, writeCache } from "./dailyCache";

// Persist today's vaak so it stays available offline for the same IST day.
// Keyed by the IST date (see istParts) — the official Sri Darbar Sahib Hukamnama
// rolls over at Amritsar (IST) midnight, so the vaak must follow IST, not the
// device timezone. v3: IST-dated fetch + IST cache key + dateLabel.
const CACHE_KEY = "@daily_vaak_cache_v3";

// Current wall-clock date in IST (UTC+5:30, no DST), regardless of device tz.
const istParts = () => {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000; // local → UTC
  const ist = new Date(utcMs + 5.5 * 3600000); // UTC → IST
  return { y: ist.getFullYear(), m: ist.getMonth() + 1, d: ist.getDate(), wd: ist.getDay() };
};
const istDateKey = () => {
  const { y, m, d } = istParts();
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

// Today's Vaak — the official daily Hukamnama from Sri Darbar Sahib, shown exactly
// as on https://www.sikhitothemax.org/hukamnama. SikhiToTheMax is powered by
// BaniDB, so we read BaniDB directly as the source of truth. We request the
// hukamnama for the explicit IST date (not /today, whose meaning depends on the
// caller's clock) so every user worldwide sees the right day's vaak. The
// configured backend is only a secondary fallback if BaniDB is unreachable.
//
// Only when both sources fail (or offline) does this throw, and the card shows an
// offline notice rather than presenting placeholder lines as the official vaak.
const baniDbUrl = () => {
  const { y, m, d } = istParts();
  return `https://api.banidb.com/v2/hukamnamas/${y}/${m}/${d}`;
};
const backendUrl = () => constant.DAILY_VAAK_API_URL || "";

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

// Picks the first meaningful translation (skips title/header verses whose
// translation is just a heading ending in ":", e.g. "Fourth Mehla:").
const pickTranslation = (translations) => {
  const trs = (translations || []).filter((t) => t && t.trim());
  return trs.find((t) => !t.trim().endsWith(":")) || trs[0] || "";
};

// A verse is a real line of the hukamnama (vs. a structural heading like
// "Fourth Mehla:" or "Sorat'h, Fifth Mehla:") when its English translation
// isn't just a heading ending in ":". Mirrors randomShabad.js's
// isMeaningfulVerse — the heading isn't reliably always verse[0], so this
// content-based check replaces the card's old fixed-index slice(1, 3).
const isMeaningfulVerse = (v) => {
  const t = v?.translation?.en?.bdb;
  return typeof t === "string" && t.trim() && !t.trim().endsWith(":");
};

// Maps a raw BaniDB hukamnama payload ({ shabads: [{ shabadInfo, verses }] }).
// Picks the first 2 non-heading verses — the card only ever shows a 2-line
// preview (with a "Read Hukamnama" link out to the full page), so there's no
// need to carry the rest.
const fromBaniDb = (data) => {
  const shabad = data?.shabads?.[0];
  const info = shabad?.shabadInfo ?? {};
  const verses = Array.isArray(shabad?.verses) ? shabad.verses : [];
  const good = verses.filter(isMeaningfulVerse);
  const picked = (good.length ? good : verses).slice(0, 2);
  const lines = picked.map((v) => v?.verse?.unicode).filter(Boolean);
  if (!lines.length) return null;
  return {
    lines,
    translation: pickTranslation(verses.map((v) => v?.translation?.en?.bdb)),
    raag: info?.raag?.unicode ?? "",
    ang: info?.pageNo ?? picked[0]?.pageNo ?? verses[0]?.pageNo ?? null,
    shabadId: info?.shabadId ?? null,
    source: "Sri Darbar Sahib",
    istDate: istDateKey(),
    _source: "banidb",
  };
};

// Accepts our backend's clean shape ({ lines, translation, ... }) or a raw BaniDB
// payload. Used for the secondary backend fallback only.
const parseVaak = (data) => {
  if (Array.isArray(data?.lines) && data.lines.length) {
    return {
      lines: data.lines,
      translation: data.translation ?? "",
      raag: data.raag ?? "",
      ang: data.ang ?? null,
      shabadId: data.shabadId ?? null,
      source: data.source ?? "Sri Darbar Sahib",
      istDate: istDateKey(),
      _source: "api",
    };
  }
  return fromBaniDb(data);
};

export const getDailyVaak = async ({ requireOnline = false } = {}) => {
  const dateKey = istDateKey();

  // 1. Cached vaak for the current IST day → serve it, even offline. The daily
  //    hukamnama is the same all day, so this avoids a refetch and keeps the card
  //    populated when connectivity drops after the first successful load.
  const cached = await readFreshCache(CACHE_KEY, dateKey);
  if (cached) return cached;

  // 2. No fresh cache. If offline, surface it — we never present a previous day's
  //    vaak as today's official hukamnama.
  if (requireOnline && !(await isOnline())) {
    throw new OfflineError();
  }

  // 3. BaniDB first, for the explicit IST date (the exact source the STTM
  //    hukamnama page uses).
  let mapped = null;
  try {
    mapped = fromBaniDb(await fetchJson(baniDbUrl()));
  } catch (err) {
    logError(new Error(`daily vaak BaniDB failed: ${err?.message || err}`));
  }

  // 4. Secondary fallback: the configured backend, only if BaniDB was unreachable.
  if (!mapped && backendUrl()) {
    try {
      mapped = parseVaak(await fetchJson(backendUrl()));
    } catch (err) {
      logError(new Error(`daily vaak backend fallback failed: ${err?.message || err}`));
    }
  }

  if (!mapped) throw new Error("daily vaak unavailable");
  writeCache(CACHE_KEY, mapped, dateKey); // best-effort, fire-and-forget
  return mapped;
};

export default getDailyVaak;
