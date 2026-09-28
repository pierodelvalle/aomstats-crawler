import { PlayersRepo } from '../models/players.js';
import { db } from '../database/index.js';

const Players = PlayersRepo(db);

const PlayerService = {
  getAllPlayers() {
    return Players.getAll();
  },
  getAllPlayersIds() {
    const players = this.getAllPlayers();
    return players.map(player => player.profile_id);
  }
};

export {
  PlayerService
};