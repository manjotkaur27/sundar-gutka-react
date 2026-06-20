// Deep-import the ESM build directly. Metro 0.78 doesn't enable package "exports"
// by default, so a bare `import 'nanakshahi'` would resolve the IIFE `browser`
// build (no named exports). The dist/index.js path resolves the ESM module.
// eslint-disable-next-line import/extensions, import/no-unresolved
import { getNanakshahiDate as libGetNanakshahiDate } from "nanakshahi/dist/index.js";
import { logError } from "@common";

// Local fallback table (fixed Gregorian month-start dates) used only if the
// library throws — keeps the header from ever crashing.
const FALLBACK_MONTHS = [
  { name: "Chet", gurmukhi: "ਚੇਤ", startMonth: 3, startDay: 14 },
  { name: "Vaisakh", gurmukhi: "ਵੈਸਾਖ", startMonth: 4, startDay: 14 },
  { name: "Jeth", gurmukhi: "ਜੇਠ", startMonth: 5, startDay: 15 },
  { name: "Harh", gurmukhi: "ਹਾੜ", startMonth: 6, startDay: 15 },
  { name: "Sawan", gurmukhi: "ਸਾਵਣ", startMonth: 7, startDay: 16 },
  { name: "Bhadon", gurmukhi: "ਭਾਦੋਂ", startMonth: 8, startDay: 16 },
  { name: "Assu", gurmukhi: "ਅੱਸੂ", startMonth: 9, startDay: 15 },
  { name: "Katak", gurmukhi: "ਕੱਤਕ", startMonth: 10, startDay: 15 },
  { name: "Maghar", gurmukhi: "ਮੱਘਰ", startMonth: 11, startDay: 14 },
  { name: "Poh", gurmukhi: "ਪੋਹ", startMonth: 12, startDay: 14 },
  { name: "Magh", gurmukhi: "ਮਾਘ", startMonth: 1, startDay: 13 },
  { name: "Phagun", gurmukhi: "ਫੱਗਣ", startMonth: 2, startDay: 12 },
];

const localFallback = (date) => {
  const year = date.getFullYear();
  let current = FALLBACK_MONTHS[0];
  let currentStart = null;
  FALLBACK_MONTHS.forEach((m) => {
    const start = new Date(year, m.startMonth - 1, m.startDay);
    if (start <= date && (!currentStart || start > currentStart)) {
      current = m;
      currentStart = start;
    }
  });
  if (!currentStart) {
    current = FALLBACK_MONTHS[9];
    currentStart = new Date(year - 1, 11, current.startDay);
  }
  const day = Math.floor((date - currentStart) / 86400000) + 1;
  const d = day > 0 ? day : 1;
  return {
    day: d,
    monthName: current.name,
    monthGurmukhi: current.gurmukhi,
    label: `${d} ${current.name} (${current.gurmukhi})`,
    labelGurmukhi: `${d} ${current.gurmukhi}`,
    _source: "local",
  };
};

// Returns { day, monthName, monthGurmukhi, year, label, labelGurmukhi } for a
// given JS Date (default: today), using the official nanakshahi library.
export const getNanakshahiDate = (date = new Date()) => {
  try {
    const r = libGetNanakshahiDate(date);
    const eng = r.englishDate;
    const pa = r.punjabiDate;
    return {
      day: eng.date,
      monthName: eng.monthName,
      monthGurmukhi: pa.monthName,
      year: eng.year,
      dayName: eng.day,
      dayNameGurmukhi: pa.day,
      // e.g. "4 Harh (ਹਾੜ)"
      label: `${eng.date} ${eng.monthName} (${pa.monthName})`,
      // e.g. "੪ ਹਾੜ ੫੫੮"
      labelGurmukhi: `${pa.date} ${pa.monthName} ${pa.year}`,
      _source: "nanakshahi",
    };
  } catch (err) {
    logError(new Error(`getNanakshahiDate failed, using fallback: ${err?.message || err}`));
    return localFallback(date);
  }
};

export default getNanakshahiDate;
