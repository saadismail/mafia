import { describe, it, expect } from 'vitest';
import { areAllVotesSubmitted, evaluateVotes, DayPlayer } from '../src/game/DayPhase';

describe('DayPhase', () => {
  const players: DayPlayer[] = [
    { id: 'p1', name: 'Alice', isAlive: true },
    { id: 'p2', name: 'Bob', isAlive: true },
    { id: 'p3', name: 'Charlie', isAlive: true },
    { id: 'p4', name: 'Dave', isAlive: true },
  ];

  it('detects when not all alive players have voted', () => {
    const votes = { p1: 'p2', p2: 'p3', p3: 'p2' }; // p4 has not voted
    expect(areAllVotesSubmitted(players, votes)).toBe(false);
  });

  it('detects when all alive players have voted', () => {
    const votes = { p1: 'p2', p2: 'p3', p3: 'p2', p4: 'p2' };
    expect(areAllVotesSubmitted(players, votes)).toBe(true);
  });

  it('eliminates player with strictly highest vote count', () => {
    const votes = { p1: 'p2', p2: 'p3', p3: 'p2', p4: 'p2' };
    const result = evaluateVotes(players, votes);

    expect(result.isTie).toBe(false);
    expect(result.eliminatedPlayerId).toBe('p2');
    expect(result.eliminatedPlayerName).toBe('Bob');
    expect(result.voteCounts['p2']).toBe(3);
    expect(result.voteCounts['p3']).toBe(1);
  });

  it('handles tie votes with no elimination', () => {
    const votes = { p1: 'p2', p2: 'p1', p3: 'p2', p4: 'p1' };
    const result = evaluateVotes(players, votes);

    expect(result.isTie).toBe(true);
    expect(result.eliminatedPlayerId).toBeNull();
    expect(result.eliminatedPlayerName).toBeNull();
    expect(result.voteCounts['p1']).toBe(2);
    expect(result.voteCounts['p2']).toBe(2);
  });
});
