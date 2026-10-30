const QuorumRepo = (db) => ({
  getSession(date) {
    return db.prepare(`
      SELECT date, window_start, window_end, created_at
      FROM quorum_sessions
      WHERE date = ?
    `).get(date);
  },
  createSession(row) {
    db.prepare(`
      INSERT OR IGNORE INTO quorum_sessions (date, window_start, window_end, created_at)
      VALUES (@date, @window_start, @window_end, @created_at)
    `).run(row);
  },
  getAvailability(date) {
    return db.prepare(`
      SELECT profile_id, start_time, end_time, any_time, updated_at
      FROM quorum_availability
      WHERE date = ?
      ORDER BY updated_at
    `).all(date);
  },
  upsertAvailability(row) {
    db.prepare(`
      INSERT INTO quorum_availability (date, profile_id, start_time, end_time, any_time, updated_at)
      VALUES (@date, @profile_id, @start_time, @end_time, @any_time, @updated_at)
      ON CONFLICT (date, profile_id) DO UPDATE SET
        start_time = excluded.start_time,
        end_time = excluded.end_time,
        any_time = excluded.any_time,
        updated_at = excluded.updated_at
    `).run(row);
  },
  deleteSession(date) {
    db.transaction(() => {
      db.prepare('DELETE FROM quorum_availability WHERE date = ?').run(date);
      db.prepare('DELETE FROM quorum_sessions WHERE date = ?').run(date);
    })();
  },
  deleteAvailability(date, profileId) {
    return db.prepare(`
      DELETE FROM quorum_availability WHERE date = ? AND profile_id = ?
    `).run(date, profileId).changes > 0;
  },
});

export {
  QuorumRepo,
};
