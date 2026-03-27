/**
 * Bundled lyrics — keyed by the full Azure Blob URL that the audio manifest
 * passes as `lyricsUrl`. Metro inlines each JSON at build time, so fetching
 * lyrics requires zero network requests and zero disk I/O at runtime.
 *
 * To add a new track: download the JSON from Azure, drop it in the matching
 * artist sub-folder here, and add an entry below.
 */

const BUNDLED_LYRICS = {
  // ── Bhai Jarnail Singh ────────────────────────────────────────────────────
  "https://banidb.blob.core.windows.net/audios/BhaiJarnailSingh/japji-sahib.json":
    require("./BhaiJarnailSingh/japji-sahib.json"),

  "https://banidb.blob.core.windows.net/audios/BhaiJarnailSingh/jaap-sahib.json":
    require("./BhaiJarnailSingh/jaap-sahib.json"),

  "https://banidb.blob.core.windows.net/audios/BhaiJarnailSingh/saviye.json":
    require("./BhaiJarnailSingh/saviye.json"),

  "https://banidb.blob.core.windows.net/audios/BhaiJarnailSingh/chopai-sahib.json":
    require("./BhaiJarnailSingh/chopai-sahib.json"),

  "https://banidb.blob.core.windows.net/audios/BhaiJarnailSingh/anand-sahib.json":
    require("./BhaiJarnailSingh/anand-sahib.json"),

  "https://banidb.blob.core.windows.net/audios/BhaiJarnailSingh/Rehras-sahib.json":
    require("./BhaiJarnailSingh/Rehras-sahib.json"),

  "https://banidb.blob.core.windows.net/audios/BhaiJarnailSingh/kirtan-sohaila.json":
    require("./BhaiJarnailSingh/kirtan-sohaila.json"),

  // ── Indermohan Kaur UK ───────────────────────────────────────────────────
  "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/JapjiSahib.json":
    require("./IndermohanKaurUK/JapjiSahib.json"),

  "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/JaapSahib.json":
    require("./IndermohanKaurUK/JaapSahib.json"),

  "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/TavParsadSwayiye.json":
    require("./IndermohanKaurUK/TavParsadSwayiye.json"),

  "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/ChaupaiSahib.json":
    require("./IndermohanKaurUK/ChaupaiSahib.json"),

  "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/AnandSahib.json":
    require("./IndermohanKaurUK/AnandSahib.json"),

  "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/RehrasSahib.json":
    require("./IndermohanKaurUK/RehrasSahib.json"),

  "https://banidb.blob.core.windows.net/audios/IndermohanKaurUK/KirtanSohaila.json":
    require("./IndermohanKaurUK/KirtanSohaila.json"),

  // ── Giani Gurdev Singh ───────────────────────────────────────────────────
  // JSONs confirmed on Azure blob. No MP3s yet — entries are ready so sync-scroll
  // works the moment his audio tracks go live, with zero further code changes.
  "https://banidb.blob.core.windows.net/audios/GianiGurdevSingh/JapjiSahib.json":
    require("./GianiGurdevSingh/JapjiSahib.json"),

  "https://banidb.blob.core.windows.net/audios/GianiGurdevSingh/JaapSahib.json":
    require("./GianiGurdevSingh/JaapSahib.json"),

  "https://banidb.blob.core.windows.net/audios/GianiGurdevSingh/AnandSahib.json":
    require("./GianiGurdevSingh/AnandSahib.json"),

  "https://banidb.blob.core.windows.net/audios/GianiGurdevSingh/ChaupaiSahib.json":
    require("./GianiGurdevSingh/ChaupaiSahib.json"),

  "https://banidb.blob.core.windows.net/audios/GianiGurdevSingh/TavParsadSwayiye.json":
    require("./GianiGurdevSingh/TavParsadSwayiye.json"),
};

export default BUNDLED_LYRICS;
