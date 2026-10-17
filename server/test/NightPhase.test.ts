import { describe, it, expect } from 'vitest';
import {
  getMafiaLeader,
  areAllNightActionsSubmitted,
  resolveNightActions,
  NightPlayer,
} from '../src/game/NightPhase';

describe('NightPhase', () => {
  const players: NightPlayer[] = [
    { id: 'm1', name: 'Mafia 1', role: 'mafia', isAlive: true },
    { id: 'm2', name: 'Mafia 2', role: 'mafia', isAlive: true },
    { id: 'd1', name: 'Doctor', role: 'doctor', isAlive: true },
    { id: 'p1', name: 'Police', role: 'police', isAlive: true },
    { id: 'c1', name: 'Citizen', role: 'citizen', isAlive: true },
  ];

  it('rotates Mafia leader correctly across rounds', () => {
    const livingMafias = players.filter(p => p.role === 'mafia');
    const leaderR1 = getMafiaLeader(livingMafias, 1);
    const leaderR2 = getMafiaLeader(livingMafias, 2);
    const leaderR3 = getMafiaLeader(livingMafias, 3);

    expect(leaderR1?.id).toBe('m1');
    expect(leaderR2?.id).toBe('m2');
    expect(leaderR3?.id).toBe('m1');
  });

  it('checks if all required night actions are submitted', () => {
    // Missing doctor protect
    expect(
      areAllNightActionsSubmitted(players, {
        mafiaKillTargetId: 'c1',
        policeInvestigateTargetId: 'm1',
        doctorProtectTargetId: null,
      })
    ).toBe(false);

    // All special roles submitted
    expect(
      areAllNightActionsSubmitted(players, {
        mafiaKillTargetId: 'c1',
        policeInvestigateTargetId: 'm1',
        doctorProtectTargetId: 'c1',
      })
    ).toBe(true);

    // If police is dead, does not require police action
    const deadPolicePlayers = players.map(p =>
      p.id === 'p1' ? { ...p, isAlive: false } : p
    );
    expect(
      areAllNightActionsSubmitted(deadPolicePlayers, {
        mafiaKillTargetId: 'c1',
        policeInvestigateTargetId: null,
        doctorProtectTargetId: 'c1',
      })
    ).toBe(true);
  });

  it('resolves night action: mafia kills unprotected target', () => {
    const res = resolveNightActions(players, 'c1', 'd1');
    expect(res.killedPlayerId).toBe('c1');
    expect(res.dayResults.savedByDoctor).toBe(false);
    expect(res.dayResults.killedPlayerId).toBe('c1');
    expect(res.dayResults.message).toContain('Citizen was killed');
  });

  it('resolves night action: doctor saves mafia target', () => {
    const res = resolveNightActions(players, 'c1', 'c1');
    expect(res.killedPlayerId).toBeNull();
    expect(res.dayResults.savedByDoctor).toBe(true);
    expect(res.dayResults.message).toContain('Doctor saved someone');
  });

  it('allows doctor to protect themselves', () => {
    const res = resolveNightActions(players, 'd1', 'd1');
    expect(res.killedPlayerId).toBeNull();
    expect(res.dayResults.savedByDoctor).toBe(true);
  });
});
