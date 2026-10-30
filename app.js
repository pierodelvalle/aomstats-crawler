import express from 'express';
const app = express();
import cors from 'cors';
import { PORT } from './config/index.js';

import './cron/index.js'; // Start the cron job
import playersRouter from './routes/players.js';
import discordRouter from './routes/discord.js';
import matchupRouter from './routes/matchup.js';
import statsRouter from './routes/stats.js';
import adminRouter from './routes/admin.js';
import quorumRouter from './routes/quorum.js';

app.use(cors({
  origin: '*'
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// Routes
app.use('/', playersRouter);
app.use('/', discordRouter);
app.use('/', matchupRouter);
app.use('/', statsRouter);
app.use('/', adminRouter);
app.use('/', quorumRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});