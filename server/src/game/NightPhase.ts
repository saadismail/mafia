import { Role, DayResults } from '@mafia/shared';

export interface NightPlayer {
  id: string;
  name: string;
  role: Role;
  isAlive: boolean;
}

export interface NightState {
  gameId: number;
  round: number;
  mafiaKillTargetId: string | null;
  policeInvestigateTargetId: string | null;
  doctorProtectTargetId: string | null;
  policeResult: {
    targetId: string;
    targetName: string;
    isMafia: boolean;
  } | null;
}

export function getMafiaLeader(livingMafias: NightPlayer[], round: number): NightPlayer | null {
  if (livingMafias.length === 0) return null;
  // Sort stably by id so rotation order is deterministic
  const sorted = [...livingMafias].sort((a, b) => a.id.localeCompare(b.id));
  const index = (round - 1) % sorted.length;
  return sorted[index];
}

export function areAllNightActionsSubmitted(
  players: NightPlayer[],
  actions: {
    mafiaKillTargetId: string | null;
    policeInvestigateTargetId: string | null;
    doctorProtectTargetId: string | null;
  }
): boolean {
  const alivePlayers = players.filter(p => p.isAlive);
  const aliveMafias = alivePlayers.filter(p => p.role === 'mafia');
  const alivePolice = alivePlayers.filter(p => p.role === 'police');
  const aliveDoctor = alivePlayers.filter(p => p.role === 'doctor');

  if (aliveMafias.length > 0 && actions.mafiaKillTargetId === null) {
    return false;
  }
  if (alivePolice.length > 0 && actions.policeInvestigateTargetId === null) {
    return false;
  }
  if (aliveDoctor.length > 0 && actions.doctorProtectTargetId === null) {
    return false;
  }

  return true;
}

export interface NightResolution {
  killedPlayerId: string | null;
  dayResults: DayResults;
}

export function resolveNightActions(
  players: NightPlayer[],
  mafiaKillTargetId: string | null,
  doctorProtectTargetId: string | null
): NightResolution {
  if (!mafiaKillTargetId) {
    return {
      killedPlayerId: null,
      dayResults: {
        killedPlayerId: null,
        killedPlayerName: null,
        savedByDoctor: false,
        message: 'No one died during the night.',
      },
    };
  }

  const targetPlayer = players.find(p => p.id === mafiaKillTargetId);
  if (!targetPlayer || !targetPlayer.isAlive) {
    return {
      killedPlayerId: null,
      dayResults: {
        killedPlayerId: null,
        killedPlayerName: null,
        savedByDoctor: false,
        message: 'No one died during the night.',
      },
    };
  }

  if (doctorProtectTargetId && doctorProtectTargetId === mafiaKillTargetId) {
    return {
      killedPlayerId: null,
      dayResults: {
        killedPlayerId: null,
        killedPlayerName: null,
        savedByDoctor: true,
        message: 'The Doctor saved someone during the night! No one died.',
      },
    };
  }

  return {
    killedPlayerId: targetPlayer.id,
    dayResults: {
      killedPlayerId: targetPlayer.id,
      killedPlayerName: targetPlayer.name,
      savedByDoctor: false,
      message: `${targetPlayer.name} was killed during the night.`,
    },
  };
}
