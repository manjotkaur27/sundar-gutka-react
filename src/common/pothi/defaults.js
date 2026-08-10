import convertToUnicode from "../utils";
import { createPothi, makeBaniItem } from "./model";

// The two pothis every user starts with.
//
// Bani ids are taken from the bundled database's `Banis` table, not from the
// comment block in constant.js — that block documents the Nitnem reminder set,
// which is a different list (it includes Gur Mantar and omits Anand Sahib), and
// trusting it would have put the wrong banis in both pothis.
//
//    2  jpujI swihb            Japji Sahib
//    4  jwpu swihb             Jaap Sahib
//    6  qÍ pRswid sv`Xy        Tav Prasad Savaiye (Sraavag Sudh)
//    9  bynqI cOpeI swihb      Benati Chaupai Sahib
//   10  Anµdu swihb            Anand Sahib
//   21  rhrwis swihb           Rehras Sahib
//   23  soihlw swihb           Kirtan Sohila
//
// Savaiye is 6, not 3 or 5 — Shabad Hazare (3) and Shabad Hazare Patishahi 10
// (5) are two other banis whose similar names make the wrong one easy to grab.
export const MORNING_ID = "default_morning_nitnem";
export const EVENING_ID = "default_evening_nitnem";

export const MORNING_NITNEM_IDS = [2, 4, 6, 9, 10];
export const EVENING_NITNEM_IDS = [21, 23];

/**
 * The default pothis, built against the live bani list so each item carries the
 * real title the API requires.
 *
 * Seeded ONCE, tracked by `seededDefaults` — a user who deletes or renames them
 * must not find them back next launch. Returns an empty array when the bani
 * list has not loaded yet, so the caller retries rather than seeding a pothi
 * full of numeric placeholder titles.
 *
 * @param {Array} baniListData rows from `useBaniList()`.
 * @param {{morning: string, evening: string}} names localised pothi names.
 */
export const buildDefaultPothis = (baniListData, names) => {
  const byId = new Map();
  (baniListData ?? []).forEach((bani) => {
    if (bani?.id != null) byId.set(bani.id, bani);
  });
  const wanted = [...MORNING_NITNEM_IDS, ...EVENING_NITNEM_IDS];
  // All-or-nothing: a partial database would otherwise produce a Morning Nitnem
  // missing Anand Sahib, and `seededDefaults` would stop it ever being fixed.
  if (wanted.some((id) => !byId.has(id))) return [];

  const itemsFor = (ids) =>
    ids.map((id) => {
      const bani = byId.get(id);
      return makeBaniItem({
        baaniId: id,
        // The Unicode name — the ASCII one renders as mojibake under Baloo, and
        // the API stores this verbatim for every client that reads it back.
        // Converted when the table has no Unicode column, as the list does.
        title: bani.gurmukhiUni || convertToUnicode(bani.gurmukhi),
      });
    });

  // FIXED ids, not minted ones. addPothi de-duplicates by id, so if this ever
  // runs twice the second run replaces the pair instead of appending a copy —
  // which is exactly the bug a random id per call produced.
  return [
    createPothi({ id: MORNING_ID, name: names.morning, items: itemsFor(MORNING_NITNEM_IDS) }),
    createPothi({ id: EVENING_ID, name: names.evening, items: itemsFor(EVENING_NITNEM_IDS) }),
  ];
};

export default buildDefaultPothis;
