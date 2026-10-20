const PORT = 3000;
const API_KEY = process.env.DISCORD_WEBHOOK_API_KEY || '';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin-dev-password';
// replay-server's container port (8080) is only reachable by hostname from other
// containers on the compose network. Scripts run on the host (as documented in the
// README) need the host-mapped port from docker-compose.yml instead.
const REPLAY_SERVER_URL = process.env.REPLAY_SERVER_URL || 'http://localhost:8081';

export {
  PORT,
  API_KEY,
  DISCORD_WEBHOOK_URL,
  ADMIN_PASSWORD,
  REPLAY_SERVER_URL,
};