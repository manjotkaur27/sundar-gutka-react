const BLOB_BASE = "https://banidb.blob.core.windows.net/audios";

const jarnailArtist = { display_name: "Bhai Jarnail Singh Ji", artist_id: 4 };
const indermohanArtist = { display_name: "Indermohan Kaur UK", artist_id: 8 };
// gurdevArtist intentionally excluded until MP3s are uploaded.

const dummyArtists = [jarnailArtist, indermohanArtist];

const dummyData = {
  // ── Bani 2: Japji Sahib ──────────────────────────────────────────────────
  2: [
    {
      bani_id: 2,
      track_id: 1002,
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/japji-sahib.mp3`,
      track_length_seconds: 0,
      track_size_mb: "18.61",
      artist_name: jarnailArtist.display_name,
      artist_id: jarnailArtist.artist_id,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/japji-sahib.json`,
    },
    {
      bani_id: 2,
      track_id: 2002,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/JapjiSahib.mp3`,
      track_length_seconds: 0,
      track_size_mb: "44.11",
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
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/jaap-sahib.mp3`,
      track_length_seconds: 0,
      track_size_mb: "19.91",
      artist_name: jarnailArtist.display_name,
      artist_id: jarnailArtist.artist_id,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/jaap-sahib.json`,
    },
    {
      bani_id: 4,
      track_id: 2004,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/JaapSahib.mp3`,
      track_length_seconds: 0,
      track_size_mb: "44.61",
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
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/saviye.mp3`,
      track_length_seconds: 0,
      track_size_mb: "4.08",
      artist_name: jarnailArtist.display_name,
      artist_id: jarnailArtist.artist_id,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/saviye.json`,
    },
    {
      bani_id: 6,
      track_id: 2006,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/TavParsadSwayiye.mp3`,
      track_length_seconds: 0,
      track_size_mb: "8.69",
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
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/chopai-sahib.mp3`,
      track_length_seconds: 0,
      track_size_mb: "6.22",
      artist_name: jarnailArtist.display_name,
      artist_id: jarnailArtist.artist_id,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/chopai-sahib.json`,
    },
    {
      bani_id: 9,
      track_id: 2009,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/ChaupaiSahib.mp3`,
      track_length_seconds: 0,
      track_size_mb: "10.24",
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
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/anand-sahib.mp3`,
      track_length_seconds: 0,
      track_size_mb: "15.71",
      artist_name: jarnailArtist.display_name,
      artist_id: jarnailArtist.artist_id,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/anand-sahib.json`,
    },
    {
      bani_id: 10,
      track_id: 2010,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/AnandSahib.mp3`,
      track_length_seconds: 0,
      track_size_mb: "33.14",
      artist_name: indermohanArtist.display_name,
      artist_id: indermohanArtist.artist_id,
      lyrics_url: `${BLOB_BASE}/IndermohanKaurUK/AnandSahib.json`,
    },
  ],

  // ── Bani 21: Rehras Sahib ────────────────────────────────────────────────
  21: [
    {
      bani_id: 21,
      track_id: 1021,
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/Rehras-sahib.mp3`,
      track_length_seconds: 0,
      track_size_mb: "11.28",
      artist_name: jarnailArtist.display_name,
      artist_id: jarnailArtist.artist_id,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/Rehras-sahib.json`,
    },
    {
      bani_id: 21,
      track_id: 2021,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/RehrasSahib.mp3`,
      track_length_seconds: 0,
      track_size_mb: "43.67",
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
      track_url: `${BLOB_BASE}/BhaiJarnailSingh/kirtan-sohaila.mp3`,
      track_length_seconds: 0,
      track_size_mb: "2.76",
      artist_name: jarnailArtist.display_name,
      artist_id: jarnailArtist.artist_id,
      lyrics_url: `${BLOB_BASE}/BhaiJarnailSingh/kirtan-sohaila.json`,
    },
    {
      bani_id: 23,
      track_id: 2023,
      track_url: `${BLOB_BASE}/IndermohanKaurUK/KirtanSohaila.mp3`,
      track_length_seconds: 0,
      track_size_mb: "9.11",
      artist_name: indermohanArtist.display_name,
      artist_id: indermohanArtist.artist_id,
      lyrics_url: `${BLOB_BASE}/IndermohanKaurUK/KirtanSohaila.json`,
    },
  ],
};

export { dummyData, dummyArtists };
