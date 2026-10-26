const TOP_COLUMNS = new Set(['top_units', 'top_myth_units', 'top_buildings', 'top_god_powers']);
const MINOR_GOD_COLUMNS = new Set(['minor_classical', 'minor_heroic', 'minor_mythic']);

const PlayerMatchStatsRepo = (db) => ({
  // Rows for players without a player_matches row (not in the group, or match not stored) are skipped.
  insertMany(rows) {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO player_match_stats (
        match_id,
        profile_id,
        minor_classical,
        minor_heroic,
        minor_mythic,
        classical_secs,
        heroic_secs,
        mythic_secs,
        eapm,
        titan,
        wonder,
        top_units,
        top_myth_units,
        top_buildings,
        top_god_powers,
        build_number
      )
      SELECT
        @match_id,
        @profile_id,
        @minor_classical,
        @minor_heroic,
        @minor_mythic,
        @classical_secs,
        @heroic_secs,
        @mythic_secs,
        @eapm,
        @titan,
        @wonder,
        @top_units,
        @top_myth_units,
        @top_buildings,
        @top_god_powers,
        @build_number
      WHERE EXISTS (
        SELECT 1 FROM player_matches WHERE match_id = @match_id AND profile_id = @profile_id
      )
    `);

    const tx = db.transaction((rows) => {
      let inserted = 0;
      for (const row of rows) {
        inserted += stmt.run(row).changes;
      }
      return inserted;
    });

    return tx(rows);
  },
  // The read queries below take { after, god }: matches started after `after`, and only the
  // ones where the player picked major god `god` (all gods when null).
  getAverageEapm(profileId, { after = 0, god = null } = {}) {
    return db.prepare(`
      SELECT
        COUNT(*) AS matches,
        ROUND(AVG(s.eapm)) AS eapm
      FROM player_match_stats s
      JOIN matches m ON m.match_id = s.match_id
      JOIN player_matches pm ON pm.match_id = s.match_id AND pm.profile_id = s.profile_id
      WHERE s.profile_id = @profileId
        AND m.startgametime > @after
        AND (@god IS NULL OR pm.god = @god)
    `).get({ profileId, after, god });
  },
  // Matches and wins per minor god the player picked for an age column
  // (minor_classical, minor_heroic, minor_mythic), most picked first.
  getMinorGodStats(profileId, column, { after = 0, god = null } = {}) {
    if (!MINOR_GOD_COLUMNS.has(column)) throw new Error(`Unknown column ${column}`);

    return db.prepare(`
      SELECT
        s.${column} AS name,
        COUNT(*) AS matches,
        SUM(pm.win) AS wins
      FROM player_match_stats s
      JOIN matches m ON m.match_id = s.match_id
      JOIN player_matches pm ON pm.match_id = s.match_id AND pm.profile_id = s.profile_id
      WHERE s.profile_id = @profileId
        AND m.startgametime > @after
        AND (@god IS NULL OR pm.god = @god)
        AND s.${column} IS NOT NULL
      GROUP BY s.${column}
      ORDER BY matches DESC, s.${column}
    `).all({ profileId, after, god });
  },
  // Sums the per-match { name, count } lists of a top_* column, e.g. the player's most trained units.
  getTopCounts(profileId, column, { after = 0, god = null, limit = 3 } = {}) {
    if (!TOP_COLUMNS.has(column)) throw new Error(`Unknown column ${column}`);

    return db.prepare(`
      SELECT
        json_extract(t.value, '$.name') AS name,
        SUM(json_extract(t.value, '$.count')) AS count
      FROM player_match_stats s
      JOIN matches m ON m.match_id = s.match_id
      JOIN player_matches pm ON pm.match_id = s.match_id AND pm.profile_id = s.profile_id,
           json_each(s.${column}) t
      WHERE s.profile_id = @profileId
        AND m.startgametime > @after
        AND (@god IS NULL OR pm.god = @god)
      GROUP BY name
      ORDER BY count DESC
      LIMIT @limit
    `).all({ profileId, after, god, limit });
  },
});

export {
  PlayerMatchStatsRepo,
};
