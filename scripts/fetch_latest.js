import { crawlFromAPI } from '../services/aomstats.js';

async function fetchLatest () {
  await crawlFromAPI({ sendStreakMessage: true });
}

fetchLatest();
