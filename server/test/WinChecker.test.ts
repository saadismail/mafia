import { describe, it, expect } from 'vitest';
import { checkWinCondition } from '../src/game/WinChecker';

describe('WinChecker', () => {
  it('returns town when all Mafias are eliminated', () => {
    const players = [
      { id: '1', role: 'mafia' as const, isAlive: false },
      { id: '2', role: 'doctor' as const, isAlive: true },
      { id: '3', role: 'police' as const, isAlive: true },
      { id: '4', role: 'citizen' as const, isAlive: true },
    ];
    expect(checkWinCondition(players)).toBe('town');
  });

  it('returns mafia when living Mafias >= living non-Mafias', () => {
    // 2 living Mafias, 2 living non-mafias => mafia wins
    const players = [
      { id: '1', role: 'mafia' as const, isAlive: true },
      { id: '2', role: 'mafia' as const, isAlive: true },
      { id: '3', role: 'doctor' as const, isAlive: true },
      { id: '4', role: 'police' as const, isAlive: true },
      { id: '5', role: 'citizen' as const, isAlive: false },
    ];
    expect(checkWinCondition(players)).toBe('mafia');
  });

  it('returns mafia in 1v1 endgame', () => {
    const players = [
      { id: '1', role: 'mafia' as const, isAlive: true },
      { id: '2', role: 'citizen' as const, isAlive: true },
    ];
    expect(checkWinCondition(players)).toBe('mafia');
  });

  it('returns null when game is ongoing (mafia < non-mafia and mafia > 0)', () => {
    const players = [
      { id: '1', role: 'mafia' as const, isAlive: true },
      { id: '2', role: 'doctor' as const, isAlive: true },
      { id: '3', role: 'police' as const, isAlive: true },
      { id: '4', role: 'citizen' as const, isAlive: true },
    ];
    expect(checkWinCondition(players)).toBeNull();
  });
});
