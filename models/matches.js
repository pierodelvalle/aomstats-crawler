const MatchesRepo = (db) => ({
  insertMany(rows) {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO matches (
        match_id,
        description,
        startgametime,
        mapname,
        duration,
        replay_file,
        team_match_id,
        team_god_match_id
      )
      VALUES (
        @match_id,
        @description,
        @startgametime,
        @mapname,
        @duration,
        @replay_file,
        @team_match_id,
        @team_god_match_id
      )
    `);

    const tx = db.transaction((rows) => {
      for (const row of rows) {
        stmt.run({
          replay_file: null,
          team_match_id: null,
          team_god_match_id: null,
          ...row,
        });
      }
    });

    tx(rows);
  },
  setReplayFile(matchId, replayFile) {
    return db.prepare(`
      UPDATE matches SET replay_file = ? WHERE match_id = ?
    `).run(replayFile, matchId).changes > 0;
  },
  getTopMaps(limit = 10) {
    return db.prepare(`
      SELECT
        COUNT(DISTINCT match_id) AS count,
        mapname
      FROM matches
      WHERE mapname LIKE 'rm_%'
      GROUP BY mapname
      ORDER BY count DESC
      LIMIT ?
    `).all(limit);
  },
  getTopMatchups(limit = 20) {
    return db.prepare(`
      SELECT
        COUNT(DISTINCT match_id) AS count,
        team_match_id
      FROM matches
      GROUP BY team_match_id
      ORDER BY count DESC
      LIMIT ?
    `).all(limit);
  },
  getActivity(after = 0) {
    return db.prepare(`
      SELECT
        m.match_id,
        m.startgametime,
        json_group_array(pm.profile_id) AS players
      FROM matches m
      JOIN player_matches pm ON pm.match_id = m.match_id
      WHERE m.startgametime > ?
      GROUP BY m.match_id
      ORDER BY m.startgametime
    `).all(after);
  },
});

export {
  MatchesRepo,
};