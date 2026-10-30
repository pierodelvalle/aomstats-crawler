import Database from 'better-sqlite3';
import { ELO_DEFAULT } from '../config/eloConfig.js';

// Open or create DB
const db = new Database('./db.sqlite');

db.exec("PRAGMA foreign_keys = ON");

// Create table (adjust columns as needed)
db.exec(`
    CREATE TABLE IF NOT EXISTS matches
    (
        match_id          INTEGER PRIMARY KEY,
        description       TEXT,
        startgametime     INTEGER,
        mapname           TEXT,
        duration          INTEGER,
        replay_file       TEXT,
        team_match_id     TEXT,
        team_god_match_id TEXT
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS players
    (
        profile_id INTEGER PRIMARY KEY,
        name       TEXT
    )`
);

// Profile data refreshed from aomstats.io (services/ProfileService.js)
const PLAYER_PROFILE_COLUMNS = {
  alias: 'TEXT',
  avatar_link: 'TEXT',
  country: 'TEXT',
  ranked_1v1: 'INTEGER',
  ranked_1v1_peak: 'INTEGER',
  ranked_team: 'INTEGER',
  ranked_team_peak: 'INTEGER',
  profile_updated: 'INTEGER',
};

const existingPlayerColumns = db.prepare('PRAGMA table_info(players)').all().map(c => c.name);
for (const [column, type] of Object.entries(PLAYER_PROFILE_COLUMNS)) {
  if (!existingPlayerColumns.includes(column)) {
    db.exec(`ALTER TABLE players ADD COLUMN ${column} ${type}`);
  }
}

db.exec(`
    CREATE TABLE IF NOT EXISTS player_matches
    (
        match_id   INTEGER,
        profile_id INTEGER,
        god        TEXT,
        win        INTEGER,
        team       INTEGER,
        PRIMARY KEY (match_id, profile_id),
        FOREIGN KEY (match_id) REFERENCES matches(match_id),
        FOREIGN KEY (profile_id) REFERENCES players(profile_id)
    )
`);

// Per-player stats parsed from the match replay (services/ReplayService.js).
// top_units / top_myth_units / top_buildings / top_god_powers are JSON arrays of { name, count }.
db.exec(`
    CREATE TABLE IF NOT EXISTS player_match_stats
    (
        match_id            INTEGER,
        profile_id          INTEGER,
        minor_classical     TEXT,
        minor_heroic        TEXT,
        minor_mythic        TEXT,
        classical_secs      INTEGER,
        heroic_secs         INTEGER,
        mythic_secs         INTEGER,
        eapm                INTEGER,
        titan               INTEGER,
        wonder              INTEGER,
        top_units           TEXT,
        top_myth_units      TEXT,
        top_buildings       TEXT,
        top_god_powers      TEXT,
        build_number        INTEGER,
        PRIMARY KEY (match_id, profile_id),
        FOREIGN KEY (match_id, profile_id) REFERENCES player_matches(match_id, profile_id)
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS player_elo
    (
        profile_id   INTEGER,
        scope_type   TEXT,
        scope_key    TEXT NOT NULL DEFAULT '',
        elo          REAL DEFAULT ${ELO_DEFAULT},
        last_updated INTEGER,
        PRIMARY KEY (profile_id, scope_type, scope_key),
        FOREIGN KEY (profile_id) REFERENCES players(profile_id)
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS player_elo_meta
    (
        meta_key   TEXT,
        meta_value TEXT,
        scope      TEXT,
        PRIMARY KEY (meta_key, scope)
    );
`);

db.exec(
  `CREATE TABLE IF NOT EXISTS player_elo_history
   (
       id         INTEGER PRIMARY KEY AUTOINCREMENT,
       profile_id INTEGER NOT NULL,
       match_id   INTEGER NOT NULL,
       scope_type TEXT    NOT NULL,
       scope_key  TEXT     DEFAULT '',
       old_elo    REAL    NOT NULL,
       new_elo    REAL    NOT NULL,
       delta      REAL    NOT NULL,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

       UNIQUE (profile_id, match_id, scope_type, scope_key)
   );`
)

db.exec(`
    CREATE TABLE IF NOT EXISTS tournaments
    (
        tournament_id INTEGER PRIMARY KEY,
        name          TEXT,
        is_open       INTEGER
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS tournament_matches
    (
        tournament_id INTEGER,
        match_id      INTEGER,
        FOREIGN KEY (tournament_id) REFERENCES tournaments (tournament_id),
        PRIMARY KEY (tournament_id, match_id)
    )
`)

// "Habemus quorum" session requests: one per day, players mark the range they can play.
// window_start / window_end and start_time / end_time are Unix seconds.
db.exec(`
    CREATE TABLE IF NOT EXISTS quorum_sessions
    (
        date         TEXT PRIMARY KEY,
        window_start INTEGER NOT NULL,
        window_end   INTEGER NOT NULL,
        created_at   INTEGER NOT NULL
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS quorum_availability
    (
        date       TEXT,
        profile_id INTEGER,
        start_time INTEGER NOT NULL,
        end_time   INTEGER NOT NULL,
        any_time   INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (date, profile_id),
        FOREIGN KEY (date) REFERENCES quorum_sessions(date),
        FOREIGN KEY (profile_id) REFERENCES players(profile_id)
    )
`);

// any_time: the player is in for the day without a specific range (start/end span the whole window).
const quorumAvailabilityColumns = db.prepare('PRAGMA table_info(quorum_availability)').all().map(c => c.name);
if (!quorumAvailabilityColumns.includes('any_time')) {
  db.exec('ALTER TABLE quorum_availability ADD COLUMN any_time INTEGER NOT NULL DEFAULT 0');
}

export {
  db,
};