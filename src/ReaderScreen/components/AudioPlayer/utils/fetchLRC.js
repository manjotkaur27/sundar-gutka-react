// Function to fetch JSON file content

import { readFile } from "react-native-fs";
import { checkIsRemote, extractFilePath } from "./urlHelper";

// Module-level cache: avoids re-fetching the same LRC data when switching back
// to a previously played track in the same session.
const _lrcCache = new Map();

const fetchLRCData = async (jsonUrl) => {
  if (_lrcCache.has(jsonUrl)) {
    return _lrcCache.get(jsonUrl);
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
    _lrcCache.set(jsonUrl, data);
    return data;
  } catch (error) {
    return false;
  }
};

export default fetchLRCData;
