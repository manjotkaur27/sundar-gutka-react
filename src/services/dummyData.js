const BLOB_BASE = "https://banidb.blob.core.windows.net/audios";

const jarnailArtist = { display_name: "Bhai Jarnail Singh", artist_id: 4 };
const indermohanArtist = { display_name: "Bibi Indermohan Kaur", artist_id: 8 };
const gurdevArtist = { display_name: "Giani Gurdev Singh", artist_id: 9 };

const dummyArtists = [jarnailArtist, indermohanArtist, gurdevArtist];

const dummyData = {
  // ── Bani 2: Japji Sahib ──────────────────────────────────────────────────
  2: [
    {
      bani_id: 2,
      track_id: 1002,
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/JapjiSahib.m4a`,
      track_length_seconds: 981,
      track_size_mb: "15.23",
      artist_name: jarnailArtist.display_name,
      artist_id: jarnailArtist.artist_id,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/japji-sahib.json`,
    },
    {
      bani_id: 2,
      track_id: 2002,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/JapjiSahib.m4a`,
      track_length_seconds: 1156,
      track_size_mb: "17.94",
      artist_name: indermohanArtist.display_name,
      artist_id: indermohanArtist.artist_id,
      lyrics_url: `${BLOB_BASE}/IndermohanKaurUK/JapjiSahib.json`,
    },
  ],

  // ── Bani 4: Jaap Sahib ───────────────────────────────────────────────────
  4: [
    {
      bani_id: 4,
      track_id: 1004,
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/JaapSahib.m4a`,
      track_length_seconds: 987,
      track_size_mb: "15.36",
      artist_name: jarnailArtist.display_name,
      artist_id: jarnailArtist.artist_id,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/jaap-sahib.json`,
    },
    {
      bani_id: 4,
      track_id: 2004,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/JaapSahib.m4a`,
      track_length_seconds: 1170,
      track_size_mb: "18.18",
      artist_name: indermohanArtist.display_name,
      artist_id: indermohanArtist.artist_id,
      lyrics_url: `${BLOB_BASE}/IndermohanKaurUK/JaapSahib.json`,
    },
  ],

  // ── Bani 6: Tav Parsad Saviye ────────────────────────────────────────────
  6: [
    {
      bani_id: 6,
      track_id: 1006,
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/Saviye.m4a`,
      track_length_seconds: 207,
      track_size_mb: "3.23",
      artist_name: jarnailArtist.display_name,
      artist_id: jarnailArtist.artist_id,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/saviye.json`,
    },
    {
      bani_id: 6,
      track_id: 2006,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/TavParsadSwayiye.m4a`,
      track_length_seconds: 227,
      track_size_mb: "3.52",
      artist_name: indermohanArtist.display_name,
      artist_id: indermohanArtist.artist_id,
      lyrics_url: `${BLOB_BASE}/IndermohanKaurUK/TavParsadSwayiye.json`,
    },
  ],

  // ── Bani 9: Chaupai Sahib ────────────────────────────────────────────────
  9: [
    {
      bani_id: 9,
      track_id: 1009,
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/ChaupaiSahib.m4a`,
      track_length_seconds: 317,
      track_size_mb: "4.95",
      artist_name: jarnailArtist.display_name,
      artist_id: jarnailArtist.artist_id,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/chopai-sahib.json`,
    },
    {
      bani_id: 9,
      track_id: 2009,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/ChaupaiSahib.m4a`,
      track_length_seconds: 268,
      track_size_mb: "4.17",
      artist_name: indermohanArtist.display_name,
      artist_id: indermohanArtist.artist_id,
      lyrics_url: `${BLOB_BASE}/IndermohanKaurUK/ChaupaiSahib.json`,
    },
  ],

  // ── Bani 10: Anand Sahib ─────────────────────────────────────────────────
  10: [
    {
      bani_id: 10,
      track_id: 1010,
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/AnandSahib.m4a`,
      track_length_seconds: 784,
      track_size_mb: "12.18",
      artist_name: jarnailArtist.display_name,
      artist_id: jarnailArtist.artist_id,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/anand-sahib.json`,
    },
    {
      bani_id: 10,
      track_id: 2010,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/AnandSahib.m4a`,
      track_length_seconds: 869,
      track_size_mb: "13.48",
      artist_name: indermohanArtist.display_name,
      artist_id: indermohanArtist.artist_id,
      lyrics_url: `${BLOB_BASE}/IndermohanKaurUK/AnandSahib.json`,
    },
  ],

  // ── Bani 1000: Anand Sahib (6 Pauri) ─────────────────────────────────────
  1000: [
    {
      bani_id: 1000,
      track_id: 11000,
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/AnandSahib-6-pauri.m4a`,
      track_length_seconds: 151,
      track_size_mb: "2.34",
      artist_name: jarnailArtist.display_name,
      artist_id: jarnailArtist.artist_id,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/anand-sahib-6-pauri.json`,
    },
    {
      bani_id: 1000,
      track_id: 21000,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/AnandSahib-6-pauri.m4a`,
      track_length_seconds: 143,
      track_size_mb: "2.19",
      artist_name: indermohanArtist.display_name,
      artist_id: indermohanArtist.artist_id,
      lyrics_url: `${BLOB_BASE}/IndermohanKaurUK/AnandSahib-6-pauri.json`,
    },
    {
      bani_id: 1000,
      track_id: 31000,
      track_url: `${BLOB_BASE}/GianiGurdevSingh/AnandSahib-6-pauri.m4a`,
      track_length_seconds: 183,
      track_size_mb: "2.84",
      artist_name: gurdevArtist.display_name,
      artist_id: gurdevArtist.artist_id,
      lyrics_url: `${BLOB_BASE}/GianiGurdevSingh/AnandSahib-6-pauri.json`,
    },
  ],

  // ── Bani 21: Rehras Sahib ────────────────────────────────────────────────
  21: [
    {
      bani_id: 21,
      track_id: 1021,
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/RehrasSahib.m4a`,
      track_length_seconds: 1335,
      track_size_mb: "20.49",
      artist_name: jarnailArtist.display_name,
      artist_id: jarnailArtist.artist_id,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/Rehras-sahib.json`,
    },
    {
      bani_id: 21,
      track_id: 2021,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/RehrasSahib.m4a`,
      track_length_seconds: 1145,
      track_size_mb: "17.80",
      artist_name: indermohanArtist.display_name,
      artist_id: indermohanArtist.artist_id,
      lyrics_url: `${BLOB_BASE}/IndermohanKaurUK/RehrasSahib.json`,
    },
  ],

  // ── Bani 23: Kirtan Sohila ───────────────────────────────────────────────
  23: [
    {
      bani_id: 23,
      track_id: 1023,
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/KirtanSohaila.m4a`,
      track_length_seconds: 333,
      track_size_mb: "5.03",
      artist_name: jarnailArtist.display_name,
      artist_id: jarnailArtist.artist_id,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/kirtan-sohaila.json`,
    },
    {
      bani_id: 23,
      track_id: 2023,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/KirtanSohaila.m4a`,
      track_length_seconds: 239,
      track_size_mb: "3.71",
      artist_name: indermohanArtist.display_name,
      artist_id: indermohanArtist.artist_id,
      lyrics_url: `${BLOB_BASE}/IndermohanKaurUK/KirtanSohaila.json`,
    },
  ],
};

export { dummyData, dummyArtists };
