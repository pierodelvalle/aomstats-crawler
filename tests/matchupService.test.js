import { jest } from '@jest/globals';

jest.unstable_mockModule('../database/index.js', () => ({
  db: {
    prepare: jest.fn(),
    transaction: jest.fn(),
  },
}));

jest.unstable_mockModule('../models/playerMatches.js', () => {
  const mockPlayerMatchesRepo = {
    getPlayerWins: jest.fn(),
    getPlayerRelationshipWins: jest.fn(),
  };

  return {
    PlayerMatchesRepo: Object.assign(jest.fn(() => mockPlayerMatchesRepo), mockPlayerMatchesRepo),
  };
});

jest.unstable_mockModule('../models/elo.js', () => {
  const mockEloRepo = {
    getElo: jest.fn(),
    getManyElo: jest.fn(),
  };

  return {
    EloRepo: Object.assign(jest.fn(() => mockEloRepo), mockEloRepo),
    SCOPE: { GLOBAL: 'global', GOD: 'god', CIV: 'civ' },
  };
});

jest.unstable_mockModule('../config/eloConfig.js', () => ({
  ELO_SIZE_ADVANTAGE_PER_PLAYER: 250,
  WIN_PROB_SIZE_MULTIPLIER_BASE: 1.2,
  ELO_DIVISOR: 400,
  ELO_BETA_FACTOR: 0,
  ELO_SCALE: 20,
  ELO_K_FACTOR: 6,
  MATCH_COUNT_FACTOR: 12,
}));

const { PlayerMatchesRepo } = await import('../models/playerMatches.js');
const { EloRepo } = await import('../models/elo.js');

const { MatchupService } = await import('../services/MatchupService.js');

describe('MatchupService.getMatchupScore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculates matchup wins correctly', () => {
    PlayerMatchesRepo.getPlayerWins.mockReturnValue([
      { target_player_win: 1, players: '[]' },
      { target_player_win: 1, players: '[]' },
      { target_player_win: 0, players: '[]' },
      { target_player_win: 1, players: '[]' },
    ]);

    const result = MatchupService.getMatchupScore(
      [{profile_id: 102}, {profile_id: 101}],
      [{profile_id: 103}, {profile_id: 104}],
    );

    expect(PlayerMatchesRepo.getPlayerWins)
      .toHaveBeenCalledWith(
        '101,102 vs 103,104',
        102,
        { scope: 'global' }
      );

    expect(result.score).toEqual([3, 1]);
  });

  it('accepts god name in player data', () => {
    PlayerMatchesRepo.getPlayerWins.mockReturnValue([
      { target_player_win: 1, players: '[]' },
      { target_player_win: 1, players: '[]' },
      { target_player_win: 0, players: '[]' },
      { target_player_win: 1, players: '[]' },
    ]);

    const result = MatchupService.getMatchupScore(
      [{profile_id: 102, god: 'zeus'}, {profile_id: 101, god: 'hades'}],
      [{profile_id: 103, god: 'poseidon'}, {profile_id: 104, god: 'thor'}],
    );

    expect(PlayerMatchesRepo.getPlayerWins)
      .toHaveBeenCalledWith(
        '101,102 vs 103,104',
        102,
        { scope: 'global' }
      );

    expect(result.score).toEqual([3, 1]);

  })

  it('returns zeroed scores when no games exist', () => {
    PlayerMatchesRepo.getPlayerWins.mockReturnValue([]);

    const result = MatchupService.getMatchupScore(
      [{profile_id: 102}, {profile_id: 101}],
      [{profile_id: 103}, {profile_id: 104}],
    );

    expect(result.score).toEqual([0, 0]);
  });
});

describe('MatchupService.getMatchupOdds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns probability favoring stronger Elo team', () => {
    EloRepo.getElo.mockImplementation((profileId) => ({
      1: 1800,
      2: 1750,
      3: 1400,
      4: 1450,
    }[profileId]));

    PlayerMatchesRepo.getPlayerRelationshipWins.mockReturnValue([]);

    const result = MatchupService.getMatchupOdds(
      [{ profile_id: 1 }, { profile_id: 2 }],
      [{ profile_id: 3 }, { profile_id: 4 }]
    );

    expect(result).toBeGreaterThan(0.5);
  });

  it('uses historical matchup data when available', () => {
    EloRepo.getElo.mockImplementation((profileId) => ({
      1: 1500,
      2: 1500,
    }[profileId]));

    PlayerMatchesRepo.getPlayerRelationshipWins.mockReturnValue([
      { profile_id: 2, wins: 8, total: 10 },
    ]);

    const result = MatchupService.getMatchupOdds(
      [{ profile_id: 1 }],
      [{ profile_id: 2 }]
    );

    expect(result).toBeGreaterThan(0.5);
  });

  it('falls back to Elo-only probability without historical data', () => {
    EloRepo.getElo.mockImplementation((profileId) => ({
      1: 1600,
      2: 1400,
    }[profileId]));

    PlayerMatchesRepo.getPlayerRelationshipWins.mockReturnValue([]);

    const result = MatchupService.getMatchupOdds(
      [{ profile_id: 1 }],
      [{ profile_id: 2 }]
    );

    expect(result).toBeGreaterThan(0.5);
  });

  it('handles equal Elo teams near 50 percent', () => {
    EloRepo.getElo.mockImplementation((profileId) => ({
      1: 1500,
      2: 1500,
    }[profileId]));

    PlayerMatchesRepo.getPlayerRelationshipWins.mockReturnValue([]);

    const result = MatchupService.getMatchupOdds(
      [{ profile_id: 1 }],
      [{ profile_id: 2 }]
    );

    expect(result).toBeCloseTo(0.5, 1);
  });

  it('applies team size advantage', () => {
    EloRepo.getElo.mockImplementation((profileId) => ({
      1: 1500,
      2: 1500,
      3: 1500,
    }[profileId]));

    PlayerMatchesRepo.getPlayerRelationshipWins.mockReturnValue([]);

    const result = MatchupService.getMatchupOdds(
      [{ profile_id: 1 }, { profile_id: 2 }],
      [{ profile_id: 3 }]
    );

    expect(result).toBeGreaterThan(0.5);
  });

  it('never exceeds probability bounds', () => {
    EloRepo.getElo.mockImplementation((profileId) => ({
      1: 3000,
      2: 500,
    }[profileId]));

    PlayerMatchesRepo.getPlayerRelationshipWins.mockReturnValue([
      { profile_id: 2, wins: 100, total: 100 },
    ]);

    const result = MatchupService.getMatchupOdds(
      [{ profile_id: 1 }],
      [{ profile_id: 2 }]
    );

    expect(result).toBeLessThanOrEqual(1);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});