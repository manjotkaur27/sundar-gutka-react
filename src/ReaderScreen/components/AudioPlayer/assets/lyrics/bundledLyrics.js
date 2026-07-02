  /**
 * Bundled lyrics — keyed by the host-independent "Artist/file.json" path (the
 * last two segments of the lyrics URL). Keying on the path, not the full URL,
 * means the bundle keeps working no matter which host serves assets (blob, CDN,
 * or a future custom domain). Metro inlines each JSON at build time, so fetching
 * lyrics requires zero network requests and zero disk I/O at runtime.
 *
 * To add a new track: drop the JSON in the matching artist sub-folder here and
 * add an entry below keyed by "Artist/file.json". Look it up via
 * getBundledLyrics()/hasBundledLyrics(), never by raw URL.
 */

const BUNDLED_LYRICS = {
  // ── Bhai Jarnail Singh ────────────────────────────────────────────────────
  "BhaiJarnailSingh/japji-sahib.json":
    require("./BhaiJarnailSingh/japji-sahib.json"),

  "BhaiJarnailSingh/jaap-sahib.json":
    require("./BhaiJarnailSingh/jaap-sahib.json"),

  "BhaiJarnailSingh/saviye.json":
    require("./BhaiJarnailSingh/saviye.json"),

  // Chaupai Sahib — XL (Buddha Dal): full recording incl. all closing sections
  "BhaiJarnailSingh/chopai-sahib.json":
    require("./BhaiJarnailSingh/chopai-sahib.json"),

  // // Chaupai Sahib — Short/Medium/Long: trimmed to seq 146 (੪੦੧), timestamps rebased to 0
  // "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/BhaiJarnailSingh/chopai-sahib-short.json":
  //   require("./BhaiJarnailSingh/chopai-sahib-short.json"),

  "BhaiJarnailSingh/anand-sahib.json":
    require("./BhaiJarnailSingh/anand-sahib.json"),

  "BhaiJarnailSingh/anand-sahib-6-pauri.json":
    require("./BhaiJarnailSingh/anand-sahib-6-pauri.json"),

  // "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/BhaiJarnailSingh/Rehras-sahib.json":
  //   require("./BhaiJarnailSingh/Rehras-sahib.json"),

  // Rehras Sahib — trimmed: leading intro removed, timestamps rebased to 0
  "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/BhaiJarnailSingh/Rehras-sahib-trimmed.json":
    require("./BhaiJarnailSingh/Rehras-sahib-trimmed.json"),

  // "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/BhaiJarnailSingh/Rehras-sahib-medium.json":
  //   require("./BhaiJarnailSingh/Rehras-sahib-medium.json"),

  // "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/BhaiJarnailSingh/Rehras-sahib-short.json":
  //   require("./BhaiJarnailSingh/Rehras-sahib-short.json"),

  // "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/BhaiJarnailSingh/kirtan-sohaila.json":
  //   require("./BhaiJarnailSingh/kirtan-sohaila.json"),

  // Kirtan Sohaila — trimmed: 7s of leading silence removed, timestamps rebased to 0
  "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/BhaiJarnailSingh/kirtan-sohaila-trimmed.json":
    require("./BhaiJarnailSingh/kirtan-sohaila-trimmed.json"),

  // "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/BhaiJarnailSingh/kirtan-sohaila-short.json":
  //   require("./BhaiJarnailSingh/kirtan-sohaila-short.json"),

  // ── Indermohan Kaur UK ───────────────────────────────────────────────────
  "IndermohanKaurUK/JapjiSahib.json":
    require("./IndermohanKaurUK/JapjiSahib.json"),

  "IndermohanKaurUK/JaapSahib.json":
    require("./IndermohanKaurUK/JaapSahib.json"),

  "IndermohanKaurUK/TavParsadSwayiye.json":
    require("./IndermohanKaurUK/TavParsadSwayiye.json"),

  "IndermohanKaurUK/ChaupaiSahib.json":
    require("./IndermohanKaurUK/ChaupaiSahib.json"),

  "IndermohanKaurUK/AnandSahib.json":
    require("./IndermohanKaurUK/AnandSahib.json"),

  "IndermohanKaurUK/AnandSahib-6-pauri.json":
    require("./IndermohanKaurUK/AnandSahib-6-pauri.json"),

  "IndermohanKaurUK/RehrasSahib.json":
    require("./IndermohanKaurUK/RehrasSahib.json"),

  // "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/IndermohanKaurUK/RehrasSahib-medium.json":
  //   require("./IndermohanKaurUK/RehrasSahib-medium.json"),

  // "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/IndermohanKaurUK/RehrasSahib-short.json":
  //   require("./IndermohanKaurUK/RehrasSahib-short.json"),

  "IndermohanKaurUK/KirtanSohaila.json":
    require("./IndermohanKaurUK/KirtanSohaila.json"),

  // ── Giani Gurdev Singh ───────────────────────────────────────────────────
  // M4As + JSONs confirmed on Azure Blob. Sync-scroll ready.
  "GianiGurdevSingh/JapjiSahib.json":
    require("./GianiGurdevSingh/JapjiSahib.json"),

  "GianiGurdevSingh/JaapSahib.json":
    require("./GianiGurdevSingh/JaapSahib.json"),

  "GianiGurdevSingh/AnandSahib.json":
    require("./GianiGurdevSingh/AnandSahib.json"),

  "GianiGurdevSingh/AnandSahib-6-pauri.json":
    require("./GianiGurdevSingh/AnandSahib-6-pauri.json"),

  // Chaupai Sahib — XL (Buddha Dal): full recording incl. all closing sections
  "GianiGurdevSingh/ChaupaiSahib.json":
    require("./GianiGurdevSingh/ChaupaiSahib.json"),

  // // Chaupai Sahib — Short/Medium/Long: trimmed to seq 146 (੪੦੧), timestamps rebased to 0
  // "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/GianiGurdevSingh/ChaupaiSahib-short.json":
  //   require("./GianiGurdevSingh/ChaupaiSahib-short.json"),

  "GianiGurdevSingh/TavParsadSwayiye.json":
    require("./GianiGurdevSingh/TavParsadSwayiye.json"),
};

// Normalize any lyrics reference (full blob/CDN URL or a local file path) to the
// "Artist/file.json" key the bundle is keyed on — the last two path segments.
const bundledKey = (url) => {
  if (!url) return "";
  const parts = String(url).split("?")[0].split("/");
  return parts.slice(-2).join("/");
};

export const getBundledLyrics = (url) => BUNDLED_LYRICS[bundledKey(url)];

export const hasBundledLyrics = (url) =>
  Object.prototype.hasOwnProperty.call(BUNDLED_LYRICS, bundledKey(url));

export default BUNDLED_LYRICS;
