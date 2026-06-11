import { logError, logMessage } from "@common";
import { getAnalyticsDB } from "./connect";

const runQuery = async (sql, params = []) => {
  try {
    const db = await getAnalyticsDB();
    const [result] = await db.executeSql(sql, params);
    return result;
  } catch (err) {
    logMessage(`analytics_db_write_failed: ${err?.message || err}`);
    logError(new Error(`Analytics query error: ${err?.message || err} | SQL: ${sql}`));
    throw err;
  }
};

const rowsToArray = (result) => {
  const rows = [];
  for (let i = 0; i < result.rows.length; i++) {
    rows.push(result.rows.item(i));
  }
  return rows;
};

// ─── Read sessions ────────────────────────────────────────────────────────────

export const insertReadSession = async ({ bani_id, bani_title, start_time, end_time, duration_seconds, completed }) => {
  return runQuery(
    `INSERT INTO bani_read_history (bani_id, bani_title, start_time, end_time, duration_seconds, completed)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [bani_id, bani_title ?? null, start_time, end_time, duration_seconds, completed ? 1 : 0]
  );
};

export const getUnsyncedReadSessions = async () => {
  const result = await runQuery(
    `SELECT * FROM bani_read_history WHERE sync_status = 0 LIMIT 100`
  );
  return rowsToArray(result);
};

export const getTopReadBanis = async (limit = 5) => {
  const result = await runQuery(
    `SELECT bani_id, bani_title,
            COUNT(*) as session_count,
            SUM(duration_seconds) as total_seconds
     FROM bani_read_history
     GROUP BY bani_id
     ORDER BY total_seconds DESC
     LIMIT ?`,
    [limit]
  );
  return rowsToArray(result);
};

export const getRecentReadBanis = async (limit = 5) => {
  const result = await runQuery(
    `SELECT bani_id, bani_title, start_time as last_time, duration_seconds as total_seconds
     FROM bani_read_history
     ORDER BY start_time DESC
     LIMIT ?`,
    [limit]
  );
  return rowsToArray(result);
};

// ─── Audio sessions ───────────────────────────────────────────────────────────

export const insertAudioSession = async ({ audio_id, bani_id, bani_title, artist_id, artist_name, duration_played, completed }) => {
  return runQuery(
    `INSERT INTO audio_history (audio_id, bani_id, bani_title, artist_id, artist_name, duration_played, completed)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [audio_id ?? null, bani_id, bani_title ?? null, artist_id ?? null, artist_name ?? null, duration_played, completed ? 1 : 0]
  );
};

export const getUnsyncedAudioSessions = async () => {
  const result = await runQuery(
    `SELECT * FROM audio_history WHERE sync_status = 0 LIMIT 100`
  );
  return rowsToArray(result);
};

export const getTopListenedBanis = async (limit = 5) => {
  const result = await runQuery(
    `SELECT bani_id, bani_title,
            MAX(artist_id) as artist_id,
            MAX(artist_name) as artist_name,
            COUNT(*) as session_count,
            SUM(duration_played) as total_seconds
     FROM audio_history
     GROUP BY bani_id
     ORDER BY total_seconds DESC
     LIMIT ?`,
    [limit]
  );
  return rowsToArray(result);
};

export const getRecentListenedBanis = async (limit = 5) => {
  const result = await runQuery(
    `SELECT bani_id, bani_title, artist_name, created_at as last_time, duration_played as total_seconds
     FROM audio_history
     ORDER BY created_at DESC
     LIMIT ?`,
    [limit]
  );
  return rowsToArray(result);
};

// ─── Daily activity ───────────────────────────────────────────────────────────

export const upsertDailyActivity = async ({ date, reading_seconds_delta = 0, listening_seconds_delta = 0 }) => {
  return runQuery(
    `INSERT INTO daily_activity (date, reading_seconds, listening_seconds, total_seconds, updated_at)
     VALUES (?, ?, ?, ?, strftime('%s','now'))
     ON CONFLICT(date) DO UPDATE SET
       reading_seconds   = reading_seconds   + excluded.reading_seconds,
       listening_seconds = listening_seconds + excluded.listening_seconds,
       total_seconds     = total_seconds     + excluded.reading_seconds + excluded.listening_seconds,
       updated_at        = strftime('%s','now')`,
    [date, reading_seconds_delta, listening_seconds_delta, reading_seconds_delta + listening_seconds_delta]
  );
};

export const getDayActivity = async (date) => {
  const result = await runQuery(
    `SELECT * FROM daily_activity WHERE date = ? LIMIT 1`,
    [date]
  );
  const rows = rowsToArray(result);
  return rows[0] ?? null;
};

export const getDailyActivity = async (year, month) => {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const result = await runQuery(
    `SELECT * FROM daily_activity WHERE date LIKE ? ORDER BY date ASC`,
    [`${prefix}%`]
  );
  return rowsToArray(result);
};

export const getUnsyncedActivity = async () => {
  const result = await runQuery(
    `SELECT * FROM daily_activity WHERE sync_status = 0 LIMIT 100`
  );
  return rowsToArray(result);
};

// ─── User stats summary ───────────────────────────────────────────────────────

export const getOrCreateSummary = async () => {
  const result = await runQuery(`SELECT * FROM user_stats_summary WHERE id = 1`);
  const rows = rowsToArray(result);
  return rows[0] ?? null;
};

export const updateSummary = async (fields) => {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const setClauses = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => fields[k]);
  return runQuery(
    `UPDATE user_stats_summary SET ${setClauses}, updated_at = strftime('%s','now') WHERE id = 1`,
    values
  );
};

// ─── Computed totals (live from raw tables) ───────────────────────────────────

export const getReadingListeningTotals = async () => {
  const result = await runQuery(
    `SELECT
      COALESCE((SELECT SUM(duration_seconds) FROM bani_read_history), 0) AS total_reading_seconds,
      COALESCE((SELECT SUM(duration_played)  FROM audio_history),        0) AS total_listening_seconds`
  );
  const rows = rowsToArray(result);
  return rows[0] ?? { total_reading_seconds: 0, total_listening_seconds: 0 };
};

// ─── Privacy ──────────────────────────────────────────────────────────────────

export const clearAllAnalyticsData = async () => {
  await runQuery("DELETE FROM bani_read_history");
  await runQuery("DELETE FROM audio_history");
  await runQuery("DELETE FROM daily_activity");
  await runQuery(
    `UPDATE user_stats_summary SET
      current_streak=0, longest_streak=0, total_days_active=0,
      total_reading_seconds=0, total_listening_seconds=0,
      total_banis_read=0, total_audio_sessions=0,
      last_active_date=NULL,
      updated_at=strftime('%s','now')
     WHERE id=1`
  );
};

// ─── Day detail ──────────────────────────────────────────────────────────────

export const getDayDetail = async (dateStr) => {
  const [readResult, listenResult] = await Promise.all([
    // start_time is stored as Date.now() → milliseconds; divide by 1000 for 'unixepoch'
    runQuery(
      `SELECT bani_id, bani_title, SUM(duration_seconds) as duration
       FROM bani_read_history
       WHERE date(start_time / 1000, 'unixepoch', 'localtime') = ?
       GROUP BY bani_id
       ORDER BY duration DESC`,
      [dateStr]
    ),
    // created_at is strftime('%s','now') → seconds; no division needed
    runQuery(
      `SELECT bani_id, bani_title, SUM(duration_played) as duration
       FROM audio_history
       WHERE date(created_at, 'unixepoch', 'localtime') = ?
       GROUP BY bani_id
       ORDER BY duration DESC`,
      [dateStr]
    ),
  ]);
  return {
    reads: rowsToArray(readResult),
    listens: rowsToArray(listenResult),
  };
};

// ─── Per-bani read counter ────────────────────────────────────────────────────

export const incrementBaniReadCount = async (baniId, baniTitle) => {
  if (!baniId) return;
  const today = new Date().toISOString().slice(0, 10);
  return runQuery(
    `INSERT INTO bani_read_counts (bani_id, bani_title, read_count, last_read)
     VALUES (?, ?, 1, ?)
     ON CONFLICT(bani_id) DO UPDATE SET
       read_count = read_count + 1,
       bani_title = excluded.bani_title,
       last_read  = excluded.last_read`,
    [baniId, baniTitle ?? null, today]
  );
};

export const getBaniReadCount = async (baniId) => {
  const result = await runQuery(
    `SELECT read_count FROM bani_read_counts WHERE bani_id = ? LIMIT 1`,
    [baniId]
  );
  const rows = rowsToArray(result);
  return rows[0]?.read_count ?? 0;
};

export const getAllBaniReadCounts = async () => {
  const result = await runQuery(
    `SELECT bani_id, bani_title, read_count, last_read
     FROM bani_read_counts
     ORDER BY read_count DESC`
  );
  return rowsToArray(result);
};

// ─── Sync helpers ─────────────────────────────────────────────────────────────

export const markSynced = async (table, ids) => {
  if (!ids || ids.length === 0) return;
  const placeholders = ids.map(() => "?").join(",");
  return runQuery(
    `UPDATE ${table} SET sync_status = 1 WHERE id IN (${placeholders})`,
    ids
  );
};
