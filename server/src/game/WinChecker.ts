import { Role } from '@mafia/shared';

export interface PlayerStatus {
  id: string;
  role: Role;
  isAlive: boolean;
}

export type WinResult = 'town' | 'mafia' | null;

export function checkWinCondition(players: PlayerStatus[]): WinResult {
  const livingPlayers = players.filter(p => p.isAlive);
  const livingMafias = livingPlayers.filter(p => p.role === 'mafia');
  const livingNonMafias = livingPlayers.filter(p => p.role !== 'mafia');

  if (livingMafias.length === 0) {
    return 'town';
  }

  if (livingMafias.length >= livingNonMafias.length) {
    return 'mafia';
  }

  return null;
}
