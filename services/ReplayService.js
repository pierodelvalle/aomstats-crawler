import fs from 'fs';
import path from 'path';
import { MatchesRepo } from '../models/matches.js';
import { PlayerMatchStatsRepo } from '../models/playerMatchStats.js';
import { db } from '../database/index.js';
import { REPLAY_SERVER_URL } from '../config/index.js';
import { summarizeReplay, toPlayerMatchStats } from '../utils/summarizeReplay.js';

const Matches = MatchesRepo(db);
const PlayerMatchStats = PlayerMatchStatsRepo(db);

// Shared with replay-server (docker-compose mounts it in both containers).
const REPLAYS_DIR = path.join(import.meta.dirname, '..', 'replays');
const REPLAY_FILE = /\.mythrec(\.gz)?$/i;

// Recordings shorter than this are restarts or drops; MatchService also skips matches under 480s.
const MIN_RECORDING_SECS = 480;
// How far a match's start may be from the replay's estimated start.
const MATCH_WINDOW_SECS = 60 * 60;

class ReplayServerUnreachableError extends Error {}

const requestParse = async (url, options) => {
  let res;
  try {
    res = await fetch(url, options);
  } catch (err) {
    throw new ReplayServerUnreachableError(`replay-server unreachable at ${REPLAY_SERVER_URL}: ${err.cause?.code ?? err.message}`);
  }
  if (!res.ok) {
    throw new Error(`replay-server returned ${res.status}: ${await res.text()}`);
  }
  return res.json();
};

const ReplayService = {
  // Parses a replay already in the replays/ folder shared with replay-server (crawler downloads).
  parseSavedReplay(filename) {
    return requestParse(`${REPLAY_SERVER_URL}/replays/${encodeURIComponent(filename)}?stats=true`);
  },
  // Uploads any .mythrec / .mythrec.gz file to replay-server (e.g. a player's local recording).
  parseReplayFile(filePath) {
    const form = new FormData();
    form.append('replay', new Blob([fs.readFileSync(filePath)]), path.basename(filePath));
    return requestParse(`${REPLAY_SERVER_URL}/parse?stats=true`, { method: 'POST', body: form });
  },
  // aomstats replay files are named "<YYYY-MM-DD>-<match_id>-<map>-<players>.mythrec.gz".
  getMatchIdFromFilename(filename) {
    const match = /^\d{4}-\d{2}-\d{2}-(\d+)-/.exec(path.basename(filename));
    return match ? Number(match[1]) : null;
  },
  summarize(parsed) {
    return summarizeReplay(parsed);
  },
  // Finds the stored match a replay belongs to: same map and players, closest start time.
  // endedAt is the unix time the recording ended (e.g. the file's modified time).
  findMatch(summary, endedAt) {
    if (summary.recording_secs < MIN_RECORDING_SECS) return null;

    const estimatedStart = endedAt - summary.recording_secs;
    const replayPlayers = summary.players.map(p => p.profile_id).sort().join(',');

    const candidates = Matches.getByMapAndTime(
      summary.mapname,
      estimatedStart - MATCH_WINDOW_SECS,
      estimatedStart + MATCH_WINDOW_SECS,
    ).filter(m => m.profile_ids.split(',').map(Number).sort().join(',') === replayPlayers);

    candidates.sort((a, b) =>
      Math.abs(a.startgametime - estimatedStart) - Math.abs(b.startgametime - estimatedStart));

    return candidates[0]?.match_id ?? null;
  },
  // Saves the replay's per-player stats. Returns how many players were stored.
  storeReplayStats(matchId, summary) {
    return PlayerMatchStats.insertMany(toPlayerMatchStats(matchId, summary));
  },
  // Parses, stores and deletes every replay the crawler downloaded into replays/.
  // A file is kept only when replay-server can't be reached, so the next crawl retries it;
  // if replay-server answered with an error, retrying the same file won't help.
  async processSavedReplays() {
    if (!fs.existsSync(REPLAYS_DIR)) return;

    const files = fs.readdirSync(REPLAYS_DIR).filter(f => REPLAY_FILE.test(f));

    for (const file of files) {
      const matchId = this.getMatchIdFromFilename(file);

      try {
        if (matchId) {
          const summary = this.summarize(await this.parseSavedReplay(file));
          const stored = this.storeReplayStats(matchId, summary);
          console.log(`Stored replay stats for ${stored} players of match ${matchId}`);
        } else {
          console.warn(`Skipping ${file}: no match id in the filename`);
        }
      } catch (err) {
        console.error(`Couldn't process replay ${file}: ${err.message}`);
        if (err instanceof ReplayServerUnreachableError) continue;
      }

      fs.unlinkSync(path.join(REPLAYS_DIR, file));
    }
  },
  // god: only matches where the player picked that major god (all gods when null).
  getPlayerReplayStats(profileId, { after = 0, god = null } = {}) {
    const filter = { after, god };
    const { matches, eapm } = PlayerMatchStats.getAverageEapm(profileId, filter);

    return {
      matches,
      eapm,
      units: PlayerMatchStats.getTopCounts(profileId, 'top_units', { ...filter, limit: 3 }),
      myth_units: PlayerMatchStats.getTopCounts(profileId, 'top_myth_units', { ...filter, limit: 2 }),
      god_powers: PlayerMatchStats.getTopCounts(profileId, 'top_god_powers', { ...filter, limit: 2 }),
      minor_gods: Object.fromEntries(['classical', 'heroic', 'mythic'].map(age =>
        [age, PlayerMatchStats.getTopMinorGod(profileId, `minor_${age}`, filter)])),
    };
  },
};

export {
  ReplayService,
};
