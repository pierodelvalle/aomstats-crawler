// Saves the filename of every replay in replays/ to its match's replay_file,
// The match id is taken from the filename ("<YYYY-MM-DD>-<match_id>-<map>-<players>.mythrec.gz").
import fs from 'fs';
import path from 'path';
import { db } from '../database/index.js';
import { MatchesRepo } from '../models/matches.js';
import { ReplayService } from '../services/ReplayService.js';

const REPLAYS_DIR = path.join(import.meta.dirname, '..', 'replays');
const REPLAY_FILE = /\.mythrec(\.gz)?$/i;

const Matches = MatchesRepo(db);

if (!fs.existsSync(REPLAYS_DIR)) {
  console.error(`No replays folder at ${REPLAYS_DIR}`);
  process.exit(1);
}

const files = fs.readdirSync(REPLAYS_DIR).filter(f => REPLAY_FILE.test(f));
let linked = 0;

for (const file of files) {
  const matchId = ReplayService.getMatchIdFromFilename(file);

  if (!matchId) {
    console.warn(`Skipping ${file}: no match id in the filename`);
  } else if (Matches.setReplayFile(matchId, file)) {
    linked++;
  } else {
    console.warn(`Skipping ${file}: match ${matchId} is not stored`);
  }
}

console.log(`Linked ${linked} of ${files.length} replays to their match`);
