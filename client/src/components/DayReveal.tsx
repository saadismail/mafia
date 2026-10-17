"use client";

import React, { useState } from "react";
import { GameStatePublic } from "@mafia/shared";
import { useSocket } from "@/context/SocketContext";
import {
  Sun,
  Skull,
  ShieldCheck,
  Vote,
  MessageCircle,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { PlayerList } from "./PlayerList";

interface DayRevealProps {
  gameState: GameStatePublic;
}

export function DayReveal({ gameState }: DayRevealProps) {
  const { proceedToVote } = useSocket();
  const [isProceeding, setIsProceeding] = useState(false);

  const selfPlayer = gameState.players.find((p) => p.id === gameState.selfPlayerId);
  const isAlive = selfPlayer?.isAlive ?? true;

  const dayResults = gameState.dayResults;
  const killedName = dayResults?.killedPlayerName;
  const wasSaved = dayResults?.savedByDoctor;

  const handleProceed = async () => {
    if (isProceeding || !isAlive) return;
    setIsProceeding(true);
    await proceedToVote();
    setIsProceeding(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Dawn Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-noir-850 via-noir-900 to-amber-950/30 border border-amberGold-500/30 p-6 sm:p-8 shadow-card-noir">
        <div className="absolute top-2 right-4 text-amberGold-500/10 pointer-events-none select-none">
          <Sun className="w-28 h-28 stroke-[1]" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amberGold-500/10 border border-amberGold-500/30 text-amberGold-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sun className="w-3.5 h-3.5 text-amberGold-400" />
              <span>Day {gameState.round} — Dawn Breaks</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white">
              Town Morning Assembly
            </h1>
            <p className="text-xs sm:text-sm text-noir-400 mt-1 max-w-xl">
              The sun rises over the city. Operatives gather in the town square to review night casualties and debate.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-amberGold-300 bg-amberGold-500/20 border border-amberGold-500/40 px-3 py-1.5 rounded-xl self-start sm:self-center">
            <MessageCircle className="w-4 h-4 text-amberGold-400" />
            <span>Discussion Phase</span>
          </div>
        </div>
      </div>

      {/* Dramatic Casualty Banner */}
      <div
        className={`p-6 sm:p-8 rounded-2xl border text-center transition-all ${
          killedName
            ? "bg-blood-950/60 border-blood-600/70 shadow-glow-crimson"
            : wasSaved
            ? "bg-emerald-950/60 border-emerald-600/70 shadow-glow-green"
            : "bg-noir-900/90 border-noir-750 shadow-card-noir"
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-3">
          {killedName ? (
            <>
              <div className="p-4 rounded-full bg-blood-900/60 border border-blood-500 text-blood-400">
                <Skull className="w-10 h-10 animate-pulse" />
              </div>
              <div className="text-xs uppercase tracking-widest text-blood-400 font-bold">
                Assassination Reported
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                <span className="text-blood-400">{killedName}</span> was found eliminated!
              </h2>
              <p className="text-xs sm:text-sm text-noir-300 max-w-lg">
                The mafia struck in the shadows. Their role remains classified until the end of the conflict.
              </p>
            </>
          ) : wasSaved ? (
            <>
              <div className="p-4 rounded-full bg-emerald-950 border border-emerald-500 text-emerald-400">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <div className="text-xs uppercase tracking-widest text-emerald-400 font-bold">
                Doctor Intervention
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-emerald-300">
                A Miraculous Survival!
              </h2>
              <p className="text-xs sm:text-sm text-noir-300 max-w-lg">
                The Mafia's assassination was thwarted by the Doctor! No one died during the night.
              </p>
            </>
          ) : (
            <>
              <div className="p-4 rounded-full bg-noir-850 border border-noir-700 text-noir-300">
                <Sun className="w-10 h-10" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                A Peaceful Night
              </h2>
              <p className="text-xs sm:text-sm text-noir-300 max-w-lg">
                {dayResults?.message || "No casualties occurred during the night."}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Main Grid: Discussion Instructions & Next Step */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Debate instructions & CTA */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-noir-900/90 border border-noir-800 rounded-2xl p-6 shadow-card-noir space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-amberGold-400" />
              <span>Town Discussion & Interrogation</span>
            </h3>
            
            <p className="text-xs sm:text-sm text-noir-300 leading-relaxed">
              Now is the time for all players to speak! Discuss on your voice call or in person:
            </p>

            <div className="space-y-2.5 text-xs text-noir-300 bg-noir-950 p-4 rounded-xl border border-noir-800">
              <div className="flex items-start gap-2">
                <span className="text-amberGold-400 font-bold">1.</span>
                <span>The Detective may choose to reveal incriminating or exculpatory findings.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amberGold-400 font-bold">2.</span>
                <span>Mafia members must fabricate plausible alibis to blend in.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amberGold-400 font-bold">3.</span>
                <span>Citizens must cross-examine suspects before making an irreversible vote.</span>
              </div>
            </div>

            {/* Proceed to vote action */}
            <div className="border-t border-noir-800 pt-5">
              {isAlive ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-noir-400">
                    Ready to sentence a suspect? Any living operative can trigger the vote.
                  </div>
                  <button
                    onClick={handleProceed}
                    disabled={isProceeding}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-amberGold-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 active:scale-95 text-noir-950 shadow-glow-gold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isProceeding ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-noir-950/40 border-t-noir-950 rounded-full animate-spin" />
                        <span>Opening Ballots...</span>
                      </>
                    ) : (
                      <>
                        <Vote className="w-4 h-4" />
                        <span>Proceed to Vote</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3.5 rounded-xl bg-noir-950 border border-noir-800 text-xs text-noir-500">
                  <AlertTriangle className="w-4 h-4 text-noir-500 shrink-0" />
                  <span>You are eliminated. Dead players observe silently as living players discuss and open the vote.</span>
                </div>
              )}
            </div>
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
