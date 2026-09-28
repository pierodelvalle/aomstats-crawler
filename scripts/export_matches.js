import fs from 'fs';
import { exportAsCSV } from '../services/export_csv.js';

const result = exportAsCSV();

fs.writeFileSync('matches.csv', result, 'utf-8');
