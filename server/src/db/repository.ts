import { Database } from 'better-sqlite3';
import { getDatabase } from './database';
import { Role } from '@mafia/shared';

export interface RoomRow {
  code: string;
  created_at: string;
  status: 'lobby' | 'in_game' | 'game_over';
}

export interface PlayerRow {
  id: string;
  room_code: string;
  name: string;
  session_token: string;
  connected: number; // 0 or 1
  disconnected_at: string | null;
  created_at: string;
}

export interface GameRow {
  id: number;
  room_code: string;
  status: 'night' | 'day_reveal' | 'day_voting' | 'finished';
  current_round: number;
  winner: 'town' | 'mafia' | null;
  created_at: string;
}

export interface GamePlayerRow {
  game_id: number;
  player_id: string;
  role: Role;
  is_alive: number; // 0 or 1
}

export interface NightActionRow {
  id: number;
  game_id: number;
  round: number;
  action_type: 'kill' | 'investigate' | 'protect';
  actor_id: string;
  target_id: string;
}

export interface DayVoteRow {
  game_id: number;
  round: number;
  voter_id: string;
  target_id: string;
}

export class Repository {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || getDatabase();
  }

  // Room operations
  createRoom(code: string, status: string = 'lobby'): void {
    const stmt = this.db.prepare(`
      INSERT INTO rooms (code, status) VALUES (?, ?)
    `);
    stmt.run(code, status);
  }

  getRoom(code: string): RoomRow | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM rooms WHERE code = ?
    `);
    return stmt.get(code) as RoomRow | undefined;
  }

  updateRoomStatus(code: string, status: string): void {
    const stmt = this.db.prepare(`
      UPDATE rooms SET status = ? WHERE code = ?
    `);
    stmt.run(status, code);
  }

  getAllRooms(): RoomRow[] {
    const stmt = this.db.prepare(`SELECT * FROM rooms`);
    return stmt.all() as RoomRow[];
  }

  deleteRoom(code: string): void {
    const stmt = this.db.prepare(`DELETE FROM rooms WHERE code = ?`);
    stmt.run(code);
  }

  // Player operations
  createPlayer(player: {
    id: string;
    roomCode: string;
    name: string;
    sessionToken: string;
    connected?: boolean;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO players (id, room_code, name, session_token, connected)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
      player.id,
      player.roomCode,
      player.name,
      player.sessionToken,
      player.connected !== false ? 1 : 0
    );
  }

  getPlayerById(id: string): PlayerRow | undefined {
    const stmt = this.db.prepare(`SELECT * FROM players WHERE id = ?`);
    return stmt.get(id) as PlayerRow | undefined;
  }

  getPlayerBySessionToken(sessionToken: string): PlayerRow | undefined {
    const stmt = this.db.prepare(`SELECT * FROM players WHERE session_token = ?`);
    return stmt.get(sessionToken) as PlayerRow | undefined;
  }

  getPlayersByRoom(roomCode: string): PlayerRow[] {
    const stmt = this.db.prepare(`SELECT * FROM players WHERE room_code = ? ORDER BY created_at ASC`);
    return stmt.all(roomCode) as PlayerRow[];
  }

  updatePlayerConnection(id: string, connected: boolean, disconnectedAt: string | null = null): void {
    const stmt = this.db.prepare(`
      UPDATE players SET connected = ?, disconnected_at = ? WHERE id = ?
    `);
    stmt.run(connected ? 1 : 0, disconnectedAt, id);
  }

  deletePlayer(id: string): void {
    const stmt = this.db.prepare(`DELETE FROM players WHERE id = ?`);
    stmt.run(id);
  }

  // Game operations
  createGame(roomCode: string, status: string = 'night', currentRound: number = 1): number {
    const stmt = this.db.prepare(`
      INSERT INTO games (room_code, status, current_round)
      VALUES (?, ?, ?)
    `);
    const info = stmt.run(roomCode, status, currentRound);
    return info.lastInsertRowid as number;
  }

  getGameById(id: number): GameRow | undefined {
    const stmt = this.db.prepare(`SELECT * FROM games WHERE id = ?`);
    return stmt.get(id) as GameRow | undefined;
  }

  getLatestGameForRoom(roomCode: string): GameRow | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM games WHERE room_code = ? ORDER BY id DESC LIMIT 1
    `);
    return stmt.get(roomCode) as GameRow | undefined;
  }

  updateGame(id: number, updates: {
    status?: string;
    currentRound?: number;
    winner?: string | null;
  }): void {
    const setClauses: string[] = [];
    const params: any[] = [];

    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      params.push(updates.status);
    }
    if (updates.currentRound !== undefined) {
      setClauses.push('current_round = ?');
      params.push(updates.currentRound);
    }
    if (updates.winner !== undefined) {
      setClauses.push('winner = ?');
      params.push(updates.winner);
    }

    if (setClauses.length === 0) return;

    params.push(id);
    const sql = `UPDATE games SET ${setClauses.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...params);
  }

  // Game Players operations
  addGamePlayer(gameId: number, playerId: string, role: Role, isAlive: boolean = true): void {
    const stmt = this.db.prepare(`
      INSERT INTO game_players (game_id, player_id, role, is_alive)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(gameId, playerId, role, isAlive ? 1 : 0);
  }

  getGamePlayers(gameId: number): GamePlayerRow[] {
    const stmt = this.db.prepare(`SELECT * FROM game_players WHERE game_id = ?`);
    return stmt.all(gameId) as GamePlayerRow[];
  }

  updateGamePlayerStatus(gameId: number, playerId: string, isAlive: boolean): void {
    const stmt = this.db.prepare(`
      UPDATE game_players SET is_alive = ? WHERE game_id = ? AND player_id = ?
    `);
    stmt.run(isAlive ? 1 : 0, gameId, playerId);
  }

  // Night actions operations
  recordNightAction(gameId: number, round: number, actionType: 'kill' | 'investigate' | 'protect', actorId: string, targetId: string): void {
    // If actor already submitted an action of this type in this round, update or replace it
    const existing = this.db.prepare(`
      SELECT id FROM night_actions
      WHERE game_id = ? AND round = ? AND action_type = ? AND actor_id = ?
    `).get(gameId, round, actionType, actorId) as { id: number } | undefined;

    if (existing) {
      this.db.prepare(`
        UPDATE night_actions SET target_id = ? WHERE id = ?
      `).run(targetId, existing.id);
    } else {
      this.db.prepare(`
        INSERT INTO night_actions (game_id, round, action_type, actor_id, target_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(gameId, round, actionType, actorId, targetId);
    }
  }

  getNightActionsForRound(gameId: number, round: number): NightActionRow[] {
    const stmt = this.db.prepare(`
      SELECT * FROM night_actions WHERE game_id = ? AND round = ?
    `);
    return stmt.all(gameId, round) as NightActionRow[];
  }

  // Day votes operations
  recordDayVote(gameId: number, round: number, voterId: string, targetId: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO day_votes (game_id, round, voter_id, target_id)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(game_id, round, voter_id) DO UPDATE SET target_id = excluded.target_id
    `);
    stmt.run(gameId, round, voterId, targetId);
  }

  getDayVotesForRound(gameId: number, round: number): DayVoteRow[] {
    const stmt = this.db.prepare(`
      SELECT * FROM day_votes WHERE game_id = ? AND round = ?
    `);
    return stmt.all(gameId, round) as DayVoteRow[];
  }
}
