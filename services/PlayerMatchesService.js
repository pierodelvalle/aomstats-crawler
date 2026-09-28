import { PlayerMatchesRepo } from '../models/playerMatches.js';
import { db } from '../database/index.js';

const PlayerMatches = PlayerMatchesRepo(db);

const PlayerMatchesService = {
  getPlayerWinsByGod(profileId, {
    after = 0
  } = {}) {
    return PlayerMatches.getPlayerWinsByGod(
      profileId,
      { after });
  },
  getPlayerWinsByTeammate(profileId, {
    god = null,
    after = 0
  } = {}) {
    return PlayerMatches.getPlayerRelationshipWins(
      profileId,
      {
        type: "partner",
        god,
        after,
      }
    )
  },
  getPlayerWinsVsPlayers(profileId, {
    god = null,
    after = 0
  } = {}) {
    return PlayerMatches.getPlayerRelationshipWins(
      profileId,
      {
        type: "rival",
        god,
        after
      }
    )
  },
  getPlayerWinstreak(profileId) {
    return PlayerMatches.getPlayerWinstreak(profileId);
  },
  getStreakBreakers(profileId) {
    return PlayerMatches.getStreakBreakers(profileId);
  },
  getPlayerWinsByMap(profileId, { gods = null, after = 0 } = {}) {
    return PlayerMatches.getPlayerWinsByMap(profileId, { gods, after });
  }
}

export {
  PlayerMatchesService,
};