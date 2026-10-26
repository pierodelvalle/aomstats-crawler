import { summarizeReplay, toPlayerMatchStats } from '../utils/summarizeReplay.js';
import { isMythUnit } from '../utils/mythUnits.js';

const player = (overrides) => ({
  PlayerNum: 1,
  TeamId: 0,
  Name: 'Player',
  ProfileId: 0,
  RandomGod: false,
  God: 'Zeus',
  Winner: true,
  EAPM: 0,
  MinorGods: ['', '', ''],
  Titan: false,
  Wonder: false,
  ...overrides,
});

const parsed = {
  MapName: 'marsh',
  BuildNumber: 606844,
  ParserVersion: 'v0.5.4',
  GameLengthSecs: 1875.65,
  WinningTeam: -1,
  Players: [
    player({
      PlayerNum: 1, Name: 'alpha', ProfileId: 111, God: 'Ra', EAPM: 98.6,
      MinorGods: ['Bast', 'Sobek', 'Thoth'], Titan: true,
    }),
    player({
      PlayerNum: 2, TeamId: -1, Name: 'beta', ProfileId: 222, God: 'Gaia', EAPM: 55.2,
      MinorGods: ['Leto', 'Rheia', ''],
    }),
    player({ PlayerNum: 3, Name: 'Player 3' }),
  ],
  Stats: {
    1: { EAPM: [50, 90], GodPowerCounts: { Rain: 1 }, UnitCounts: { Axeman: 4 }, BuildingCounts: { House: 2 }, TechsResearched: ['ClassicalAgeBast'] },
  },
  GameCommands: [
    { GameTimeSecs: 29.2, PlayerNum: 1, CommandType: 'prequeueTech', Payload: 'ClassicalAgeAnubis' },
    { GameTimeSecs: 138.4, PlayerNum: 1, CommandType: 'prequeueTech', Payload: 'ClassicalAgeBast' },
    { GameTimeSecs: 712, PlayerNum: 1, CommandType: 'research', Payload: 'HeroicAgeSobek' },
    { GameTimeSecs: 200, PlayerNum: 2, CommandType: 'research', Payload: 'ClassicalAgeLeto' },
    { GameTimeSecs: 300, PlayerNum: 2, CommandType: 'train', Payload: 'ClassicalAgeLeto' },
    { GameTimeSecs: 400, PlayerNum: 2, CommandType: 'research', Payload: 'Pickaxe' },
  ],
};

describe('summarizeReplay', () => {
  const summary = summarizeReplay(parsed);

  test('keeps match-level fields with the rm_ map prefix used in matches', () => {
    expect(summary).toMatchObject({
      mapname: 'rm_marsh',
      build_number: 606844,
      recording_secs: 1876,
    });
  });

  test('drops empty lobby slots', () => {
    expect(summary.players.map(p => p.profile_id)).toEqual([111, 222]);
  });

  test('maps minor gods per age, with null for ages not reached', () => {
    expect(summary.players[0].minor_gods).toEqual({ classical: 'Bast', heroic: 'Sobek', mythic: 'Thoth' });
    expect(summary.players[1].minor_gods).toEqual({ classical: 'Leto', heroic: 'Rheia', mythic: null });
  });

  test('uses the last age-up command per age and ignores other commands', () => {
    expect(summary.players[0].age_up_secs).toEqual({ classical: 138, heroic: 712, mythic: null });
    expect(summary.players[1].age_up_secs).toEqual({ classical: 200, heroic: null, mythic: null });
  });

  test('rounds eAPM and keeps titan / wonder flags', () => {
    expect(summary.players[0]).toMatchObject({ eapm: 99, titan: true, wonder: false });
  });

  test('attaches per-player stats and defaults when missing', () => {
    expect(summary.players[0]).toMatchObject({
      god_powers: { Rain: 1 },
      units: { Axeman: 4 },
      buildings: { House: 2 },
    });
    expect(summary.players[1]).toMatchObject({ god_powers: {}, units: {}, buildings: {} });
  });

  test('does not expose replay winners or teams', () => {
    expect(summary.players[0]).not.toHaveProperty('winner');
    expect(summary.players[0]).not.toHaveProperty('team');
  });
});

describe('toPlayerMatchStats', () => {
  const summary = summarizeReplay({
    ...parsed,
    Stats: {
      1: {
        UnitCounts: { Axeman: 40, CaravanEgyptian: 90, Spearman: 40, Slinger: 12, Priest: 3, Sphinx: 5, ScorpionMan: 2, Mummy: 1 },
        BuildingCounts: { House: 10, Farm: 20, Barracks: 4 },
        GodPowerCounts: { Rain: 1, Eclipse: 3, Plague: 2 },
      },
    },
  });
  const [alpha, beta] = toPlayerMatchStats(123, summary);

  test('flattens minor gods, age-ups and flags into columns', () => {
    expect(alpha).toMatchObject({
      match_id: 123,
      profile_id: 111,
      minor_classical: 'Bast',
      minor_mythic: 'Thoth',
      classical_secs: 138,
      heroic_secs: 712,
      mythic_secs: null,
      eapm: 99,
      titan: 1,
      wonder: 0,
      build_number: 606844,
    });
  });

  test('keeps the top 3 army units, top 2 myth units, top 2 buildings and top 2 god powers', () => {
    expect(JSON.parse(alpha.top_units)).toEqual([
      { name: 'Axeman', count: 40 },
      { name: 'Spearman', count: 40 },
      { name: 'Slinger', count: 12 },
    ]);
    expect(JSON.parse(alpha.top_buildings)).toEqual([
      { name: 'Farm', count: 20 },
      { name: 'House', count: 10 },
    ]);
    expect(JSON.parse(alpha.top_myth_units)).toEqual([
      { name: 'Sphinx', count: 5 },
      { name: 'ScorpionMan', count: 2 },
    ]);
    expect(JSON.parse(alpha.top_god_powers)).toEqual([
      { name: 'Eclipse', count: 3 },
      { name: 'Plague', count: 2 },
    ]);
  });

  test('handles players without stats', () => {
    expect(beta).toMatchObject({ top_units: '[]', top_myth_units: '[]', top_buildings: '[]', top_god_powers: '[]' });
  });
});

describe('isMythUnit', () => {
  test('matches parser names against in-game names, ignoring spaces and accents', () => {
    expect(isMythUnit('ScorpionMan')).toBe(true);
    expect(isMythUnit('Wanyudo')).toBe(true);
    expect(isMythUnit('CentzonTotochtin')).toBe(true);
    expect(isMythUnit('Hoplite')).toBe(false);
  });
});
