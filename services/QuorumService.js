import { QuorumRepo } from '../models/quorum.js';
import { PlayersRepo } from '../models/players.js';
import { db } from '../database/index.js';

const Quorum = QuorumRepo(db);
const Players = PlayersRepo(db);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_WINDOW_SECONDS = 36 * 3600;

class QuorumError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function isTimestamp(value) {
  return Number.isInteger(value) && value > 0;
}

function requireSession(date) {
  if (!DATE_PATTERN.test(date)) throw new QuorumError(400, 'Fecha inválida.');
  const session = Quorum.getSession(date);
  if (!session) throw new QuorumError(404, 'No hay sesión para ese día.');
  return session;
}

const QuorumService = {
  // Creates the day's session, or returns the existing one so repeated clicks share a link.
  createSession({ date, window_start, window_end }) {
    if (!DATE_PATTERN.test(date ?? '')) throw new QuorumError(400, 'Fecha inválida.');
    if (!isTimestamp(window_start) || !isTimestamp(window_end)
      || window_end <= window_start || window_end - window_start > MAX_WINDOW_SECONDS) {
      throw new QuorumError(400, 'Horario inválido.');
    }

    Quorum.createSession({ date, window_start, window_end, created_at: Math.floor(Date.now() / 1000) });
    return Quorum.getSession(date);
  },

  // Ends the day's session and drops everyone's availability, so a new one can be started.
  closeSession(date) {
    requireSession(date);
    Quorum.deleteSession(date);
  },

  getSession(date) {
    const session = requireSession(date);
    return { session, availability: Quorum.getAvailability(date) };
  },

  // Either a specific range, or { any_time: true } for "available today" (stored as the whole window).
  setAvailability(date, profileId, { start_time, end_time, any_time }) {
    const session = requireSession(date);

    if (!Players.getAll().some(p => p.profile_id === profileId)) {
      throw new QuorumError(400, 'Jugador desconocido.');
    }

    const anyTime = any_time === true;
    if (anyTime) {
      start_time = session.window_start;
      end_time = session.window_end;
    } else if (!isTimestamp(start_time) || !isTimestamp(end_time) || end_time <= start_time
      || start_time < session.window_start || end_time > session.window_end) {
      throw new QuorumError(400, 'Horario inválido.');
    }

    Quorum.upsertAvailability({
      date,
      profile_id: profileId,
      start_time,
      end_time,
      any_time: anyTime ? 1 : 0,
      updated_at: Math.floor(Date.now() / 1000),
    });
    return Quorum.getAvailability(date);
  },

  clearAvailability(date, profileId) {
    requireSession(date);
    Quorum.deleteAvailability(date, profileId);
    return Quorum.getAvailability(date);
  },
};

export {
  QuorumService,
  QuorumError,
};
