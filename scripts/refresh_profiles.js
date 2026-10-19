import { ProfileService } from '../services/ProfileService.js';

async function refreshProfiles () {
  await ProfileService.refreshProfiles();
}

refreshProfiles();
