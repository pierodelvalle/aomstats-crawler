import Database from 'better-sqlite3';
import path from 'path';
import '../database/index.js';

const dbPath = path.resolve(import.meta.dirname, '..', 'db.sqlite');
const db = new Database(dbPath);

db.exec(`DELETE FROM player_elo_meta`);

db.exec(`
    INSERT INTO player_elo_meta
        (meta_key, meta_value, scope)
    VALUES ('last_processed_match', 0, 'global'),
           ('last_processed_match', 0, 'god')
`);

db.exec(`DELETE FROM player_elo`);
db.exec(`DELETE FROM player_elo_history`);