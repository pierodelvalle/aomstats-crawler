const PORT = 3000;
const API_KEY = process.env.DISCORD_WEBHOOK_API_KEY || '';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin-dev-password';

export {
  PORT,
  API_KEY,
  DISCORD_WEBHOOK_URL,
  ADMIN_PASSWORD,
};