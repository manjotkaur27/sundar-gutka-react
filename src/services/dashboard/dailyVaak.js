import { constant } from "@common";
import { isOnline, OfflineError } from "./connectivity";

// Today's Vaak — the official daily Hukamnama from Sri Darbar Sahib.
// Source: our backend (constant.DAILY_VAAK_API_URL) when configured, else BaniDB
// v2 hukamnamas/today directly.
//
// This is the REAL daily hukamnama, so it is never faked: if it can't be fetched
// (offline or API failure) the function throws and the card shows an offline
// notice rather than presenting placeholder lines as the official vaak.
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

export const getDailyVaak = async ({ requireOnline = false } = {}) => {
  if (requireOnline && !(await isOnline())) {
    throw new OfflineError();
  }
  const data = await fetchJson(vaakUrl());

  // Clean shape from our backend: { lines: [...], translation, ... }.
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

  // Otherwise treat it as a raw BaniDB payload.
  const mapped = fromBaniDb(data);
  if (!mapped) throw new Error("daily vaak unavailable");
  return mapped;
};

export default getDailyVaak;
