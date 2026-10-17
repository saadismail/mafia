"use client";

import React, { useState } from "react";
import { GameStatePublic } from "@mafia/shared";
import { useSocket } from "@/context/SocketContext";
import {
  Vote,
  CheckCircle,
  AlertCircle,
  Scale,
  Users,
  Clock,
  Skull,
} from "lucide-react";
import { PlayerList } from "./PlayerList";

interface DayVotingProps {
  gameState: GameStatePublic;
}

export function DayVoting({ gameState }: DayVotingProps) {
  const { castVote } = useSocket();
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selfPlayer = gameState.players.find((p) => p.id === gameState.selfPlayerId);
  const isAlive = selfPlayer?.isAlive ?? true;
  const hasVoted = !!gameState.hasVoted;

  const alivePlayers = gameState.players.filter((p) => p.isAlive);
  const totalAlive = alivePlayers.length;

  // Count votes received so far if votesCast is exposed
  const votesCastMap = gameState.votesCast || {};
  const votesCount = Object.keys(votesCastMap).length;

  // Candidate list: any alive player can be voted for (usually cannot vote for self, or can vote for anyone alive)
  // To allow standard mafia rules, alive players can vote for any alive player including themselves or opponents
  const eligibleCandidates = alivePlayers;

  const handleVoteSubmit = async () => {
    if (!selectedTarget || isSubmitting || hasVoted || !isAlive) return;
    setIsSubmitting(true);
    await castVote(selectedTarget);
    setIsSubmitting(false);
  };

  const votingResult = gameState.votingResult;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-noir-850 via-noir-900 to-amber-950/20 border border-noir-750 p-6 sm:p-8 shadow-card-noir">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amberGold-500/10 border border-amberGold-500/30 text-amberGold-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Scale className="w-3.5 h-3.5 text-amberGold-400" />
              <span>Day {gameState.round} — Town Tribunal</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white">
              Town Elimination Ballot
            </h1>
            <p className="text-xs sm:text-sm text-noir-400 mt-1 max-w-xl">
              Cast your vote. Every citizen must choose. The suspect with the most votes will face elimination.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-amberGold-400 bg-noir-950 border border-noir-700 px-3.5 py-2 rounded-xl self-start sm:self-center">
            <Clock className="w-4 h-4 text-amberGold-400" />
            <span>Ballots Cast: {votesCount}/{totalAlive}</span>
          </div>
        </div>
      </div>

      {/* Vote Resolution Announcement if phase is resolving or has votingResult */}
      {votingResult && (
        <div
          className={`p-6 rounded-2xl border text-center animate-fade-in ${
            votingResult.isTie
              ? "bg-noir-900 border-amberGold-500/50 shadow-glow-gold"
              : "bg-blood-950/70 border-blood-600 shadow-glow-crimson"
          }`}
        >
          {votingResult.isTie ? (
            <div className="space-y-2">
              <div className="inline-flex p-3 rounded-full bg-noir-800 border border-noir-700 text-amberGold-400">
                <Scale className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Tied Vote — No Elimination</h3>
              <p className="text-xs text-noir-300">
                The town was deadlocked. No majority was achieved, and no suspect was executed today.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="inline-flex p-3 rounded-full bg-blood-900/60 border border-blood-500 text-blood-400">
                <Skull className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">
                <span className="text-blood-400">{votingResult.eliminatedPlayerName}</span> Has Been Eliminated
              </h3>
              <p className="text-xs text-noir-300">
                By majority vote of the town assembly, this operative has been sentenced. Their role remains hidden!
              </p>
            </div>
          )}

          {/* Breakdown if votesByPlayer available */}
          {votingResult.voteCounts && (
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap justify-center gap-2">
              {Object.entries(votingResult.voteCounts).map(([targetId, count]) => {
                const target = gameState.players.find((p) => p.id === targetId);
                return (
                  <span
                    key={targetId}
                    className="text-xs px-2.5 py-1 rounded-lg bg-noir-950 border border-noir-800 text-noir-200"
                  >
                    {target?.name || "Player"}: <strong>{count} votes</strong>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main Voting Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Voting Candidates */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-noir-900/90 border border-noir-800 rounded-2xl p-6 shadow-card-noir space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Vote className="w-5 h-5 text-amberGold-400" />
                <span>Select Suspect to Eliminate</span>
              </h3>
              <span className="text-xs text-noir-400">Mandatory Ballot</span>
            </div>

            {!isAlive ? (
              <div className="p-6 rounded-xl bg-noir-950 border border-noir-800 text-center space-y-2 text-xs text-noir-400">
                <AlertCircle className="w-6 h-6 text-noir-500 mx-auto" />
                <p className="font-semibold text-white">You Are a Spectator</p>
                <p>Eliminated players cannot cast votes. Watch the living debate and vote below.</p>
              </div>
            ) : hasVoted ? (
              <div className="p-6 rounded-xl bg-noir-950/80 border border-emerald-600/40 text-center space-y-3">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto animate-pulse" />
                <div className="text-sm font-bold text-white">Your Ballot Has Been Submitted</div>
                <p className="text-xs text-noir-400 max-w-sm mx-auto">
                  Awaiting other citizens to finish voting. Once all votes are cast, the tally will be announced immediately.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {eligibleCandidates.map((candidate) => {
                    const isSelected = selectedTarget === candidate.id;
                    const isSelf = candidate.id === gameState.selfPlayerId;

                    return (
                      <button
                        key={candidate.id}
                        onClick={() => setSelectedTarget(candidate.id)}
                        disabled={isSubmitting}
                        className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? "bg-blood-900/40 border-blood-500 shadow-glow-crimson text-white"
                            : "bg-noir-950 border-noir-800 hover:border-noir-600 text-noir-200"
                        }`}
                      >
                        <div className="truncate">
                          <span className="font-semibold text-xs sm:text-sm truncate">
                            {candidate.name}
                          </span>
                          {isSelf && (
                            <span className="ml-1.5 text-[10px] text-amberGold-400">
                              (Self)
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-blood-600 flex items-center justify-center text-white shrink-0">
                            <Vote className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-noir-800 pt-4">
                  <button
                    onClick={handleVoteSubmit}
                    disabled={!selectedTarget || isSubmitting}
                    className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-blood-600 to-blood-500 hover:from-blood-500 hover:to-blood-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-glow-crimson transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>Submitting Ballot...</span>
                      </>
                    ) : (
                      <>
                        <Vote className="w-4 h-4" />
                        <span>Cast Elimination Vote</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Col: Player Roster */}
        <div className="space-y-4">
          <PlayerList
            players={gameState.players}
            selfPlayerId={gameState.selfPlayerId}
            selfRole={gameState.selfRole}
          />
        </div>
      </div>
    </div>
  );
}
