import Database from 'better-sqlite3';
import path from 'path';

let dbInstance: Database.Database | null = null;

export function initDatabase(dbPath?: string): Database.Database {
  const resolvedPath = dbPath || process.env.DATABASE_PATH || path.resolve(process.cwd(), 'mafia.db');
  const db = new Database(resolvedPath);

  // Performance and integrity pragmas
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Schema creation
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      code TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'lobby'
    );

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      room_code TEXT REFERENCES rooms(code) ON DELETE CASCADE,
      name TEXT NOT NULL,
      session_token TEXT UNIQUE NOT NULL,
      connected BOOLEAN DEFAULT TRUE,
      disconnected_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_code TEXT REFERENCES rooms(code) ON DELETE CASCADE,
      status TEXT DEFAULT 'night',
      current_round INTEGER DEFAULT 1,
      winner TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS game_players (
      game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
      player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      is_alive BOOLEAN DEFAULT TRUE,
      PRIMARY KEY (game_id, player_id)
    );

    CREATE TABLE IF NOT EXISTS night_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
      round INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      actor_id TEXT REFERENCES players(id) ON DELETE CASCADE,
      target_id TEXT REFERENCES players(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS day_votes (
      game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
      round INTEGER NOT NULL,
      voter_id TEXT REFERENCES players(id) ON DELETE CASCADE,
      target_id TEXT REFERENCES players(id) ON DELETE CASCADE,
      PRIMARY KEY (game_id, round, voter_id)
    );
  `);

  dbInstance = db;
  return db;
}

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
