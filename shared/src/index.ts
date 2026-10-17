export type Role = 'mafia' | 'doctor' | 'police' | 'citizen';

export type GamePhase = 'lobby' | 'night' | 'day_reveal' | 'day_voting' | 'game_over';

export interface PlayerPublic {
  id: string;
  name: string;
  isAlive: boolean;
  isConnected: boolean;
  // Role is only included if player is dead spectator, in game_over, or for self / fellow mafias
  role?: Role;
  isMafiaLeader?: boolean;
}

export interface MafiaChatMessage {
  id: string;
  fromId: string;
  fromName: string;
  message: string;
  timestamp: number;
}

export interface DayResults {
  killedPlayerId: string | null;
  killedPlayerName: string | null;
  savedByDoctor: boolean;
  message: string;
}

export interface VoteTally {
  [targetPlayerId: string]: number; // count of votes
}

export interface VotingResult {
  eliminatedPlayerId: string | null;
  eliminatedPlayerName: string | null;
  isTie: boolean;
  voteCounts: Record<string, number>; // targetId -> count
  votesByPlayer: Record<string, string>; // voterId -> targetId
}

export interface SpectatorGodView {
  playerRoles: Record<string, Role>; // playerId -> Role
  nightActions: {
    mafiaKillTargetId: string | null;
    doctorProtectTargetId: string | null;
    policeInvestigateTargetId: string | null;
  };
  votes: Record<string, string>; // voterId -> targetId
}

export interface GameStatePublic {
  roomCode: string;
  phase: GamePhase;
  round: number;
  players: PlayerPublic[];
  selfPlayerId: string;
  selfRole?: Role;
  isMafiaLeader?: boolean;
  livingMafiaIds?: string[];
  dayResults?: DayResults | null;
  votingResult?: VotingResult | null;
  votesCast?: Record<string, string>; // voterId -> targetId (shown in day_voting or results)
  hasVoted?: boolean;
  nightActionCompleted?: boolean;
  policeInvestigationResult?: {
    targetId: string;
    targetName: string;
    isMafia: boolean;
  } | null;
  winner?: 'town' | 'mafia' | null;
  allRoles?: Record<string, Role>; // Available when game_over or for spectator
  spectatorGodView?: SpectatorGodView;
}

// Client -> Server events
export interface ClientToServerEvents {
  'create-room': (data: { playerName: string }, callback: (res: { success: boolean; roomCode?: string; playerId?: string; sessionToken?: string; error?: string }) => void) => void;
  'join-room': (data: { roomCode: string; playerName: string; sessionToken?: string }, callback: (res: { success: boolean; roomCode?: string; playerId?: string; sessionToken?: string; error?: string }) => void) => void;
  'reconnect-session': (data: { roomCode: string; sessionToken: string }, callback: (res: { success: boolean; gameState?: GameStatePublic; error?: string }) => void) => void;
  'start-game': (data: { roomCode: string }, callback?: (res: { success: boolean; error?: string }) => void) => void;
  'mafia-chat': (data: { roomCode: string; message: string }) => void;
  'mafia-kill': (data: { roomCode: string; targetId: string }, callback?: (res: { success: boolean; error?: string }) => void) => void;
  'police-investigate': (data: { roomCode: string; targetId: string }, callback?: (res: { success: boolean; isMafia?: boolean; error?: string }) => void) => void;
  'doctor-protect': (data: { roomCode: string; targetId: string }, callback?: (res: { success: boolean; error?: string }) => void) => void;
  'proceed-to-vote': (data: { roomCode: string }, callback?: (res: { success: boolean; error?: string }) => void) => void;
  'cast-vote': (data: { roomCode: string; targetId: string }, callback?: (res: { success: boolean; error?: string }) => void) => void;
  'new-game': (data: { roomCode: string }, callback?: (res: { success: boolean; error?: string }) => void) => void;
}

// Server -> Client events
export interface ServerToClientEvents {
  'game-state': (state: GameStatePublic) => void;
  'player-joined': (data: { player: PlayerPublic }) => void;
  'player-left': (data: { playerId: string; name: string }) => void;
  'mafia-message': (message: MafiaChatMessage) => void;
  'investigation-result': (data: { targetId: string; targetName: string; isMafia: boolean }) => void;
  'game-over': (data: { winner: 'town' | 'mafia'; roles: Record<string, Role> }) => void;
  'notification': (data: { message: string; type?: 'info' | 'warning' | 'success' | 'danger' }) => void;
  'error-message': (data: { message: string }) => void;
}
