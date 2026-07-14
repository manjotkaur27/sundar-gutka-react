// Function to fetch JSON file content

import { readFile } from "react-native-fs";
import BUNDLED_LYRICS from "../assets/lyrics/bundledLyrics";
import { checkIsRemote, extractFilePath } from "./urlHelper";

// Module-level cache: avoids re-fetching the same LRC data when switching back
// to a previously played track in the same session.
const lrcCache = new Map();

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
  if (lrcCache.has(jsonUrl)) {
    return lrcCache.get(jsonUrl);
  }

  // Bundled-first: if this URL is shipped with the app, return it immediately
  // — zero network requests, zero disk I/O, works fully offline.
  if (BUNDLED_LYRICS[jsonUrl]) {
    const data = normalizeLrcRows(BUNDLED_LYRICS[jsonUrl]);
    lrcCache.set(jsonUrl, data);
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
    lrcCache.set(jsonUrl, data);
    return data;
  } catch (error) {
    return false;
  }
};

export default fetchLRCData;
