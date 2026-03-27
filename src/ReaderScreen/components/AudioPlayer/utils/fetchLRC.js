// Function to fetch JSON file content

import { readFile } from "react-native-fs";
import { checkIsRemote, extractFilePath } from "./urlHelper";
import BUNDLED_LYRICS from "../assets/lyrics/bundledLyrics";

// Module-level cache: avoids re-fetching the same LRC data when switching back
// to a previously played track in the same session.
const _lrcCache = new Map();

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeLrcRows = (data) => {
  if (!Array.isArray(data)) {
    return data;
  }

  return data
    .map((row, index) => {
      const start = toFiniteNumber(row?.start);
      const end = toFiniteNumber(row?.end);

      if (start == null || end == null) {
        return null;
      }

      const explicitSequence = toFiniteNumber(row?.sequence);
      const textSequence = toFiniteNumber(row?.text);
      const derivedSequence = explicitSequence ?? textSequence ?? index + 1;

      return {
        ...row,
        start,
        end,
        sequence: derivedSequence,
      };
    })
    .filter(Boolean);
};

const fetchLRCData = async (jsonUrl) => {
  if (_lrcCache.has(jsonUrl)) {
    return _lrcCache.get(jsonUrl);
  }

  // Bundled-first: if this URL is shipped with the app, return it immediately
  // — zero network requests, zero disk I/O, works fully offline.
  if (BUNDLED_LYRICS[jsonUrl]) {
    const data = normalizeLrcRows(BUNDLED_LYRICS[jsonUrl]);
    _lrcCache.set(jsonUrl, data);
    return data;
  }

  try {
    const isRemote = checkIsRemote(jsonUrl);
    let data;
    if (isRemote) {
      const response = await fetch(jsonUrl);
      data = await response.json();
    } else {
      const filePath = extractFilePath(jsonUrl);
      data = JSON.parse(await readFile(filePath, "utf8"));
    }
    data = normalizeLrcRows(data);
    _lrcCache.set(jsonUrl, data);
    return data;
  } catch (error) {
    return false;
  }
};

export default fetchLRCData;
