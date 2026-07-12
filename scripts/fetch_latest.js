const { crawlFromAPI } = require('../services/aomstats');

async function fetchLatest () {
  await crawlFromAPI({ sendStreakMessage: true });
}

fetchLatest();
