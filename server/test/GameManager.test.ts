import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { initDatabase, closeDatabase } from '../src/db/database';
import { Repository } from '../src/db/repository';
import { GameManager } from '../src/game/GameManager';

describe('GameManager', () => {
  let db: Database.Database;
  let repo: Repository;
  let gameManager: GameManager;

  beforeEach(() => {
    vi.useFakeTimers();
    db = initDatabase(':memory:');
    repo = new Repository(db);
    gameManager = new GameManager(repo, 60000);
  });

  afterEach(() => {
    vi.useRealTimers();
    closeDatabase();
  });

  it('creates and joins rooms successfully', () => {
    const host = gameManager.createRoom('HostPlayer', 'socket-1');
    expect(host.roomCode).toHaveLength(6);
    expect(host.sessionToken).toBeDefined();

    const p2 = gameManager.joinRoom(host.roomCode, 'Player 2', 'socket-2');
    const p3 = gameManager.joinRoom(host.roomCode, 'Player 3', 'socket-3');
    const p4 = gameManager.joinRoom(host.roomCode, 'Player 4', 'socket-4');

    expect(p2.playerId).toBeDefined();
    expect(p3.playerId).toBeDefined();
    expect(p4.playerId).toBeDefined();

    const room = gameManager.getRoom(host.roomCode);
    expect(room?.players.size).toBe(4);
    expect(room?.phase).toBe('lobby');
  });

  it('prevents starting game with fewer than 4 players', () => {
    const host = gameManager.createRoom('HostPlayer', 'socket-1');
    gameManager.joinRoom(host.roomCode, 'Player 2', 'socket-2');

    expect(() => gameManager.startGame(host.roomCode)).toThrow(/minimum 4/i);
  });

  it('plays full round: start game -> night -> reveal -> vote -> game over / next round', () => {
    const host = gameManager.createRoom('Host', 'socket-1');
    const p2 = gameManager.joinRoom(host.roomCode, 'Alice', 'socket-2');
    const p3 = gameManager.joinRoom(host.roomCode, 'Bob', 'socket-3');
    const p4 = gameManager.joinRoom(host.roomCode, 'Charlie', 'socket-4');

    // Start game
    gameManager.startGame(host.roomCode);
    const room = gameManager.getRoom(host.roomCode)!;
    expect(room.phase).toBe('night');
    expect(room.round).toBe(1);

    // Identify players by role
    const playersList = Array.from(room.players.values());
    const mafia = playersList.find(p => p.role === 'mafia')!;
    const doctor = playersList.find(p => p.role === 'doctor')!;
    const police = playersList.find(p => p.role === 'police')!;
    const citizen = playersList.find(p => p.role === 'citizen')!;

    expect(mafia).toBeDefined();
    expect(doctor).toBeDefined();
    expect(police).toBeDefined();
    expect(citizen).toBeDefined();

    // Check tailored state for citizen: cannot see other roles
    const citizenState = gameManager.getPublicGameState(room.code, citizen.id);
    expect(citizenState.selfRole).toBe('citizen');
    expect(citizenState.spectatorGodView).toBeUndefined();
    for (const p of citizenState.players) {
      if (p.id !== citizen.id) {
        expect(p.role).toBeUndefined();
      }
    }

    // Mafia sends private chat
    const chatMsg = gameManager.sendMafiaChat(room.code, mafia.id, 'Hello secret mafia!');
    expect(chatMsg.message).toBe('Hello secret mafia!');

    // Police investigates citizen
    const policeResult = gameManager.handlePoliceInvestigate(room.code, police.id, citizen.id);
    expect(policeResult.isMafia).toBe(false);

    // Doctor protects mafia (not saving citizen)
    gameManager.handleDoctorProtect(room.code, doctor.id, mafia.id);

    // Mafia leader submits kill on citizen
    gameManager.handleMafiaKill(room.code, mafia.id, citizen.id);

    // All night actions submitted -> automatically resolves to day_reveal or game_over!
    // Note: With 4 players (1 mafia, 1 doctor, 1 police, 1 citizen):
    // When citizen is killed, living players: 1 mafia vs 2 non-mafias (doctor, police).
    // Mafia < non-mafia, so game continues to day_reveal!
    expect(room.phase).toBe('day_reveal');
    expect(room.dayResults?.killedPlayerId).toBe(citizen.id);
    expect(citizen.isAlive).toBe(false);

    // Dead citizen now gets god view!
    const deadCitizenState = gameManager.getPublicGameState(room.code, citizen.id);
    expect(deadCitizenState.spectatorGodView).toBeDefined();
    expect(deadCitizenState.spectatorGodView?.playerRoles[mafia.id]).toBe('mafia');
    expect(deadCitizenState.spectatorGodView?.playerRoles[doctor.id]).toBe('doctor');

    // Alive player proceeds to vote
    gameManager.proceedToVote(room.code, mafia.id);
    expect(room.phase).toBe('day_voting');

    // Voting: doctor and police vote for mafia, mafia votes for doctor
    gameManager.handleCastVote(room.code, doctor.id, mafia.id);
    gameManager.handleCastVote(room.code, police.id, mafia.id);
    gameManager.handleCastVote(room.code, mafia.id, doctor.id);

    // All alive players voted -> mafia is eliminated!
    // All mafias eliminated -> Town wins!
    expect(room.phase).toBe('game_over');
    expect(room.winner).toBe('town');
    expect(mafia.isAlive).toBe(false);

    // Game over state has all roles revealed for everyone
    const finalHostState = gameManager.getPublicGameState(room.code, host.playerId);
    expect(finalHostState.winner).toBe('town');
    expect(finalHostState.allRoles).toBeDefined();
  });

  it('handles disconnection grace period and auto-elimination', () => {
    const host = gameManager.createRoom('Host', 'socket-1');
    const p2 = gameManager.joinRoom(host.roomCode, 'Alice', 'socket-2');
    const p3 = gameManager.joinRoom(host.roomCode, 'Bob', 'socket-3');
    const p4 = gameManager.joinRoom(host.roomCode, 'Charlie', 'socket-4');
    const p5 = gameManager.joinRoom(host.roomCode, 'Dave', 'socket-5');

    gameManager.startGame(host.roomCode);
    const room = gameManager.getRoom(host.roomCode)!;

    // Disconnect Alice
    gameManager.handleSocketDisconnect('socket-2');
    const alice = room.players.get(p2.playerId)!;
    expect(alice.isConnected).toBe(false);
    expect(alice.isAlive).toBe(true);

    // Advance timers by 60 seconds (grace period expires)
    vi.advanceTimersByTime(60000);

    // Alice is auto-eliminated
    expect(alice.isAlive).toBe(false);
  });

  it('supports reconnection within grace period using sessionToken', () => {
    const host = gameManager.createRoom('Host', 'socket-1');
    const p2 = gameManager.joinRoom(host.roomCode, 'Alice', 'socket-2');
    const p3 = gameManager.joinRoom(host.roomCode, 'Bob', 'socket-3');
    const p4 = gameManager.joinRoom(host.roomCode, 'Charlie', 'socket-4');

    gameManager.startGame(host.roomCode);
    const room = gameManager.getRoom(host.roomCode)!;

    // Disconnect Alice
    gameManager.handleSocketDisconnect('socket-2');
    const alice = room.players.get(p2.playerId)!;
    expect(alice.isConnected).toBe(false);

    // Advance 30 seconds (less than 60s)
    vi.advanceTimersByTime(30000);

    // Alice reconnects with new socket
    const reconnectedState = gameManager.reconnectSession(host.roomCode, p2.sessionToken, 'socket-2-new');
    expect(alice.isConnected).toBe(true);
    expect(alice.isAlive).toBe(true);
    expect(reconnectedState.selfPlayerId).toBe(p2.playerId);

    // Advance another 40 seconds - timer should not eliminate Alice
    vi.advanceTimersByTime(40000);
    expect(alice.isAlive).toBe(true);
  });

  it('resets and starts a new game with new-game', () => {
    const host = gameManager.createRoom('Host', 'socket-1');
    gameManager.joinRoom(host.roomCode, 'Alice', 'socket-2');
    gameManager.joinRoom(host.roomCode, 'Bob', 'socket-3');
    gameManager.joinRoom(host.roomCode, 'Charlie', 'socket-4');

    gameManager.startGame(host.roomCode);
    const room = gameManager.getRoom(host.roomCode)!;

    gameManager.newGame(host.roomCode);
    expect(room.phase).toBe('night');
    expect(room.round).toBe(1);
    for (const player of room.players.values()) {
      expect(player.isAlive).toBe(true);
      expect(player.role).toBeDefined();
    }
  });
});
