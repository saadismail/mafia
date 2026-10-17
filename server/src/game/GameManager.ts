import { v4 as uuidv4 } from 'uuid';
import {
  Role,
  GamePhase,
  PlayerPublic,
  GameStatePublic,
  DayResults,
  VotingResult,
  SpectatorGodView,
  MafiaChatMessage,
} from '@mafia/shared';
import { Repository } from '../db/repository';
import { generateRoomCode } from '../utils/codeGenerator';
import { assignRoles } from './RoleAssigner';
import { checkWinCondition } from './WinChecker';
import {
  getMafiaLeader,
  areAllNightActionsSubmitted,
  resolveNightActions,
  NightPlayer,
} from './NightPhase';
import { areAllVotesSubmitted, evaluateVotes, DayPlayer } from './DayPhase';

export interface InternalPlayer {
  id: string;
  roomCode: string;
  name: string;
  sessionToken: string;
  socketId: string | null;
  isConnected: boolean;
  role?: Role;
  isAlive: boolean;
  disconnectedAt?: number | null;
}

export interface InternalRoom {
  code: string;
  phase: GamePhase;
  round: number;
  gameId: number | null;
  players: Map<string, InternalPlayer>; // playerId -> InternalPlayer
  winner?: 'town' | 'mafia' | null;
  // Night actions for current round
  mafiaKillTargetId: string | null;
  policeInvestigateTargetId: string | null;
  doctorProtectTargetId: string | null;
  policeResult: {
    targetId: string;
    targetName: string;
    isMafia: boolean;
  } | null;
  // Day reveal results
  dayResults: DayResults | null;
  // Voting for current round: voterId -> targetId
  votes: Record<string, string>;
  votingResult: VotingResult | null;
  // Chat history for mafia
  mafiaChatHistory: MafiaChatMessage[];
}

export type BroadcastCallback = (roomCode: string, event: string, data: any) => void;
export type DirectMessageCallback = (socketId: string, event: string, data: any) => void;

export class GameManager {
  private rooms: Map<string, InternalRoom> = new Map();
  private sessionToPlayer: Map<string, { roomCode: string; playerId: string }> = new Map();
  private socketToPlayer: Map<string, { roomCode: string; playerId: string }> = new Map();
  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  private repo: Repository;
  private disconnectGracePeriodMs: number;

  private onBroadcast?: BroadcastCallback;
  private onDirectMessage?: DirectMessageCallback;

  constructor(
    repo: Repository,
    disconnectGracePeriodMs: number = 60000,
    callbacks?: {
      onBroadcast?: BroadcastCallback;
      onDirectMessage?: DirectMessageCallback;
    }
  ) {
    this.repo = repo;
    this.disconnectGracePeriodMs = disconnectGracePeriodMs;
    this.onBroadcast = callbacks?.onBroadcast;
    this.onDirectMessage = callbacks?.onDirectMessage;

    this.recoverStateFromDb();
  }

  public setCallbacks(callbacks: {
    onBroadcast?: BroadcastCallback;
    onDirectMessage?: DirectMessageCallback;
  }) {
    this.onBroadcast = callbacks.onBroadcast;
    this.onDirectMessage = callbacks.onDirectMessage;
  }

  private recoverStateFromDb(): void {
    try {
      const dbRooms = this.repo.getAllRooms();
      for (const roomRow of dbRooms) {
        const room: InternalRoom = {
          code: roomRow.code,
          phase: 'lobby',
          round: 1,
          gameId: null,
          players: new Map(),
          winner: null,
          mafiaKillTargetId: null,
          policeInvestigateTargetId: null,
          doctorProtectTargetId: null,
          policeResult: null,
          dayResults: null,
          votes: {},
          votingResult: null,
          mafiaChatHistory: [],
        };

        const dbPlayers = this.repo.getPlayersByRoom(roomRow.code);
        for (const p of dbPlayers) {
          const internalPlayer: InternalPlayer = {
            id: p.id,
            roomCode: p.room_code,
            name: p.name,
            sessionToken: p.session_token,
            socketId: null,
            isConnected: false, // Default to disconnected until socket connects
            isAlive: true,
          };
          room.players.set(p.id, internalPlayer);
          this.sessionToPlayer.set(p.session_token, { roomCode: p.room_code, playerId: p.id });
        }

        const latestGame = this.repo.getLatestGameForRoom(roomRow.code);
        if (latestGame) {
          room.gameId = latestGame.id;
          room.round = latestGame.current_round;
          room.phase = (latestGame.status as GamePhase) || 'lobby';
          room.winner = latestGame.winner;

          const gamePlayers = this.repo.getGamePlayers(latestGame.id);
          for (const gp of gamePlayers) {
            const player = room.players.get(gp.player_id);
            if (player) {
              player.role = gp.role;
              player.isAlive = gp.is_alive === 1;
            }
          }

          // Restore night actions for current round
          const nightActions = this.repo.getNightActionsForRound(latestGame.id, room.round);
          for (const act of nightActions) {
            if (act.action_type === 'kill') room.mafiaKillTargetId = act.target_id;
            if (act.action_type === 'investigate') {
              room.policeInvestigateTargetId = act.target_id;
              const target = room.players.get(act.target_id);
              if (target) {
                room.policeResult = {
                  targetId: target.id,
                  targetName: target.name,
                  isMafia: target.role === 'mafia',
                };
              }
            }
            if (act.action_type === 'protect') room.doctorProtectTargetId = act.target_id;
          }

          // Restore day votes
          const dayVotes = this.repo.getDayVotesForRound(latestGame.id, room.round);
          for (const v of dayVotes) {
            room.votes[v.voter_id] = v.target_id;
          }
        }

        this.rooms.set(room.code, room);
      }
    } catch (err) {
      console.warn('Error recovering state from database:', err);
    }
  }

  // --- Room Operations ---

  public createRoom(playerName: string, socketId?: string): {
    roomCode: string;
    playerId: string;
    sessionToken: string;
  } {
    const trimmedName = playerName.trim();
    if (!trimmedName) {
      throw new Error('Player name cannot be empty');
    }

    let roomCode = generateRoomCode();
    while (this.rooms.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    const playerId = uuidv4();
    const sessionToken = uuidv4();

    // Persist to DB
    this.repo.createRoom(roomCode, 'lobby');
    this.repo.createPlayer({
      id: playerId,
      roomCode,
      name: trimmedName,
      sessionToken,
      connected: !!socketId,
    });

    const room: InternalRoom = {
      code: roomCode,
      phase: 'lobby',
      round: 1,
      gameId: null,
      players: new Map(),
      winner: null,
      mafiaKillTargetId: null,
      policeInvestigateTargetId: null,
      doctorProtectTargetId: null,
      policeResult: null,
      dayResults: null,
      votes: {},
      votingResult: null,
      mafiaChatHistory: [],
    };

    const player: InternalPlayer = {
      id: playerId,
      roomCode,
      name: trimmedName,
      sessionToken,
      socketId: socketId || null,
      isConnected: !!socketId,
      isAlive: true,
    };

    room.players.set(playerId, player);
    this.rooms.set(roomCode, room);

    this.sessionToPlayer.set(sessionToken, { roomCode, playerId });
    if (socketId) {
      this.socketToPlayer.set(socketId, { roomCode, playerId });
    }

    return { roomCode, playerId, sessionToken };
  }

  public joinRoom(roomCode: string, playerName: string, socketId?: string, sessionToken?: string): {
    roomCode: string;
    playerId: string;
    sessionToken: string;
  } {
    const code = roomCode.toUpperCase().trim();
    const trimmedName = playerName.trim();

    if (!code) throw new Error('Room code is required');
    if (!trimmedName) throw new Error('Player name is required');

    const room = this.rooms.get(code);
    if (!room) {
      throw new Error(`Room ${code} not found`);
    }

    // If sessionToken is provided, check if player is reconnecting
    if (sessionToken && this.sessionToPlayer.has(sessionToken)) {
      const mapping = this.sessionToPlayer.get(sessionToken)!;
      if (mapping.roomCode === code) {
        const existingPlayer = room.players.get(mapping.playerId);
        if (existingPlayer) {
          this.handlePlayerReconnect(existingPlayer, socketId);
          return {
            roomCode: code,
            playerId: existingPlayer.id,
            sessionToken: existingPlayer.sessionToken,
          };
        }
      }
    }

    // New player joining
    if (room.phase !== 'lobby') {
      throw new Error('Game is already in progress');
    }

    if (room.players.size >= 15) {
      throw new Error('Room is full (maximum 15 players)');
    }

    // Check duplicate name in room (case-insensitive)
    for (const p of room.players.values()) {
      if (p.name.toLowerCase() === trimmedName.toLowerCase()) {
        throw new Error(`A player named "${trimmedName}" is already in this room`);
      }
    }

    const playerId = uuidv4();
    const token = uuidv4();

    this.repo.createPlayer({
      id: playerId,
      roomCode: code,
      name: trimmedName,
      sessionToken: token,
      connected: !!socketId,
    });

    const player: InternalPlayer = {
      id: playerId,
      roomCode: code,
      name: trimmedName,
      sessionToken: token,
      socketId: socketId || null,
      isConnected: !!socketId,
      isAlive: true,
    };

    room.players.set(playerId, player);
    this.sessionToPlayer.set(token, { roomCode: code, playerId });
    if (socketId) {
      this.socketToPlayer.set(socketId, { roomCode: code, playerId });
    }

    return { roomCode: code, playerId, sessionToken: token };
  }

  public reconnectSession(roomCode: string, sessionToken: string, socketId: string): GameStatePublic {
    const code = roomCode.toUpperCase().trim();
    const room = this.rooms.get(code);
    if (!room) {
      throw new Error(`Room ${code} not found`);
    }

    const mapping = this.sessionToPlayer.get(sessionToken);
    if (!mapping || mapping.roomCode !== code) {
      throw new Error('Invalid session token for this room');
    }

    const player = room.players.get(mapping.playerId);
    if (!player) {
      throw new Error('Player not found in room');
    }

    this.handlePlayerReconnect(player, socketId);
    return this.getPublicGameState(code, player.id);
  }

  private handlePlayerReconnect(player: InternalPlayer, socketId?: string): void {
    player.isConnected = true;
    player.disconnectedAt = null;

    // Clear disconnect timer if active
    const timer = this.disconnectTimers.get(player.id);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(player.id);
    }

    if (socketId) {
      if (player.socketId && this.socketToPlayer.has(player.socketId)) {
        this.socketToPlayer.delete(player.socketId);
      }
      player.socketId = socketId;
      this.socketToPlayer.set(socketId, { roomCode: player.roomCode, playerId: player.id });
    }

    this.repo.updatePlayerConnection(player.id, true, null);
  }

  public handleSocketDisconnect(socketId: string): void {
    const mapping = this.socketToPlayer.get(socketId);
    if (!mapping) return;

    this.socketToPlayer.delete(socketId);
    const room = this.rooms.get(mapping.roomCode);
    if (!room) return;

    const player = room.players.get(mapping.playerId);
    if (!player) return;

    player.isConnected = false;
    player.socketId = null;
    const nowIso = new Date().toISOString();
    player.disconnectedAt = Date.now();
    this.repo.updatePlayerConnection(player.id, false, nowIso);

    // If game is actively playing and player is alive, start grace timer
    if (room.phase !== 'lobby' && room.phase !== 'game_over' && player.isAlive) {
      const timer = setTimeout(() => {
        this.handlePlayerTimeout(room.code, player.id);
      }, this.disconnectGracePeriodMs);

      this.disconnectTimers.set(player.id, timer);
    }
  }

  private handlePlayerTimeout(roomCode: string, playerId: string): void {
    this.disconnectTimers.delete(playerId);
    const room = this.rooms.get(roomCode);
    if (!room) return;

    const player = room.players.get(playerId);
    if (!player || !player.isAlive || player.isConnected) return;

    // Auto-eliminate disconnected player
    player.isAlive = false;
    if (room.gameId) {
      this.repo.updateGamePlayerStatus(room.gameId, player.id, false);
    }

    // Check win condition
    const winResult = this.evaluateWin(room);
    if (winResult) {
      this.handleGameOver(room, winResult);
      this.broadcastGameState(room.code);
      return;
    }

    // Check if pending phase can advance now
    if (room.phase === 'night') {
      const nightActions = {
        mafiaKillTargetId: room.mafiaKillTargetId,
        policeInvestigateTargetId: room.policeInvestigateTargetId,
        doctorProtectTargetId: room.doctorProtectTargetId,
      };
      const nightPlayers = this.getNightPlayers(room);
      if (areAllNightActionsSubmitted(nightPlayers, nightActions)) {
        this.resolveNight(room);
      }
    } else if (room.phase === 'day_voting') {
      const dayPlayers = this.getDayPlayers(room);
      if (areAllVotesSubmitted(dayPlayers, room.votes)) {
        this.resolveDayVoting(room);
      }
    }

    this.broadcastGameState(room.code);
  }

  // --- Game Flow Operations ---

  public startGame(roomCode: string): void {
    const room = this.getRoomOrThrow(roomCode);

    if (room.phase !== 'lobby') {
      throw new Error('Game has already started');
    }

    const connectedPlayers = Array.from(room.players.values()).filter(p => p.isConnected);
    if (connectedPlayers.length < 4) {
      throw new Error(`Cannot start game: minimum 4 connected players required, only ${connectedPlayers.length} connected`);
    }

    // Reset game fields
    room.round = 1;
    room.winner = null;
    room.dayResults = null;
    room.votingResult = null;
    room.votes = {};
    room.mafiaKillTargetId = null;
    room.policeInvestigateTargetId = null;
    room.doctorProtectTargetId = null;
    room.policeResult = null;
    room.mafiaChatHistory = [];

    // Assign roles to connected players
    const playerIds = connectedPlayers.map(p => p.id);
    const roleMap = assignRoles(playerIds);

    // Create game in DB
    const gameId = this.repo.createGame(room.code, 'night', 1);
    room.gameId = gameId;
    room.phase = 'night';
    this.repo.updateRoomStatus(room.code, 'in_game');

    for (const player of connectedPlayers) {
      player.role = roleMap[player.id];
      player.isAlive = true;
      this.repo.addGamePlayer(gameId, player.id, player.role, true);
    }

    // Clean out players who were not connected when game started
    for (const [id, player] of room.players.entries()) {
      if (!player.isConnected) {
        room.players.delete(id);
        this.sessionToPlayer.delete(player.sessionToken);
        this.repo.deletePlayer(id);
      }
    }

    this.broadcastGameState(room.code);
  }

  public newGame(roomCode: string): void {
    const room = this.getRoomOrThrow(roomCode);

    // Cancel any pending disconnect timers
    for (const player of room.players.values()) {
      const timer = this.disconnectTimers.get(player.id);
      if (timer) {
        clearTimeout(timer);
        this.disconnectTimers.delete(player.id);
      }
    }

    // Filter connected players
    const connectedPlayers = Array.from(room.players.values()).filter(p => p.isConnected);

    // Remove permanently disconnected players
    for (const [id, player] of room.players.entries()) {
      if (!player.isConnected) {
        room.players.delete(id);
        this.sessionToPlayer.delete(player.sessionToken);
        this.repo.deletePlayer(id);
      }
    }

    if (connectedPlayers.length >= 4) {
      // Re-shuffle and start new game
      room.round = 1;
      room.winner = null;
      room.dayResults = null;
      room.votingResult = null;
      room.votes = {};
      room.mafiaKillTargetId = null;
      room.policeInvestigateTargetId = null;
      room.doctorProtectTargetId = null;
      room.policeResult = null;
      room.mafiaChatHistory = [];

      const playerIds = connectedPlayers.map(p => p.id);
      const roleMap = assignRoles(playerIds);

      const gameId = this.repo.createGame(room.code, 'night', 1);
      room.gameId = gameId;
      room.phase = 'night';
      this.repo.updateRoomStatus(room.code, 'in_game');

      for (const player of connectedPlayers) {
        player.role = roleMap[player.id];
        player.isAlive = true;
        this.repo.addGamePlayer(gameId, player.id, player.role, true);
      }
    } else {
      // Return to lobby
      room.phase = 'lobby';
      room.round = 1;
      room.winner = null;
      room.gameId = null;
      room.dayResults = null;
      room.votingResult = null;
      room.votes = {};
      room.mafiaKillTargetId = null;
      room.policeInvestigateTargetId = null;
      room.doctorProtectTargetId = null;
      room.policeResult = null;
      room.mafiaChatHistory = [];
      this.repo.updateRoomStatus(room.code, 'lobby');

      for (const player of room.players.values()) {
        player.role = undefined;
        player.isAlive = true;
      }
    }

    this.broadcastGameState(room.code);
  }

  // --- Night Phase Actions ---

  public sendMafiaChat(roomCode: string, senderPlayerId: string, message: string): MafiaChatMessage {
    const room = this.getRoomOrThrow(roomCode);
    if (room.phase !== 'night') {
      throw new Error('Mafia chat is only available during the night phase');
    }

    const sender = room.players.get(senderPlayerId);
    if (!sender) {
      throw new Error('Player not found');
    }
    if (sender.role !== 'mafia' || !sender.isAlive) {
      throw new Error('Only living Mafia members can send messages in Mafia chat');
    }

    const chatMsg: MafiaChatMessage = {
      id: uuidv4(),
      fromId: sender.id,
      fromName: sender.name,
      message: message.trim(),
      timestamp: Date.now(),
    };

    room.mafiaChatHistory.push(chatMsg);

    // Send to all living mafias and dead spectators
    for (const player of room.players.values()) {
      if (player.socketId) {
        if ((player.role === 'mafia' && player.isAlive) || !player.isAlive) {
          this.onDirectMessage?.(player.socketId, 'mafia-message', chatMsg);
        }
      }
    }

    return chatMsg;
  }

  public handleMafiaKill(roomCode: string, actorPlayerId: string, targetId: string): void {
    const room = this.getRoomOrThrow(roomCode);
    if (room.phase !== 'night') throw new Error('Action only valid in night phase');

    const actor = room.players.get(actorPlayerId);
    if (!actor || actor.role !== 'mafia' || !actor.isAlive) {
      throw new Error('Only living Mafia members can submit kill actions');
    }

    const livingMafias = this.getLivingMafias(room);
    const leader = getMafiaLeader(livingMafias, room.round);
    if (!leader || leader.id !== actor.id) {
      throw new Error(`Only the active Mafia leader (${leader ? leader.name : 'Unknown'}) can submit the kill choice`);
    }

    const target = room.players.get(targetId);
    if (!target || !target.isAlive) {
      throw new Error('Target must be an alive player in the game');
    }

    room.mafiaKillTargetId = target.id;
    if (room.gameId) {
      this.repo.recordNightAction(room.gameId, room.round, 'kill', actor.id, target.id);
    }

    this.checkNightCompletion(room);
  }

  public handlePoliceInvestigate(roomCode: string, actorPlayerId: string, targetId: string): { isMafia: boolean } {
    const room = this.getRoomOrThrow(roomCode);
    if (room.phase !== 'night') throw new Error('Action only valid in night phase');

    const actor = room.players.get(actorPlayerId);
    if (!actor || actor.role !== 'police' || !actor.isAlive) {
      throw new Error('Only living Police can investigate');
    }

    const target = room.players.get(targetId);
    if (!target || !target.isAlive) {
      throw new Error('Target must be an alive player in the game');
    }

    const isMafia = target.role === 'mafia';
    room.policeInvestigateTargetId = target.id;
    room.policeResult = {
      targetId: target.id,
      targetName: target.name,
      isMafia,
    };

    if (room.gameId) {
      this.repo.recordNightAction(room.gameId, room.round, 'investigate', actor.id, target.id);
    }

    // Direct result back to police player
    if (actor.socketId) {
      this.onDirectMessage?.(actor.socketId, 'investigation-result', {
        targetId: target.id,
        targetName: target.name,
        isMafia,
      });
    }

    this.checkNightCompletion(room);

    return { isMafia };
  }

  public handleDoctorProtect(roomCode: string, actorPlayerId: string, targetId: string): void {
    const room = this.getRoomOrThrow(roomCode);
    if (room.phase !== 'night') throw new Error('Action only valid in night phase');

    const actor = room.players.get(actorPlayerId);
    if (!actor || actor.role !== 'doctor' || !actor.isAlive) {
      throw new Error('Only living Doctor can protect');
    }

    const target = room.players.get(targetId);
    if (!target || !target.isAlive) {
      throw new Error('Target must be an alive player in the game');
    }

    room.doctorProtectTargetId = target.id;
    if (room.gameId) {
      this.repo.recordNightAction(room.gameId, room.round, 'protect', actor.id, target.id);
    }

    this.checkNightCompletion(room);
  }

  private checkNightCompletion(room: InternalRoom): void {
    const nightPlayers = this.getNightPlayers(room);
    const nightActions = {
      mafiaKillTargetId: room.mafiaKillTargetId,
      policeInvestigateTargetId: room.policeInvestigateTargetId,
      doctorProtectTargetId: room.doctorProtectTargetId,
    };

    if (areAllNightActionsSubmitted(nightPlayers, nightActions)) {
      this.resolveNight(room);
    } else {
      this.broadcastGameState(room.code);
    }
  }

  private resolveNight(room: InternalRoom): void {
    const nightPlayers = this.getNightPlayers(room);
    const resolution = resolveNightActions(
      nightPlayers,
      room.mafiaKillTargetId,
      room.doctorProtectTargetId
    );

    room.dayResults = resolution.dayResults;

    if (resolution.killedPlayerId) {
      const victim = room.players.get(resolution.killedPlayerId);
      if (victim) {
        victim.isAlive = false;
        if (room.gameId) {
          this.repo.updateGamePlayerStatus(room.gameId, victim.id, false);
        }
      }
    }

    // Check win condition after night kill
    const winResult = this.evaluateWin(room);
    if (winResult) {
      this.handleGameOver(room, winResult);
    } else {
      room.phase = 'day_reveal';
      if (room.gameId) {
        this.repo.updateGame(room.gameId, { status: 'day_reveal' });
      }
    }

    this.broadcastGameState(room.code);
  }

  // --- Day Phase Actions ---

  public proceedToVote(roomCode: string, actorPlayerId: string): void {
    const room = this.getRoomOrThrow(roomCode);
    if (room.phase !== 'day_reveal') {
      throw new Error('Can only proceed to vote from day reveal phase');
    }

    const actor = room.players.get(actorPlayerId);
    if (!actor || !actor.isAlive) {
      throw new Error('Only alive players can proceed to vote');
    }

    room.phase = 'day_voting';
    room.votes = {};
    room.votingResult = null;

    if (room.gameId) {
      this.repo.updateGame(room.gameId, { status: 'day_voting' });
    }

    this.broadcastGameState(room.code);
  }

  public handleCastVote(roomCode: string, voterPlayerId: string, targetId: string): void {
    const room = this.getRoomOrThrow(roomCode);
    if (room.phase !== 'day_voting') {
      throw new Error('Voting is only permitted during day voting phase');
    }

    const voter = room.players.get(voterPlayerId);
    if (!voter || !voter.isAlive) {
      throw new Error('Only living players can vote');
    }

    const target = room.players.get(targetId);
    if (!target || !target.isAlive) {
      throw new Error('Vote target must be an alive player');
    }

    room.votes[voter.id] = target.id;
    if (room.gameId) {
      this.repo.recordDayVote(room.gameId, room.round, voter.id, target.id);
    }

    const dayPlayers = this.getDayPlayers(room);
    if (areAllVotesSubmitted(dayPlayers, room.votes)) {
      this.resolveDayVoting(room);
    } else {
      this.broadcastGameState(room.code);
    }
  }

  private resolveDayVoting(room: InternalRoom): void {
    const dayPlayers = this.getDayPlayers(room);
    const result = evaluateVotes(dayPlayers, room.votes);
    room.votingResult = result;

    if (result.eliminatedPlayerId) {
      const eliminated = room.players.get(result.eliminatedPlayerId);
      if (eliminated) {
        eliminated.isAlive = false;
        if (room.gameId) {
          this.repo.updateGamePlayerStatus(room.gameId, eliminated.id, false);
        }
      }
    }

    // Check win condition
    const winResult = this.evaluateWin(room);
    if (winResult) {
      this.handleGameOver(room, winResult);
    } else {
      // Transition to next night round
      room.round += 1;
      room.phase = 'night';
      room.votes = {};
      room.votingResult = null;
      room.dayResults = null;
      room.mafiaKillTargetId = null;
      room.policeInvestigateTargetId = null;
      room.doctorProtectTargetId = null;
      room.policeResult = null;

      if (room.gameId) {
        this.repo.updateGame(room.gameId, {
          status: 'night',
          currentRound: room.round,
        });
      }
    }

    this.broadcastGameState(room.code);
  }

  private handleGameOver(room: InternalRoom, winner: 'town' | 'mafia'): void {
    room.phase = 'game_over';
    room.winner = winner;
    if (room.gameId) {
      this.repo.updateGame(room.gameId, { status: 'finished', winner });
    }
    this.repo.updateRoomStatus(room.code, 'game_over');

    const allRoles: Record<string, Role> = {};
    for (const p of room.players.values()) {
      if (p.role) {
        allRoles[p.id] = p.role;
      }
    }

    this.onBroadcast?.(room.code, 'game-over', { winner, roles: allRoles });
  }

  // --- State & View helpers ---

  private evaluateWin(room: InternalRoom): 'town' | 'mafia' | null {
    const playerStatuses = Array.from(room.players.values())
      .filter(p => p.role !== undefined)
      .map(p => ({
        id: p.id,
        role: p.role!,
        isAlive: p.isAlive,
      }));

    return checkWinCondition(playerStatuses);
  }

  public getPublicGameState(roomCode: string, selfPlayerId: string): GameStatePublic {
    const room = this.getRoomOrThrow(roomCode);
    const self = room.players.get(selfPlayerId);

    const isDeadSpectator = self ? !self.isAlive : false;
    const isGameOver = room.phase === 'game_over';
    const isMafiaMember = self?.role === 'mafia';

    const livingMafias = this.getLivingMafias(room);
    const currentMafiaLeader = getMafiaLeader(livingMafias, room.round);
    const isMafiaLeader = currentMafiaLeader?.id === selfPlayerId;

    // All roles mapping for spectator or game over
    const allRoles: Record<string, Role> = {};
    for (const p of room.players.values()) {
      if (p.role) {
        allRoles[p.id] = p.role;
      }
    }

    // Public player list filtered according to viewer role
    const playersPublic: PlayerPublic[] = Array.from(room.players.values()).map(p => {
      let roleToShow: Role | undefined = undefined;

      if (isGameOver || isDeadSpectator) {
        roleToShow = p.role;
      } else if (p.id === selfPlayerId) {
        roleToShow = p.role;
      } else if (isMafiaMember && p.role === 'mafia') {
        roleToShow = 'mafia';
      }

      return {
        id: p.id,
        name: p.name,
        isAlive: p.isAlive,
        isConnected: p.isConnected,
        role: roleToShow,
        isMafiaLeader: isMafiaMember && p.id === currentMafiaLeader?.id,
      };
    });

    let spectatorGodView: SpectatorGodView | undefined = undefined;
    if (isDeadSpectator || isGameOver) {
      spectatorGodView = {
        playerRoles: allRoles,
        nightActions: {
          mafiaKillTargetId: room.mafiaKillTargetId,
          doctorProtectTargetId: room.doctorProtectTargetId,
          policeInvestigateTargetId: room.policeInvestigateTargetId,
        },
        votes: { ...room.votes },
      };
    }

    // Night action completion flag
    let nightActionCompleted = false;
    if (room.phase === 'night') {
      if (self?.role === 'mafia') {
        nightActionCompleted = room.mafiaKillTargetId !== null;
      } else if (self?.role === 'police') {
        nightActionCompleted = room.policeInvestigateTargetId !== null;
      } else if (self?.role === 'doctor') {
        nightActionCompleted = room.doctorProtectTargetId !== null;
      } else {
        nightActionCompleted = true; // Citizens don't act
      }
    }

    return {
      roomCode: room.code,
      phase: room.phase,
      round: room.round,
      players: playersPublic,
      selfPlayerId,
      selfRole: self?.role,
      isMafiaLeader: isMafiaLeader,
      livingMafiaIds: (isMafiaMember || isDeadSpectator || isGameOver) ? livingMafias.map(m => m.id) : undefined,
      dayResults: room.dayResults,
      votingResult: room.votingResult,
      votesCast: (room.phase === 'day_voting' || room.votingResult) ? { ...room.votes } : undefined,
      hasVoted: self ? !!room.votes[self.id] : false,
      nightActionCompleted,
      policeInvestigationResult: self?.role === 'police' ? room.policeResult : null,
      winner: room.winner,
      allRoles: (isGameOver || isDeadSpectator) ? allRoles : undefined,
      spectatorGodView,
    };
  }

  public broadcastGameState(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    for (const player of room.players.values()) {
      if (player.socketId) {
        const tailoredState = this.getPublicGameState(room.code, player.id);
        this.onDirectMessage?.(player.socketId, 'game-state', tailoredState);
      }
    }
  }

  // --- Helper getters ---

  private getRoomOrThrow(roomCode: string): InternalRoom {
    const room = this.rooms.get(roomCode.toUpperCase().trim());
    if (!room) {
      throw new Error(`Room ${roomCode} not found`);
    }
    return room;
  }

  public getRoom(roomCode: string): InternalRoom | undefined {
    return this.rooms.get(roomCode.toUpperCase().trim());
  }

  public getPlayerBySocketId(socketId: string): InternalPlayer | undefined {
    const mapping = this.socketToPlayer.get(socketId);
    if (!mapping) return undefined;
    const room = this.rooms.get(mapping.roomCode);
    return room?.players.get(mapping.playerId);
  }

  public getLivingMafias(room: InternalRoom): NightPlayer[] {
    return Array.from(room.players.values())
      .filter(p => p.role === 'mafia' && p.isAlive)
      .map(p => ({
        id: p.id,
        name: p.name,
        role: p.role!,
        isAlive: p.isAlive,
      }));
  }

  public getNightPlayers(room: InternalRoom): NightPlayer[] {
    return Array.from(room.players.values())
      .filter(p => p.role !== undefined)
      .map(p => ({
        id: p.id,
        name: p.name,
        role: p.role!,
        isAlive: p.isAlive,
      }));
  }

  public getDayPlayers(room: InternalRoom): DayPlayer[] {
    return Array.from(room.players.values())
      .filter(p => p.isAlive)
      .map(p => ({
        id: p.id,
        name: p.name,
        isAlive: p.isAlive,
      }));
  }
}
