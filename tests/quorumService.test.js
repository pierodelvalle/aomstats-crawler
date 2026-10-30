import { jest } from '@jest/globals';

jest.unstable_mockModule('../database/index.js', () => ({
  db: {},
}));

jest.unstable_mockModule('../models/quorum.js', () => ({
  QuorumRepo: jest.fn(),
}));

jest.unstable_mockModule('../models/players.js', () => ({
  PlayersRepo: jest.fn(),
}));

const { QuorumRepo } = await import('../models/quorum.js');
const { PlayersRepo } = await import('../models/players.js');

const repo = {
  getSession: jest.fn(),
  createSession: jest.fn(),
  deleteSession: jest.fn(),
  getAvailability: jest.fn(),
  upsertAvailability: jest.fn(),
  deleteAvailability: jest.fn(),
};
QuorumRepo.mockReturnValue(repo);
PlayersRepo.mockReturnValue({ getAll: () => [{ profile_id: 1, name: 'Diego' }] });

const { QuorumService } = await import('../services/QuorumService.js');

const SESSION = { date: '2026-10-27', window_start: 1000, window_end: 5000, created_at: 1 };

beforeEach(() => {
  jest.clearAllMocks();
  repo.getSession.mockReturnValue(SESSION);
  repo.getAvailability.mockReturnValue([]);
});

describe('QuorumService.createSession', () => {
  it('creates the session and returns the stored one', () => {
    const session = QuorumService.createSession({ date: '2026-10-27', window_start: 1000, window_end: 5000 });
    expect(repo.createSession).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-10-27' }));
    expect(session).toBe(SESSION);
  });

  it.each([
    [{ date: '27/10/2026', window_start: 1000, window_end: 5000 }],
    [{ date: '2026-10-27', window_start: 5000, window_end: 1000 }],
    [{ date: '2026-10-27', window_start: 1000, window_end: 1000 + 40 * 3600 }],
    [{}],
  ])('rejects invalid input %o', (body) => {
    expect(() => QuorumService.createSession(body)).toThrow(expect.objectContaining({ status: 400 }));
    expect(repo.createSession).not.toHaveBeenCalled();
  });
});

describe('QuorumService.closeSession', () => {
  it('deletes an existing session', () => {
    QuorumService.closeSession('2026-10-27');
    expect(repo.deleteSession).toHaveBeenCalledWith('2026-10-27');
  });

  it('404s when there is nothing to close', () => {
    repo.getSession.mockReturnValue(undefined);
    expect(() => QuorumService.closeSession('2026-10-27')).toThrow(expect.objectContaining({ status: 404 }));
    expect(repo.deleteSession).not.toHaveBeenCalled();
  });
});

describe('QuorumService.setAvailability', () => {
  it('stores a range inside the window', () => {
    QuorumService.setAvailability('2026-10-27', 1, { start_time: 1800, end_time: 3600 });
    expect(repo.upsertAvailability).toHaveBeenCalledWith(expect.objectContaining({
      date: '2026-10-27', profile_id: 1, start_time: 1800, end_time: 3600,
    }));
  });

  it('stores "any time" as the whole window, ignoring any range sent', () => {
    QuorumService.setAvailability('2026-10-27', 1, { any_time: true, start_time: 1, end_time: 2 });
    expect(repo.upsertAvailability).toHaveBeenCalledWith(expect.objectContaining({
      profile_id: 1, start_time: 1000, end_time: 5000, any_time: 1,
    }));
  });

  it('marks a specific range as not "any time"', () => {
    QuorumService.setAvailability('2026-10-27', 1, { start_time: 1800, end_time: 3600 });
    expect(repo.upsertAvailability).toHaveBeenCalledWith(expect.objectContaining({ any_time: 0 }));
  });

  it('404s when the session does not exist', () => {
    repo.getSession.mockReturnValue(undefined);
    expect(() => QuorumService.setAvailability('2026-10-27', 1, { start_time: 1800, end_time: 3600 }))
      .toThrow(expect.objectContaining({ status: 404 }));
  });

  it.each([
    [1, { start_time: 500, end_time: 3600 }],
    [1, { start_time: 1800, end_time: 6000 }],
    [1, { start_time: 3600, end_time: 1800 }],
    [99, { start_time: 1800, end_time: 3600 }],
  ])('rejects player %s with %o', (profileId, range) => {
    expect(() => QuorumService.setAvailability('2026-10-27', profileId, range))
      .toThrow(expect.objectContaining({ status: 400 }));
    expect(repo.upsertAvailability).not.toHaveBeenCalled();
  });
});
