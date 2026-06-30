// Deep-import the ESM build directly (same reason as nanakshahiDate.js: Metro 0.78
// doesn't enable package "exports", so a bare import would resolve the IIFE build).
// eslint-disable-next-line import/extensions, import/no-unresolved
import { findMovableGurpurab as libFindMovableGurpurab } from "nanakshahi/dist/index.js";
import { constant, logError } from "@common";
import { isOnline, OfflineError } from "./connectivity";
import { readFreshCache, writeCache } from "./dailyCache";

// Backend feed cache (per local day — the event list is stable, and daysAway is
// computed relative to "today", so a same-day cache is always correct).
const CACHE_KEY = "@upcoming_events_cache_v1";

// Sikh Gurpurabs / historical days for the Discover "Upcoming" card.
//
// Fixed-date (solar) Nanakshahi gurpurabs recur on the same Gregorian date each
// year and are listed below. The lunar/movable ones (Guru Nanak Parkash, Bandi
// Chhor/Diwali, Holla Mohalla, and the bhagat birthdays) drift year to year, so
// those are computed from the official nanakshahi library instead of hardcoded.
const GURPURABS = [
  { name: "Parkash Parv Guru Gobind Singh", month: 1, day: 5 },
  { name: "Birth Baba Deep Singh Ji Shaheed", month: 1, day: 26 },
  { name: "Birth Sahibzada Baba Ajit Singh Ji", month: 2, day: 11 },
  { name: "Prakash Sri Guru Har Rai Sahib Ji", month: 2, day: 14 },
  { name: "Nanakshahi New Year", month: 3, day: 14 },
  { name: "Shaheedi Sardar Bhagat Singh", month: 3, day: 23 },
  { name: "Gurgaddi Sri Guru Har Rai Sahib Ji", month: 3, day: 30 },
  { name: "Gurgaddi Guru Amar Das Ji", month: 4, day: 2 },
  { name: "Joti Jot Sri Guru Angad Dev Ji", month: 4, day: 5 },
  { name: "Joti Jot Sri Guru Hargobind Sahib Ji", month: 4, day: 6 },
  { name: "Birth Sahibzada Baba Jujhar Singh Ji", month: 4, day: 9 },
  { name: "Khalsa Sajna Diwas - Vaisakhi", month: 4, day: 14 },
  { name: "Joti Jot Guru Harkrishan Sahib Ji", month: 4, day: 14 },
  { name: "Gurgaddi Guru Tegh Bahadur Sahib", month: 4, day: 14 },
  { name: "Parkash Sri Guru Angad Dev Ji", month: 4, day: 18 },
  { name: "Parkash Guru Tegh Bahadur Sahib Ji", month: 4, day: 21 },
  { name: "Birth Bhagat Dhana Ji", month: 4, day: 21 },
  { name: "Joti Jot Baba Gurditta Ji", month: 4, day: 22 },
  { name: "Parkash Shri Guru Arjan Dev Ji", month: 4, day: 23 },
  { name: "Birth Shaheed Bhai Mani Singh Ji", month: 4, day: 24 },
  { name: "Parkash Shri Guru Amar Das Sahib Ji", month: 4, day: 30 },
  { name: "Sirhind Fateh Diwas", month: 5, day: 12 },
  { name: "Gurgaddi Sri Guru Hargobind Sahib Ji", month: 6, day: 8 },
  { name: "Parkash Shri Guru Hargobind Sahib", month: 6, day: 15 },
  { name: "Shaheedi Guru Arjan Dev Ji", month: 6, day: 18 },
  { name: "Shaheedi Baba Banda Singh Ji Bahadur", month: 6, day: 25 },
  { name: "Prakash Sri Guru Hargobind Sahib Ji", month: 6, day: 30 },
  { name: "Historical Miri Piri Divas", month: 7, day: 9 },
  { name: "Shaheedi Bhai Taru Singh Ji", month: 7, day: 16 },
  { name: "Parkash Guru Harkrishan Sahib Ji", month: 7, day: 22 },
  { name: "First Parkash of Guru Granth Sahib", month: 8, day: 28 },
  { name: "Gurgaddi Guru Arjan Dev Ji", month: 8, day: 29 },
  { name: "Sampuranta Divas Sri Guru Granth Sahib Ji", month: 8, day: 30 },
  { name: "Joti Jot Guru Ramdas Ji", month: 8, day: 30 },
  { name: "Gurgaddi Guru Ramdas Sahib", month: 9, day: 8 },
  { name: "Joti Jot Sri Guru Amar Das Ji", month: 9, day: 10 },
  { name: "Gurgaddi Guru Angad Dev Ji", month: 9, day: 15 },
  { name: "Joti Jot Guru Nanak Sahib", month: 9, day: 20 },
  { name: "Birth Sardar Shaheed Bhagat Singh", month: 9, day: 28 },
  { name: "Parkash Guru Ramdas Sahib", month: 10, day: 11 },
  { name: "Joti Jot Guru Har Rai Sahib", month: 10, day: 19 },
  { name: "Gurgaddi Guru Harkrishan Sahib", month: 10, day: 19 },
  { name: "Birth Baba Budha Ji", month: 10, day: 23 },
  { name: "Joti Jot Guru Gobind Singh Sahib", month: 10, day: 29 },
  { name: "Shaheedi Baba Deep Singh Ji", month: 11, day: 15 },
  { name: "Shaheedi Guru Tegh Bahadur Sahib", month: 11, day: 28 },
  { name: "Birth Sahibzada Baba Zorawar Singh Ji", month: 11, day: 30 },
  { name: "Gurgaddi Guru Gobind Singh Sahib", month: 12, day: 6 },
  { name: "Birth Sahibzada Baba Fateh Singh Ji", month: 12, day: 14 },
  { name: "Birth Baba Atal Rai Ji", month: 12, day: 22 },
  { name: "Shaheedi Sahibzada Baba Ajit Singh Ji", month: 12, day: 23 },
  { name: "Shaheedi Sahibzada Baba Jujhar Singh Ji", month: 12, day: 23 },
  { name: "Shaheedi Sahibzada Baba Jorawar Singh Ji", month: 12, day: 28 },
  { name: "Shaheedi Sahibzada Baba Fateh Singh Ji", month: 12, day: 28 },
];

// Movable (lunar) gurpurabs the nanakshahi library can resolve to an exact
// Gregorian date for a given year.
const MOVABLE_KEYS = ["gurunanak", "bandichhorr", "holla", "ravidaas", "kabeer", "naamdev"];

const startOfToday = () => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
};

const daysAwayFrom = (month, day) => {
  const today = startOfToday();
  let target = new Date(today.getFullYear(), month - 1, day);
  if (target < today) target = new Date(today.getFullYear() + 1, month - 1, day);
  return Math.round((target - today) / 86400000);
};

const daysAwayFromDate = (d) => {
  const today = startOfToday();
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((target - today) / 86400000);
};

// Computes each movable gurpurab's next future occurrence by checking this year
// and next year (the library appends "(year)" to names, which we strip).
const movableEvents = () => {
  const today = startOfToday();
  const years = [today.getFullYear(), today.getFullYear() + 1];
  const out = [];
  MOVABLE_KEYS.forEach((key) => {
    years.forEach((yr) => {
      try {
        const r = libFindMovableGurpurab(key, yr);
        const daysAway = daysAwayFromDate(r.gregorianDate);
        if (daysAway >= 0 && daysAway <= 366) {
          out.push({
            name: r.gurpurab.en.replace(/\s*\(\d{4}\)\s*$/, ""),
            subtitle: "",
            daysAway,
            _source: "nanakshahi",
          });
        }
      } catch (_) {
        // Year outside the library's supported range — skip this occurrence.
      }
    });
  });
  // Keep only the nearest occurrence per event name.
  const nearest = {};
  out.forEach((e) => {
    if (!nearest[e.name] || e.daysAway < nearest[e.name].daysAway) nearest[e.name] = e;
  });
  return Object.values(nearest);
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

// Parse "YYYY-MM-DD" (ignoring any time part) as a device-local date so the
// day boundary matches what the user sees, not UTC.
const parseIsoLocal = (str) => {
  const parts = String(str).slice(0, 10).split("-");
  if (parts.length !== 3) return null;
  const [y, mo, d] = parts.map(Number);
  if (!y || !mo || !d) return null;
  return new Date(y, mo - 1, d);
};

// Maps the backend feed → the app's event shape. Accepts `{ events: [...] }` or a
// bare array. Each entry needs a `name` plus EITHER an explicit `date`
// ("YYYY-MM-DD", for movable/one-off days you feed per year) OR a recurring
// `month` + `day` (for fixed solar gurpurabs — feed once, recurs every year).
const parseApiEvents = (data) => {
  let list = null;
  if (Array.isArray(data)) list = data;
  else if (Array.isArray(data?.events)) list = data.events;
  if (!list) return null;
  const out = [];
  list.forEach((e) => {
    if (!e || !e.name) return;
    let daysAway = null;
    if (e.date) {
      const d = parseIsoLocal(e.date);
      const da = d ? daysAwayFromDate(d) : null;
      if (da != null && da >= 0) daysAway = da; // drop explicit dates already past
    } else if (e.month && e.day) {
      daysAway = daysAwayFrom(Number(e.month), Number(e.day)); // recurring
    }
    if (daysAway == null) return;
    out.push({ name: e.name, subtitle: e.subtitle ?? "", daysAway, _source: "api" });
  });
  return out.length ? out.sort((a, b) => a.daysAway - b.daysAway) : null;
};

// Bundled local computation — always available. Fixed gurpurabs recur yearly;
// movable ones come from the nanakshahi lib. Used offline or until the backend
// feed is deployed.
const computeLocalEvents = () => {
  const fixed = GURPURABS.map((e) => ({
    name: e.name,
    subtitle: e.subtitle ?? "",
    daysAway: daysAwayFrom(e.month, e.day),
    _source: "list",
  }));
  let movable = [];
  try {
    movable = movableEvents();
  } catch (err) {
    logError(new Error(`movable gurpurabs failed: ${err?.message || err}`));
  }
  return [...fixed, ...movable].sort((a, b) => a.daysAway - b.daysAway);
};

export const getUpcomingEvents = async ({ requireOnline = false } = {}) => {
  // 1. Today's cached feed → use it (offline-safe, refreshes daily).
  const cached = await readFreshCache(CACHE_KEY);
  if (cached) return cached;

  // 2. Backend feed (the yearly list maintained server-side), when configured.
  //    On any failure (incl. the endpoint not being deployed yet) we silently fall
  //    through to the bundled local computation, so the card always shows events.
  const url = constant.UPCOMING_EVENTS_API_URL;
  if (url) {
    try {
      const parsed = parseApiEvents(await fetchJson(url));
      if (parsed) {
        writeCache(CACHE_KEY, parsed);
        return parsed;
      }
    } catch (err) {
      logError(new Error(`upcoming events feed failed, using local: ${err?.message || err}`));
    }
  }

  // 3. requireOnline callers (rare) get an offline signal instead of the local list.
  if (requireOnline && !(await isOnline())) throw new OfflineError();

  // 4. Local fallback.
  return computeLocalEvents();
};

// Convenience: the single nearest upcoming event (for the compact Discover card).
export const getNextEvent = async (opts) => {
  const events = await getUpcomingEvents(opts);
  return events[0] ?? null;
};

export default getUpcomingEvents;
