import { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { STRINGS, logError } from "@common";
import { getBaniList } from "@database";

// The DB's Transliterations JSON is lowercase phonetic ("japujee saahib") — there's
// no separate translated/proper-name field for bani titles anywhere in the data
// model. Title-case each word so dashboard chrome shows "Japujee Saahib" rather
// than the raw lowercase form.
export const toTitleCase = (text) =>
  (text || "")
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(" ");

// Resolves bani names by ID for dashboard chrome (reminders, Nitnem grid, etc.).
// Unlike the Reader's "show transliteration" toggle, this always follows the
// interface language: Punjabi UI shows Gurmukhi, every other language shows the
// Roman transliteration — so an English UI never surfaces Punjabi bani names.
// Used so dashboard sections never show raw legacy-ASCII titles (e.g. "jpujl swihb").
const useBaniLookup = () => {
  const transliterationLanguage = useSelector((state) => state.transliterationLanguage);
  const baniListRedux = useSelector((state) => state.baniList);
  const [map, setMap] = useState({});

  useEffect(() => {
    let active = true;
    // The Redux-cached baniList (from orderedBani) groups some banis (e.g.
    // "Amrit Baani", "Bhagat Baani") under a parent { folder: [...] } entry
    // instead of a flat top-level id — those nested banis were never reaching
    // the map, so nameOf() missed them entirely and every caller fell back to
    // raw, un-language-aware transliteration for any bani inside a folder.
    const build = (list) => {
      const m = {};
      const addEntry = (b) => {
        if (b?.id !== undefined) m[b.id] = b;
      };
      list.forEach((b) => {
        if (Array.isArray(b.folder)) {
          b.folder.forEach(addEntry);
        } else {
          addEntry(b);
        }
      });
      if (active) setMap(m);
    };
    if (baniListRedux?.length) {
      build(baniListRedux);
    } else {
      getBaniList(transliterationLanguage).then(build).catch(logError);
    }
    return () => {
      active = false;
    };
  }, [baniListRedux, transliterationLanguage]);

  const nameOf = useCallback(
    (idOrBani) => {
      const b = typeof idOrBani === "object" && idOrBani !== null ? idOrBani : map[idOrBani];
      if (!b) return null;
      const isPunjabiUI = STRINGS.getLanguage() === "pa";
      // Gurmukhi is already properly cased; only the Roman transliteration needs it.
      if (isPunjabiUI) return b.gurmukhiUni || toTitleCase(b.translit);
      return (b.translit && toTitleCase(b.translit)) || b.gurmukhiUni;
    },
    [map]
  );

  return { map, nameOf };
};

export default useBaniLookup;
