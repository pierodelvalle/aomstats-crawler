import { PlayersRepo } from '../models/players.js';
import { db } from '../database/index.js';

const Players = PlayersRepo(db);

// aomstats.io leaderboard ids
const LEADERBOARD_1V1 = 1;
const LEADERBOARD_TEAM = 2;

const fetchProfileStats = async (profileId) => {
  const res = await fetch(`https://aomstats.io/api/profile/${profileId}/stats`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const toProfileRow = (profileId, stats) => {
  const leaderboard = (id) => stats.leaderboards?.find(l => l.leaderboard_id === id);
  const oneVsOne = leaderboard(LEADERBOARD_1V1);
  const team = leaderboard(LEADERBOARD_TEAM);

  return {
    profile_id: profileId,
    alias: stats.profile?.alias ?? null,
    avatar_link: stats.profile?.avatar_link ?? null,
    country: stats.profile?.country ?? null,
    ranked_1v1: oneVsOne?.rating ?? null,
    ranked_1v1_peak: oneVsOne?.highestrating || null,
    ranked_team: team?.rating ?? null,
    ranked_team_peak: team?.highestrating || null,
    profile_updated: Math.floor(Date.now() / 1000),
  };
};

const ProfileService = {
  getAllProfiles() {
    return Players.getAllProfiles();
  },
  async refreshProfiles() {
    const players = Players.getAll();

    for (const { profile_id, name } of players) {
      try {
        const stats = await fetchProfileStats(profile_id);
        Players.updateProfile(toProfileRow(profile_id, stats));
        console.log(`Updated profile for ${name}`);
      } catch (err) {
        console.error(`Failed to update profile for ${name} (${profile_id}): ${err.message}`);
      }
      await new Promise(r => setTimeout(r, 500)); // throttle
    }
  },
};

export {
  ProfileService,
};
