import { Role } from '@mafia/shared';

export interface RoleCounts {
  mafia: number;
  doctor: number;
  police: number;
  citizen: number;
}

export function getRoleCounts(playerCount: number): RoleCounts {
  if (playerCount < 4) {
    throw new Error(`Minimum 4 players required to start the game, got ${playerCount}`);
  }
  if (playerCount > 15) {
    throw new Error(`Maximum 15 players allowed, got ${playerCount}`);
  }

  let mafiaCount = 1;
  if (playerCount >= 12) {
    mafiaCount = 4;
  } else if (playerCount >= 9) {
    mafiaCount = 3;
  } else if (playerCount >= 6) {
    mafiaCount = 2;
  } else {
    mafiaCount = 1;
  }

  const doctorCount = 1;
  const policeCount = 1;
  const citizenCount = playerCount - mafiaCount - doctorCount - policeCount;

  return {
    mafia: mafiaCount,
    doctor: doctorCount,
    police: policeCount,
    citizen: citizenCount,
  };
}

export function assignRoles(playerIds: string[]): Record<string, Role> {
  const count = playerIds.length;
  const distribution = getRoleCounts(count);

  const rolePool: Role[] = [];
  for (let i = 0; i < distribution.mafia; i++) rolePool.push('mafia');
  for (let i = 0; i < distribution.doctor; i++) rolePool.push('doctor');
  for (let i = 0; i < distribution.police; i++) rolePool.push('police');
  for (let i = 0; i < distribution.citizen; i++) rolePool.push('citizen');

  // Shuffle roles using Fisher-Yates
  for (let i = rolePool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = rolePool[i];
    rolePool[i] = rolePool[j];
    rolePool[j] = temp;
  }

  const assignments: Record<string, Role> = {};
  for (let i = 0; i < playerIds.length; i++) {
    assignments[playerIds[i]] = rolePool[i];
  }

  return assignments;
}
