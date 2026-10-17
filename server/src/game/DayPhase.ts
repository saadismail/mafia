import { VotingResult } from '@mafia/shared';

export interface DayPlayer {
  id: string;
  name: string;
  isAlive: boolean;
}

export function areAllVotesSubmitted(
  alivePlayers: DayPlayer[],
  votes: Record<string, string> // voterId -> targetId
): boolean {
  for (const player of alivePlayers) {
    if (!votes[player.id]) {
      return false;
    }
  }
  return true;
}

export function evaluateVotes(
  players: DayPlayer[],
  votes: Record<string, string>
): VotingResult {
  const voteCounts: Record<string, number> = {};

  // Count votes
  for (const voterId of Object.keys(votes)) {
    const targetId = votes[voterId];
    if (targetId) {
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    }
  }

  // Find max votes
  let maxVotes = 0;
  let candidatesWithMaxVotes: string[] = [];

  for (const [targetId, count] of Object.entries(voteCounts)) {
    if (count > maxVotes) {
      maxVotes = count;
      candidatesWithMaxVotes = [targetId];
    } else if (count === maxVotes) {
      candidatesWithMaxVotes.push(targetId);
    }
  }

  // If there's a tie or no votes, no one is eliminated
  if (candidatesWithMaxVotes.length !== 1 || maxVotes === 0) {
    return {
      eliminatedPlayerId: null,
      eliminatedPlayerName: null,
      isTie: candidatesWithMaxVotes.length > 1,
      voteCounts,
      votesByPlayer: { ...votes },
    };
  }

  const eliminatedId = candidatesWithMaxVotes[0];
  const eliminatedPlayer = players.find(p => p.id === eliminatedId);

  return {
    eliminatedPlayerId: eliminatedId,
    eliminatedPlayerName: eliminatedPlayer ? eliminatedPlayer.name : null,
    isTie: false,
    voteCounts,
    votesByPlayer: { ...votes },
  };
}
