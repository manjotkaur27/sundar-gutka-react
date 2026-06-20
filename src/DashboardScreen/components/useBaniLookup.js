import { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { logError } from "@common";
import { getBaniList } from "@database";

// Resolves bani names by ID and renders them per the app's display settings
// (mirrors BaniList.getBaniTuk: transliteration → translit, else Gurmukhi unicode).
// Used so dashboard sections never show raw legacy-ASCII titles (e.g. "jpujl swihb").
const useBaniLookup = () => {
  const isTransliteration = useSelector((state) => state.isTransliteration);
  const transliterationLanguage = useSelector((state) => state.transliterationLanguage);
  const baniListRedux = useSelector((state) => state.baniList);
  const [map, setMap] = useState({});

  useEffect(() => {
    let active = true;
    const build = (list) => {
      const m = {};
      list.forEach((b) => {
        m[b.id] = b;
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
      return isTransliteration ? b.translit || b.gurmukhiUni : b.gurmukhiUni || b.translit;
    },
    [map, isTransliteration]
  );

  return { map, nameOf };
};

export default useBaniLookup;
