import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import http from 'http';
import { AddressInfo } from 'net';
import { createApp } from '../src/index';
import { closeDatabase } from '../src/db/database';
import { GameStatePublic, Role, MafiaChatMessage } from '@mafia/shared';

interface PlayerClient {
  name: string;
  socket: ClientSocket;
  playerId: string;
  sessionToken: string;
  latestState: GameStatePublic | null;
  mafiaMessages: MafiaChatMessage[];
  investigationResults: Array<{ targetId: string; targetName: string; isMafia: boolean }>;
  gameOverEvents: Array<{ winner: 'town' | 'mafia'; roles: Record<string, Role> }>;
}

describe('End-to-End Multi-Client Simulation Test', () => {
  let server: http.Server;
  let port: number;
  let serverUrl: string;

  beforeAll(async () => {
    const appData = createApp(':memory:', 1000); // 1s grace period for tests
    server = appData.server;

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as AddressInfo;
        port = addr.port;
        serverUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => {
        closeDatabase();
        resolve();
      });
    });
  });

  function createPlayerClient(name: string): PlayerClient {
    const socket = Client(serverUrl, {
      transports: ['websocket'],
      forceNew: true,
      autoConnect: true,
    });

    const client: PlayerClient = {
      name,
      socket,
      playerId: '',
      sessionToken: '',
      latestState: null,
      mafiaMessages: [],
      investigationResults: [],
      gameOverEvents: [],
    };

    socket.on('game-state', (state: GameStatePublic) => {
      client.latestState = state;
    });

    socket.on('mafia-message', (msg: MafiaChatMessage) => {
      client.mafiaMessages.push(msg);
    });

    socket.on('investigation-result', (data) => {
      client.investigationResults.push(data);
    });

    socket.on('game-over', (data) => {
      client.gameOverEvents.push(data);
    });

    return client;
  }

  function waitForCondition(
    player: PlayerClient,
    predicate: (s: GameStatePublic) => boolean,
    timeoutMs = 5000,
    desc = 'condition'
  ): Promise<GameStatePublic> {
    if (player.latestState && predicate(player.latestState)) {
      return Promise.resolve(player.latestState);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        player.socket.off('game-state', handler);
        reject(
          new Error(
            `Timeout waiting for ${player.name} on ${desc}. Current phase: ${player.latestState?.phase}, round: ${player.latestState?.round}`
          )
        );
      }, timeoutMs);

      const handler = (state: GameStatePublic) => {
        if (predicate(state)) {
          clearTimeout(timer);
          player.socket.off('game-state', handler);
          resolve(state);
        }
      };

      player.socket.on('game-state', handler);
    });
  }

  function waitForAll(
    players: PlayerClient[],
    predicate: (s: GameStatePublic) => boolean,
    timeoutMs = 5000,
    desc = 'all players condition'
  ): Promise<GameStatePublic[]> {
    return Promise.all(players.map((p) => waitForCondition(p, predicate, timeoutMs, `${desc} for ${p.name}`)));
  }

  it('Scenario A: Full Game Flow (Lobby -> Night -> Reveal -> Vote -> Elimination -> God View -> Win -> New Game)', async () => {
    // 1. Initialize 4 players
    const alice = createPlayerClient('Alice');
    const bob = createPlayerClient('Bob');
    const charlie = createPlayerClient('Charlie');
    const david = createPlayerClient('David');
    const allPlayers = [alice, bob, charlie, david];

    // Wait for all to connect
    await Promise.all(
      allPlayers.map(
        (p) =>
          new Promise<void>((res) => {
            if (p.socket.connected) res();
            else p.socket.on('connect', () => res());
          })
      )
    );

    // 2. Alice creates room
    const createRes = await new Promise<{ success: boolean; roomCode: string; playerId: string; sessionToken: string }>(
      (res) => {
        alice.socket.emit('create-room', { playerName: 'Alice' }, (resp: any) => res(resp));
      }
    );

    expect(createRes.success).toBe(true);
    expect(createRes.roomCode).toBeDefined();
    expect(createRes.roomCode).toHaveLength(6);
    expect(createRes.sessionToken).toBeDefined();

    alice.playerId = createRes.playerId;
    alice.sessionToken = createRes.sessionToken;
    const roomCode = createRes.roomCode;

    // 3. Bob, Charlie, David join room
    for (const player of [bob, charlie, david]) {
      const joinRes = await new Promise<{ success: boolean; playerId: string; sessionToken: string }>((res) => {
        player.socket.emit(
          'join-room',
          { roomCode, playerName: player.name },
          (resp: any) => res(resp)
        );
      });
      expect(joinRes.success).toBe(true);
      player.playerId = joinRes.playerId;
      player.sessionToken = joinRes.sessionToken;
    }

    // 4. Verify lobby state shows 4 players
    await waitForAll(allPlayers, (s) => s.phase === 'lobby' && s.players.length === 4);
    for (const p of allPlayers) {
      expect(p.latestState?.players.length).toBe(4);
      expect(p.latestState?.phase).toBe('lobby');
      const names = p.latestState?.players.map((x) => x.name);
      expect(names).toContain('Alice');
      expect(names).toContain('Bob');
      expect(names).toContain('Charlie');
      expect(names).toContain('David');
    }

    // 5. Start game
    const startRes = await new Promise<{ success: boolean }>((res) => {
      alice.socket.emit('start-game', { roomCode }, (resp: any) => res(resp));
    });
    expect(startRes.success).toBe(true);

    // 6. Verify all 4 players receive their role and phase is night round 1
    await waitForAll(allPlayers, (s) => s.phase === 'night' && s.round === 1 && !!s.selfRole);

    const roles: Record<Role, PlayerClient> = {} as any;
    for (const p of allPlayers) {
      const role = p.latestState!.selfRole!;
      expect(['mafia', 'doctor', 'police', 'citizen']).toContain(role);
      roles[role] = p;
    }

    // Verify exactly 1 Mafia, 1 Doctor, 1 Police, 1 Citizen
    expect(roles.mafia).toBeDefined();
    expect(roles.doctor).toBeDefined();
    expect(roles.police).toBeDefined();
    expect(roles.citizen).toBeDefined();

    const mafiaPlayer = roles.mafia;
    const doctorPlayer = roles.doctor;
    const policePlayer = roles.police;
    const citizenPlayer = roles.citizen;

    // Verify Mafia is leader
    expect(mafiaPlayer.latestState?.isMafiaLeader).toBe(true);

    // 7. Night Phase:
    // 7a. Mafia sends private chat message -> verify only Mafia receives it
    mafiaPlayer.socket.emit('mafia-chat', { roomCode, message: 'Greetings from the shadows' });
    await new Promise((r) => setTimeout(r, 200));

    expect(mafiaPlayer.mafiaMessages.length).toBe(1);
    expect(mafiaPlayer.mafiaMessages[0].message).toBe('Greetings from the shadows');
    expect(doctorPlayer.mafiaMessages.length).toBe(0);
    expect(policePlayer.mafiaMessages.length).toBe(0);
    expect(citizenPlayer.mafiaMessages.length).toBe(0);

    // 7b. Police investigates a player -> verify only Police receives investigation result
    const policeRes = await new Promise<{ success: boolean; isMafia?: boolean }>((res) => {
      policePlayer.socket.emit(
        'police-investigate',
        { roomCode, targetId: mafiaPlayer.playerId },
        (resp: any) => res(resp)
      );
    });
    expect(policeRes.success).toBe(true);
    expect(policeRes.isMafia).toBe(true);
    expect(policePlayer.investigationResults.length).toBe(1);
    expect(policePlayer.investigationResults[0].targetId).toBe(mafiaPlayer.playerId);
    expect(policePlayer.investigationResults[0].isMafia).toBe(true);

    // Verify non-police did not receive investigation result
    expect(mafiaPlayer.investigationResults.length).toBe(0);
    expect(doctorPlayer.investigationResults.length).toBe(0);
    expect(citizenPlayer.investigationResults.length).toBe(0);

    // 7c. Doctor protects Citizen
    const doctorRes = await new Promise<{ success: boolean }>((res) => {
      doctorPlayer.socket.emit(
        'doctor-protect',
        { roomCode, targetId: citizenPlayer.playerId },
        (resp: any) => res(resp)
      );
    });
    expect(doctorRes.success).toBe(true);

    // 7d. Mafia submits kill target: Target Citizen (so Doctor saves Citizen!)
    const killRes = await new Promise<{ success: boolean }>((res) => {
      mafiaPlayer.socket.emit(
        'mafia-kill',
        { roomCode, targetId: citizenPlayer.playerId },
        (resp: any) => res(resp)
      );
    });
    expect(killRes.success).toBe(true);

    // 7e. Server automatically advances to Day Reveal when all living special roles acted
    await waitForAll(allPlayers, (s) => s.phase === 'day_reveal');

    // 8. Day Reveal Phase:
    // Verify outcome announcement (Doctor saved citizen, no one died)
    for (const p of allPlayers) {
      expect(p.latestState?.dayResults?.savedByDoctor).toBe(true);
      expect(p.latestState?.dayResults?.killedPlayerId).toBeNull();
      expect(p.latestState?.players.every((pl) => pl.isAlive)).toBe(true);
    }

    // 9. Any alive player clicks "Proceed to Vote" (e.g. David / citizen)
    const proceedRes = await new Promise<{ success: boolean }>((res) => {
      citizenPlayer.socket.emit('proceed-to-vote', { roomCode }, (resp: any) => res(resp));
    });
    expect(proceedRes.success).toBe(true);

    // 10. Day Voting Phase:
    await waitForAll(allPlayers, (s) => s.phase === 'day_voting');

    // 10a. First test tie vote scenario:
    // Mafia and Doctor vote for Citizen; Police and Citizen vote for Doctor (2 vs 2 tie)
    await Promise.all([
      new Promise<void>((r) => mafiaPlayer.socket.emit('cast-vote', { roomCode, targetId: citizenPlayer.playerId }, () => r())),
      new Promise<void>((r) => doctorPlayer.socket.emit('cast-vote', { roomCode, targetId: citizenPlayer.playerId }, () => r())),
      new Promise<void>((r) => policePlayer.socket.emit('cast-vote', { roomCode, targetId: doctorPlayer.playerId }, () => r())),
      new Promise<void>((r) => citizenPlayer.socket.emit('cast-vote', { roomCode, targetId: doctorPlayer.playerId }, () => r())),
    ]);

    // On tie: no elimination! Advances to Night Round 2
    await waitForAll(allPlayers, (s) => s.phase === 'night' && s.round === 2);
    for (const p of allPlayers) {
      expect(p.latestState?.players.every((pl) => pl.isAlive)).toBe(true);
    }

    // 11. Night Round 2:
    // Mafia kills Citizen; Doctor protects Self; Police investigates Citizen
    await Promise.all([
      new Promise<void>((r) => mafiaPlayer.socket.emit('mafia-kill', { roomCode, targetId: citizenPlayer.playerId }, () => r())),
      new Promise<void>((r) => doctorPlayer.socket.emit('doctor-protect', { roomCode, targetId: doctorPlayer.playerId }, () => r())),
      new Promise<void>((r) => policePlayer.socket.emit('police-investigate', { roomCode, targetId: citizenPlayer.playerId }, () => r())),
    ]);

    // Automatically advances to Day Reveal round 2
    await waitForAll(allPlayers, (s) => s.phase === 'day_reveal' && s.round === 2);

    // Citizen was killed!
    expect(mafiaPlayer.latestState?.dayResults?.killedPlayerId).toBe(citizenPlayer.playerId);

    // Citizen is now eliminated!
    // Verify God View for eliminated Citizen:
    await waitForCondition(citizenPlayer, (s) => !s.players.find((pl) => pl.id === citizenPlayer.playerId)?.isAlive);
    expect(citizenPlayer.latestState?.spectatorGodView).toBeDefined();
    expect(citizenPlayer.latestState?.spectatorGodView?.playerRoles).toBeDefined();
    expect(citizenPlayer.latestState?.spectatorGodView?.playerRoles[mafiaPlayer.playerId]).toBe('mafia');
    expect(citizenPlayer.latestState?.spectatorGodView?.playerRoles[doctorPlayer.playerId]).toBe('doctor');

    // Verify living players DO NOT receive hidden roles or spectatorGodView
    expect(policePlayer.latestState?.spectatorGodView).toBeUndefined();
    // In police's player list, citizen role is NOT revealed (remains hidden until game over)
    const citizenInPoliceView = policePlayer.latestState?.players.find((pl) => pl.id === citizenPlayer.playerId);
    expect(citizenInPoliceView?.role).toBeUndefined();

    // 12. Proceed to Vote for round 2
    await new Promise<void>((r) => doctorPlayer.socket.emit('proceed-to-vote', { roomCode }, () => r()));
    await waitForAll([mafiaPlayer, doctorPlayer, policePlayer], (s) => s.phase === 'day_voting');

    // 13. Living players vote out Doctor!
    // Living players: Mafia, Doctor, Police (3 alive)
    // Mafia votes Doctor, Police votes Doctor, Doctor votes Mafia -> Doctor eliminated!
    // Resulting living: Mafia (1), Police (1).
    // 1 living Mafia >= 1 living non-Mafia => MAFIA WINS!
    await Promise.all([
      new Promise<void>((r) => mafiaPlayer.socket.emit('cast-vote', { roomCode, targetId: doctorPlayer.playerId }, () => r())),
      new Promise<void>((r) => policePlayer.socket.emit('cast-vote', { roomCode, targetId: doctorPlayer.playerId }, () => r())),
      new Promise<void>((r) => doctorPlayer.socket.emit('cast-vote', { roomCode, targetId: mafiaPlayer.playerId }, () => r())),
    ]);

    // 14. Verify Game Over
    await waitForAll(allPlayers, (s) => s.phase === 'game_over');

    for (const p of allPlayers) {
      expect(p.latestState?.winner).toBe('mafia');
      // All player roles are revealed at game over
      expect(p.latestState?.allRoles).toBeDefined();
      expect(p.latestState?.allRoles?.[mafiaPlayer.playerId]).toBe('mafia');
      expect(p.latestState?.allRoles?.[doctorPlayer.playerId]).toBe('doctor');
      expect(p.latestState?.allRoles?.[policePlayer.playerId]).toBe('police');
      expect(p.latestState?.allRoles?.[citizenPlayer.playerId]).toBe('citizen');

      // Verify game-over event was received
      expect(p.gameOverEvents.length).toBeGreaterThanOrEqual(1);
      expect(p.gameOverEvents[0].winner).toBe('mafia');
      expect(p.gameOverEvents[0].roles[mafiaPlayer.playerId]).toBe('mafia');
    }

    // 15. Subsequent Game ("New Game"):
    // Any player clicks "new-game"
    const newGameRes = await new Promise<{ success: boolean }>((res) => {
      charlie.socket.emit('new-game', { roomCode }, (resp: any) => res(resp));
    });
    expect(newGameRes.success).toBe(true);

    // Verify resets to night round 1 with all 4 players alive and new shuffled roles
    await waitForAll(allPlayers, (s) => s.phase === 'night' && s.round === 1);

    for (const p of allPlayers) {
      expect(p.latestState?.round).toBe(1);
      expect(p.latestState?.phase).toBe('night');
      expect(p.latestState?.players.length).toBe(4);
      expect(p.latestState?.players.every((pl) => pl.isAlive)).toBe(true);
      expect(p.latestState?.winner).toBeNull();
      expect(p.latestState?.selfRole).toBeDefined();
    }

    // Disconnect clients
    allPlayers.forEach((p) => p.socket.disconnect());
  });

  it('Scenario B: Disconnection and Reconnection Resuming Exact Game State', async () => {
    const alice = createPlayerClient('AliceB');
    const bob = createPlayerClient('BobB');
    const charlie = createPlayerClient('CharlieB');
    const david = createPlayerClient('DavidB');
    const allPlayers = [alice, bob, charlie, david];

    // Wait for connect
    await Promise.all(
      allPlayers.map(
        (p) =>
          new Promise<void>((res) => {
            if (p.socket.connected) res();
            else p.socket.on('connect', () => res());
          })
      )
    );

    // Create room
    const createRes = await new Promise<{ success: boolean; roomCode: string; playerId: string; sessionToken: string }>(
      (res) => {
        alice.socket.emit('create-room', { playerName: 'AliceB' }, (resp: any) => res(resp));
      }
    );
    alice.playerId = createRes.playerId;
    alice.sessionToken = createRes.sessionToken;
    const roomCode = createRes.roomCode;

    // Others join
    for (const p of [bob, charlie, david]) {
      const joinRes = await new Promise<{ success: boolean; playerId: string; sessionToken: string }>((res) => {
        p.socket.emit('join-room', { roomCode, playerName: p.name }, (resp: any) => res(resp));
      });
      p.playerId = joinRes.playerId;
      p.sessionToken = joinRes.sessionToken;
    }

    // Wait for lobby with 4 players
    await waitForAll(allPlayers, (s) => s.phase === 'lobby' && s.players.length === 4);

    // Start game
    await new Promise<void>((r) => alice.socket.emit('start-game', { roomCode }, () => r()));
    await waitForAll(allPlayers, (s) => s.phase === 'night' && s.round === 1);

    const bobRoleBeforeDisconnect = bob.latestState?.selfRole;
    expect(bobRoleBeforeDisconnect).toBeDefined();

    // Now simulate Bob disconnecting
    bob.socket.disconnect();

    // Verify remaining players see Bob marked as disconnected
    await waitForCondition(
      alice,
      (s) => s.players.find((pl) => pl.id === bob.playerId)?.isConnected === false,
      5000,
      'Bob disconnected status'
    );

    // Now Bob reconnects on a new socket with his session token
    const newBobSocket = Client(serverUrl, {
      transports: ['websocket'],
      forceNew: true,
      autoConnect: true,
    });

    await new Promise<void>((res) => {
      if (newBobSocket.connected) res();
      else newBobSocket.on('connect', () => res());
    });

    const reconnectRes = await new Promise<{ success: boolean; gameState?: GameStatePublic }>((res) => {
      newBobSocket.emit(
        'reconnect-session',
        { roomCode, sessionToken: bob.sessionToken },
        (resp: any) => res(resp)
      );
    });

    expect(reconnectRes.success).toBe(true);
    expect(reconnectRes.gameState).toBeDefined();
    expect(reconnectRes.gameState?.roomCode).toBe(roomCode);
    expect(reconnectRes.gameState?.phase).toBe('night');
    expect(reconnectRes.gameState?.round).toBe(1);
    expect(reconnectRes.gameState?.selfRole).toBe(bobRoleBeforeDisconnect);

    // Verify Bob is now marked connected again for Alice
    await waitForCondition(
      alice,
      (s) => s.players.find((pl) => pl.id === bob.playerId)?.isConnected === true,
      5000,
      'Bob reconnected status'
    );

    // Cleanup
    alice.socket.disconnect();
    charlie.socket.disconnect();
    david.socket.disconnect();
    newBobSocket.disconnect();
  });
});
