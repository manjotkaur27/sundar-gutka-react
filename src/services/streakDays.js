import { constant } from "@common";

// Day-boundary helpers for the streak engine. Kept in their own module rather
// than inline in streakEngine.js so the Dashboard's week strip can adopt the
// same definitions — both surfaces render from the same `daily_activity` rows
// and have to agree on where a day starts, or the big streak number and the
// gold check marks end up disagreeing on the same card.

// YYYY-MM-DD in the device's LOCAL timezone. Deliberately not toISOString(),
// which is UTC and would roll the day over at the wrong moment for anyone not
// on GMT — useReadingSession/useListeningSession key `daily_activity` on the
// local day, so reads have to match how the writes were keyed.
export const getLocalDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

// Shifts a YYYY-MM-DD key by whole days and returns the new key.
//
// Goes through the local-time Date constructor rather than adding milliseconds:
// the constructor normalizes out-of-range day numbers for us (month rollover,
// year rollover, leap days), and because it works in local time it stays
// correct across a DST transition, where a calendar day is 23 or 25 hours
// rather than 24.
export const shiftDate = (ymd, deltaDays) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return getLocalDate(new Date(y, m - 1, d + deltaDays));
};

// The one definition of "this day counts". Every surface that draws a day as
// active — the streak number, the week strip, both calendars — must agree with
// the SQL in getQualifyingDates, so they all route through here rather than
// re-implementing the comparison. Reading and listening are POOLED: the day is
// active once their sum clears the bar, not when either does alone.
export const dayQualifies = (row) =>
  !!row &&
  (row.reading_seconds ?? 0) + (row.listening_seconds ?? 0) >= constant.MIN_DAILY_ACTIVE_SECONDS;
