// Reduces restoration's parsed replay JSON (replay-server) to the per-player data we keep.
//
// Not taken from the replay, because the recording stops when the recorder leaves:
// - GameLengthSecs is the recording length, not the match duration.
// - Winner / WinningTeam / TeamId are unreliable (TeamId can be -1, WinningTeam is often -1).
// Winners, teams and duration come from aomstats (matches / player_matches) instead.

import { isMythUnit } from './mythUnits.js';

const AGES = ['classical', 'heroic', 'mythic'];
const AGE_TECH = /^(Classical|Heroic|Mythic)Age(\w+)$/;
const AGE_COMMANDS = new Set(['research', 'prequeueTech']);

// Last age-up command per player and age: players can queue one minor god and switch to another.
const getAgeUps = (commands = []) => {
  const ageUps = {};

  for (const { PlayerNum, CommandType, Payload, GameTimeSecs } of commands) {
    if (!AGE_COMMANDS.has(CommandType)) continue;
    const match = AGE_TECH.exec(Payload);
    if (!match) continue;

    const age = match[1].toLowerCase();
    ageUps[PlayerNum] ??= {};
    ageUps[PlayerNum][age] = { god: match[2], secs: Math.round(GameTimeSecs) };
  }

  return ageUps;
};

const summarizeReplay = (parsed) => {
  const ageUps = getAgeUps(parsed.GameCommands);

  const players = (parsed.Players ?? [])
    .filter(p => p.ProfileId > 0) // unused lobby slots come back as ProfileId 0
    .map(p => {
      const stats = parsed.Stats?.[p.PlayerNum] ?? {};
      const playerAgeUps = ageUps[p.PlayerNum] ?? {};

      return {
        profile_id: p.ProfileId,
        minor_gods: Object.fromEntries(AGES.map((age, i) => [age, p.MinorGods?.[i] || null])),
        age_up_secs: Object.fromEntries(AGES.map(age => [age, playerAgeUps[age]?.secs ?? null])),
        eapm: Math.round(p.EAPM),
        titan: p.Titan,
        wonder: p.Wonder,
        god_powers: stats.GodPowerCounts ?? {},
        units: stats.UnitCounts ?? {},
        buildings: stats.BuildingCounts ?? {},
      };
    });

  return {
    mapname: `rm_${parsed.MapName}`,
    build_number: parsed.BuildNumber,
    recording_secs: Math.round(parsed.GameLengthSecs),
    players,
  };
};

// Economy units would crowd out the army in "favorite units". Villagers aren't trained by
// command (autoqueue), so they rarely show up, but caravans and ships do.
const ECONOMY_UNIT = /^(Villager|Caravan|FishingShip|TransportShip|OxCart)/;

const getTop = (counts, limit, include = () => true) => Object.entries(counts)
  .filter(([name]) => include(name))
  .sort(([nameA, a], [nameB, b]) => b - a || nameA.localeCompare(nameB))
  .slice(0, limit)
  .map(([name, count]) => ({ name, count }));

// One player_match_stats row per player in the summary.
const toPlayerMatchStats = (matchId, summary) => summary.players.map(p => ({
  match_id: matchId,
  profile_id: p.profile_id,
  minor_classical: p.minor_gods.classical,
  minor_heroic: p.minor_gods.heroic,
  minor_mythic: p.minor_gods.mythic,
  classical_secs: p.age_up_secs.classical,
  heroic_secs: p.age_up_secs.heroic,
  mythic_secs: p.age_up_secs.mythic,
  eapm: p.eapm,
  titan: p.titan ? 1 : 0,
  wonder: p.wonder ? 1 : 0,
  top_units: JSON.stringify(getTop(p.units, 3, name => !ECONOMY_UNIT.test(name))),
  top_myth_units: JSON.stringify(getTop(p.units, 2, isMythUnit)),
  top_buildings: JSON.stringify(getTop(p.buildings, 2)),
  top_god_powers: JSON.stringify(getTop(p.god_powers, 2)),
  build_number: summary.build_number,
}));

export {
  summarizeReplay,
  toPlayerMatchStats,
};
