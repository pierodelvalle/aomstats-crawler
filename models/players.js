const PlayersRepo = (db) => ({
  getAll() {
    return db.prepare(
      'SELECT profile_id, name FROM players'
    ).all();
  },
  getAllProfiles() {
    return db.prepare(`
      SELECT profile_id, name, alias, avatar_link, country,
             ranked_1v1, ranked_1v1_peak, ranked_team, ranked_team_peak, profile_updated
      FROM players
    `).all();
  },
  updateProfile(row) {
    db.prepare(`
      UPDATE players
      SET alias = @alias,
          avatar_link = @avatar_link,
          country = @country,
          ranked_1v1 = @ranked_1v1,
          ranked_1v1_peak = @ranked_1v1_peak,
          ranked_team = @ranked_team,
          ranked_team_peak = @ranked_team_peak,
          profile_updated = @profile_updated
      WHERE profile_id = @profile_id
    `).run(row);
  },
  insertMany(rows) {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO players (
        profile_id,
        name
      )
      VALUES (
        @profile_id,
        @name
      )
    `);

    const tx = db.transaction((rows) => {
      for (const row of rows) {
        stmt.run(row);
      }
    });

    tx(rows);
  },
});

export {
  PlayersRepo
};