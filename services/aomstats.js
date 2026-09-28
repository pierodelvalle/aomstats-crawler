import axios from 'axios';
import {PlayerService} from './PlayerService.js';
import {MatchService} from './MatchService.js';
import {EloService} from './EloService.js';
import {PlayerMatchesService} from './PlayerMatchesService.js';
import {DISCORD_WEBHOOK_URL} from '../config/index.js';
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

const MIN_STREAK = 3;

const formatPlayerList = (names) => {
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
};

const notifyStreaksEnded = async (brokenStreaks) => {
  if (!brokenStreaks.length) return;

  const message = brokenStreaks.map(({name, streak, breakers}) => {
    const breakerList = breakers.length
      ? formatPlayerList(breakers.map(b => `**${b}**`))
      : "Alguien";
    return `💔 ${breakerList} ${breakers.length === 1 ? 'acabó' : 'acabaron'} con la racha de ${streak} victorias de **${name}**!`;
  }).join("\n");

  if (!DISCORD_WEBHOOK_URL) {
    console.warn(`Discord webhook not configured, skipping notification: ${message}`);
    return;
  }

  try {
    await axios.post(DISCORD_WEBHOOK_URL, { content: message });
  } catch (err) {
    console.error(`Failed to send winstreak notification to Discord: ${err.message}`);
  }
};

const crawlPlayerMatches = async (profileId, beforeLimit) => {
  const allMatches = [];
  let before = Math.floor(Date.now() / 1000); // start now

  while (true) {
    const url = `https://aomstats.io/api/profile/${profileId}/matches?leaderboard=0&before=${before}`;
    const res = await fetch(url);
    const matches = await res.json()

    console.log(`Fetching ${url}`);

    if (!matches.length) break;

    allMatches.push(...matches);

    const earliest = Math.min(...matches.map(m => m.startgametime));
    if (!earliest) break;

    if (beforeLimit) {
      const latest = Math.max(...matches.map(m => m.startgametime));
      if (beforeLimit > latest) break;
    }

    before = earliest - 1; // step back
    await new Promise(r => setTimeout(r, 500)); // throttle
  }

  return allMatches;
}

async function crawlFromAPI ({ sendStreakMessage =  false }) {
  const seen = new Set();
  const allMatches = [];

  const players = PlayerService.getAllPlayers();
  const playerIds = players.map(p => p.profile_id);
  const latestMatchDate = MatchService.getLatestDate();

  console.log(`Starting to fetch matches starting at ${new Date(latestMatchDate * 1000)}`);

  const winstreaksBefore = new Map(
    playerIds.map(p => [p, PlayerMatchesService.getPlayerWinstreak(p)])
  );

  for (const p of playerIds) {
    console.log(`Fetching games for Player ID: ${p}`);
    const matches = await crawlPlayerMatches(p, latestMatchDate);
    for (const m of matches) {
      if (m.profile_id === 1076671413) { m.profile_id = 1074199836; }
      const key = `${m.match_id}-${m.profile_id}`;
      if (!seen.has(key)) {
        seen.add(key);
        allMatches.push(m);
      }
    }
    console.log(`Fetched ${matches.length} matches from Player No. ${p}`);
  }

  console.log(`Fetch complete. Inserting matches...`);

  const insertedMatches = MatchService.storeMatches(allMatches);

  for (const m of insertedMatches) {
    if (m.replay_file) {
      const replayDir = path.join(import.meta.dirname, '..', '/replays');

      if (!fs.existsSync(replayDir)) {
        fs.mkdirSync(replayDir, { recursive: true });
      }

      const fileDir = path.join(replayDir, m.replay_file);

      try {
        const file = await fetch(`https://aomstats.io/static/replays/${m.replay_file}`);
        if (!file.ok) {
          throw new Error(`Failed to fetch replays from ${m.replay_file}`);
        }

        const fileStream = fs.createWriteStream(fileDir);
        const webStream = Readable.fromWeb(file.body);

        webStream.pipe(fileStream);
        await finished(fileStream);

        console.log(`${m.replay_file} has been saved!`);

      } catch (e) {
        console.log(`Couldn't save replay for ${m.match_id}. ${e.message}`);
      }
    }
  }

  EloService.updateEloForMatches();
  EloService.updateEloForMatches({scopeType: "god"});

  if (sendStreakMessage) {
    const brokenStreaks = players
    .filter(player => winstreaksBefore.get(player.profile_id) > MIN_STREAK)
    .filter(player => PlayerMatchesService.getPlayerWinstreak(player.profile_id) === 0)
    .map(player => ({
      name: player.name,
      streak: winstreaksBefore.get(player.profile_id),
      breakers: PlayerMatchesService.getStreakBreakers(player.profile_id),
    }));

    await notifyStreaksEnded(brokenStreaks);
  }

  console.log(`Fetched and saved ${allMatches.length} matches`);
}

export {
  crawlPlayerMatches,
  crawlFromAPI,
};