import { describe, it, expect } from 'vitest';
import { getRoleCounts, assignRoles } from '../src/game/RoleAssigner';

describe('RoleAssigner', () => {
  it('correctly calculates role counts for 4-5 players', () => {
    const four = getRoleCounts(4);
    expect(four).toEqual({ mafia: 1, doctor: 1, police: 1, citizen: 1 });

    const five = getRoleCounts(5);
    expect(five).toEqual({ mafia: 1, doctor: 1, police: 1, citizen: 2 });
  });

  it('correctly calculates role counts for 6-8 players', () => {
    const six = getRoleCounts(6);
    expect(six).toEqual({ mafia: 2, doctor: 1, police: 1, citizen: 2 });

    const eight = getRoleCounts(8);
    expect(eight).toEqual({ mafia: 2, doctor: 1, police: 1, citizen: 4 });
  });

  it('correctly calculates role counts for 9-11 players', () => {
    const nine = getRoleCounts(9);
    expect(nine).toEqual({ mafia: 3, doctor: 1, police: 1, citizen: 4 });

    const eleven = getRoleCounts(11);
    expect(eleven).toEqual({ mafia: 3, doctor: 1, police: 1, citizen: 6 });
  });

  it('correctly calculates role counts for 12-15 players', () => {
    const twelve = getRoleCounts(12);
    expect(twelve).toEqual({ mafia: 4, doctor: 1, police: 1, citizen: 6 });

    const fifteen = getRoleCounts(15);
    expect(fifteen).toEqual({ mafia: 4, doctor: 1, police: 1, citizen: 9 });
  });

  it('throws on invalid player counts (< 4 or > 15)', () => {
    expect(() => getRoleCounts(3)).toThrow();
    expect(() => getRoleCounts(16)).toThrow();
  });

  it('assigns roles to every player in list', () => {
    const players = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
    const roles = assignRoles(players);

    expect(Object.keys(roles)).toHaveLength(6);
    for (const p of players) {
      expect(roles[p]).toBeDefined();
    }

    const roleValues = Object.values(roles);
    const mafiaCount = roleValues.filter(r => r === 'mafia').length;
    const doctorCount = roleValues.filter(r => r === 'doctor').length;
    const policeCount = roleValues.filter(r => r === 'police').length;
    const citizenCount = roleValues.filter(r => r === 'citizen').length;

    expect(mafiaCount).toBe(2);
    expect(doctorCount).toBe(1);
    expect(policeCount).toBe(1);
    expect(citizenCount).toBe(2);
  });
});
