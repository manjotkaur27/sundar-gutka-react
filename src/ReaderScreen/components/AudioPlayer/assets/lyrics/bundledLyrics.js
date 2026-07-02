  /**
 * Bundled lyrics — keyed by the full CDN URL that the audio manifest passes as
 * `lyricsUrl` (must match constant.AUDIO_BASE_URL). Metro inlines each JSON at
 * build time, so fetching lyrics requires zero network requests and zero disk
 * I/O at runtime.
 *
 * To add a new track: download the JSON from Azure, drop it in the matching
 * artist sub-folder here, and add an entry below.
 */

const BUNDLED_LYRICS = {
  // ── Bhai Jarnail Singh ────────────────────────────────────────────────────
  "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/BhaiJarnailSingh/japji-sahib.json":
    require("./BhaiJarnailSingh/japji-sahib.json"),

  "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/BhaiJarnailSingh/jaap-sahib.json":
    require("./BhaiJarnailSingh/jaap-sahib.json"),

  "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/BhaiJarnailSingh/saviye.json":
    require("./BhaiJarnailSingh/saviye.json"),

  // Chaupai Sahib — XL (Buddha Dal): full recording incl. all closing sections
  "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/BhaiJarnailSingh/chopai-sahib.json":
    require("./BhaiJarnailSingh/chopai-sahib.json"),

  // // Chaupai Sahib — Short/Medium/Long: trimmed to seq 146 (੪੦੧), timestamps rebased to 0
  // "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/BhaiJarnailSingh/chopai-sahib-short.json":
  //   require("./BhaiJarnailSingh/chopai-sahib-short.json"),

  "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/BhaiJarnailSingh/anand-sahib.json":
    require("./BhaiJarnailSingh/anand-sahib.json"),

  "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/BhaiJarnailSingh/anand-sahib-6-pauri.json":
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
  "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/IndermohanKaurUK/JapjiSahib.json":
    require("./IndermohanKaurUK/JapjiSahib.json"),

  "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/IndermohanKaurUK/JaapSahib.json":
    require("./IndermohanKaurUK/JaapSahib.json"),

  "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/IndermohanKaurUK/TavParsadSwayiye.json":
    require("./IndermohanKaurUK/TavParsadSwayiye.json"),

  "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/IndermohanKaurUK/ChaupaiSahib.json":
    require("./IndermohanKaurUK/ChaupaiSahib.json"),

  "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/IndermohanKaurUK/AnandSahib.json":
    require("./IndermohanKaurUK/AnandSahib.json"),

  "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/IndermohanKaurUK/AnandSahib-6-pauri.json":
    require("./IndermohanKaurUK/AnandSahib-6-pauri.json"),

  "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/IndermohanKaurUK/RehrasSahib.json":
    require("./IndermohanKaurUK/RehrasSahib.json"),

  // "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/IndermohanKaurUK/RehrasSahib-medium.json":
  //   require("./IndermohanKaurUK/RehrasSahib-medium.json"),

  // "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/IndermohanKaurUK/RehrasSahib-short.json":
  //   require("./IndermohanKaurUK/RehrasSahib-short.json"),

  "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/IndermohanKaurUK/KirtanSohaila.json":
    require("./IndermohanKaurUK/KirtanSohaila.json"),

  // ── Giani Gurdev Singh ───────────────────────────────────────────────────
  // M4As + JSONs confirmed on Azure Blob. Sync-scroll ready.
  "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/GianiGurdevSingh/JapjiSahib.json":
    require("./GianiGurdevSingh/JapjiSahib.json"),

  "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/GianiGurdevSingh/JaapSahib.json":
    require("./GianiGurdevSingh/JaapSahib.json"),

  "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/GianiGurdevSingh/AnandSahib.json":
    require("./GianiGurdevSingh/AnandSahib.json"),

  "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/GianiGurdevSingh/AnandSahib-6-pauri.json":
    require("./GianiGurdevSingh/AnandSahib-6-pauri.json"),

  // Chaupai Sahib — XL (Buddha Dal): full recording incl. all closing sections
  "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/GianiGurdevSingh/ChaupaiSahib.json":
    require("./GianiGurdevSingh/ChaupaiSahib.json"),

  // // Chaupai Sahib — Short/Medium/Long: trimmed to seq 146 (੪੦੧), timestamps rebased to 0
  // "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/GianiGurdevSingh/ChaupaiSahib-short.json":
  //   require("./GianiGurdevSingh/ChaupaiSahib-short.json"),

  "https://gurbani-audios-c4abhzghhnccd5gj.z01.azurefd.net/audios/GianiGurdevSingh/TavParsadSwayiye.json":
    require("./GianiGurdevSingh/TavParsadSwayiye.json"),
};

export default BUNDLED_LYRICS;
