const { REPLAY_SERVER_URL } = require('../config');
const fs = require("fs");

async function parseReplay(filename) {
  const url = `${REPLAY_SERVER_URL}/replays/${encodeURIComponent(filename)}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`replay-server returned ${res.status}: ${await res.text()}`);
  }

  const replay = await res.json();
  //console.log(JSON.stringify(replay, null, 2));
  fs.writeFileSync(`${filename}.json`, JSON.stringify(replay, null, 2), 'utf-8');

}

const filename = process.argv[2] || '2026-07-25-41130246-rm_acropolis-abcdefghijk_gai-hethorner_had.mythrec.gz';

parseReplay(filename).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
