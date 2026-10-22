// Stores player_match_stats from replays parsed by replay-server, e.g. to backfill from
// players' local recordings. The replay files are left in place.
//
// Usage: node scripts/parse_replay.js <replay>... [--store]
//   <replay> is a path to a .mythrec / .mythrec.gz file (uploaded to replay-server),
//   or the filename of a replay already in replays/ (parsed in place by replay-server).
//   Without --store it only reports which match each replay belongs to.
import fs from 'fs';
import path from 'path';
import { ReplayService } from '../services/ReplayService.js';

const args = process.argv.slice(2);
const storeIndex = args.indexOf('--store');
const store = storeIndex >= 0 && Boolean(args.splice(storeIndex, 1));
const replays = args;

if (!replays.length) {
  console.error('Usage: node scripts/parse_replay.js <replay>... [--store]');
  process.exit(1);
}

for (const replay of replays) {
  const isLocalFile = fs.existsSync(replay);
  const name = path.basename(replay).replace(/.mythrec(.gz)?$/i, '');

  try {
    const parsed = isLocalFile
      ? await ReplayService.parseReplayFile(replay)
      : await ReplayService.parseSavedReplay(replay);
    const summary = ReplayService.summarize(parsed);

    const endedAt = isLocalFile ? Math.floor(fs.statSync(replay).mtimeMs / 1000) : null;
    const matchId = ReplayService.getMatchIdFromFilename(replay)
      ?? (endedAt ? ReplayService.findMatch(summary, endedAt) : null);

    const stored = store && matchId ? `, stored ${ReplayService.storeReplayStats(matchId, summary)} players` : '';
    console.log(`${name}: ${summary.mapname}, ${Math.round(summary.recording_secs / 60)} min, match ${matchId ?? 'not found'}${stored}`);
  } catch (err) {
    console.error(`${name}: ${err.message}`);
    process.exitCode = 1;
  }
}
