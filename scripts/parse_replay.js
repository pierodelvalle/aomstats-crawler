// Stores player_match_stats from replays in replays/, parsed in place by replay-server.
// The replay files are left in place.
//
// Usage: node scripts/parse_replay.js <replay>... [--store]
//   <replay> is the filename of a replay in replays/, named like the aomstats ones
//   ("<YYYY-MM-DD>-<match_id>-<map>-<players>.mythrec.gz") so it can be matched to its match.
//   Without --store it only reports which match each replay belongs to.
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
  const file = path.basename(replay);
  const name = file.replace(/.mythrec(.gz)?$/i, '');

  try {
    const summary = ReplayService.summarize(await ReplayService.parseSavedReplay(file));
    const matchId = ReplayService.getMatchIdFromFilename(file);

    const stored = store && matchId ? `, stored ${ReplayService.storeReplayStats(matchId, summary)} players` : '';
    console.log(`${name}: ${summary.mapname}, ${Math.round(summary.recording_secs / 60)} min, match ${matchId ?? 'not found'}${stored}`);
  } catch (err) {
    console.error(`${name}: ${err.message}`);
    process.exitCode = 1;
  }
}
