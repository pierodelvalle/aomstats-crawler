import Database from 'better-sqlite3';
import path from 'path';

// Import database/index.js to ensure tables are created
import '../database/index.js';

const dbPath = path.resolve(import.meta.dirname, '..', 'db.sqlite');
const db = new Database(dbPath);

function createTournament(name) {
  if (!name) {
    console.error('Error: Tournament name is required');
    console.log('Usage: node create_tournament.js "Tournament Name"');
    process.exit(1);
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO tournaments (name, is_open)
      VALUES (?, 1)
    `);

    const result = stmt.run(name);
    console.log(`Tournament "${name}" created successfully with ID: ${result.lastInsertRowid}`);
  } catch (error) {
    console.error('Error creating tournament:', error.message);
    process.exit(1);
  }
}

// Get tournament name from command line arguments
const tournamentName = process.argv[2];

createTournament(tournamentName);

// Close the database connection
db.close();