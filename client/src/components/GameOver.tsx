"use client";

import React, { useState } from "react";
import { GameStatePublic, Role } from "@mafia/shared";
import { useSocket } from "@/context/SocketContext";
import {
  Trophy,
  Skull,
  Shield,
  Search,
  User,
  RotateCcw,
  Sparkles,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface GameOverProps {
  gameState: GameStatePublic;
}

export function GameOver({ gameState }: GameOverProps) {
  const { startNewGame } = useSocket();
  const [isRestarting, setIsRestarting] = useState(false);

  const winner = gameState.winner || "town";
  const isTownWinner = winner === "town";

  const allRoles = gameState.allRoles || {};

  const handlePlayAgain = async () => {
    if (isRestarting) return;
    setIsRestarting(true);
    await startNewGame();
    setIsRestarting(false);
  };

  const renderRoleBadge = (role?: Role) => {
    switch (role) {
      case "mafia":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-blood-950 border border-blood-700 text-blood-400">
            <Skull className="w-3.5 h-3.5" /> Mafia
          </span>
        );
      case "police":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-950 border border-policeBlue-600 text-policeBlue-400">
            <Search className="w-3.5 h-3.5" /> Police
          </span>
        );
      case "doctor":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-600 text-emerald-400">
            <Shield className="w-3.5 h-3.5" /> Doctor
          </span>
        );
      case "citizen":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-noir-800 border border-noir-600 text-noir-200">
            <User className="w-3.5 h-3.5" /> Citizen
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in py-4">
      {/* Victory Banner */}
      <div
        className={`relative overflow-hidden rounded-3xl p-8 sm:p-12 text-center border shadow-2xl ${
          isTownWinner
            ? "bg-gradient-to-b from-amber-950/60 via-noir-900 to-noir-950 border-amberGold-500/60 shadow-glow-gold"
            : "bg-gradient-to-b from-blood-950/70 via-noir-900 to-noir-950 border-blood-600/70 shadow-glow-crimson-lg"
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <div
            className={`p-5 rounded-full border shadow-xl ${
              isTownWinner
                ? "bg-amber-950/80 border-amberGold-500 text-amberGold-400"
                : "bg-blood-950/80 border-blood-500 text-blood-400"
            }`}
          >
            {isTownWinner ? (
              <Trophy className="w-14 h-14 animate-bounce" />
            ) : (
              <Skull className="w-14 h-14 animate-pulse" />
            )}
          </div>

          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase border ${
              isTownWinner
                ? "bg-amberGold-500/20 border-amberGold-500/40 text-amberGold-300"
                : "bg-blood-500/20 border-blood-500/40 text-blood-300"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Final Resolution</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight">
            {isTownWinner ? (
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amberGold-400 to-amber-200">
                TOWN WINS!
              </span>
            ) : (
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blood-500 via-blood-400 to-red-300">
                MAFIA WINS!
              </span>
            )}
          </h1>

          <p className="text-sm sm:text-base text-noir-300 max-w-lg leading-relaxed">
            {isTownWinner
              ? "All Mafia conspirators were identified and eliminated by the vigilant citizens of the town."
              : "The syndicate overwhelmed the city. Living Mafias equal or outnumber the remaining innocent citizens."}
          </p>

          <div className="pt-4">
            <button
              onClick={handlePlayAgain}
              disabled={isRestarting}
              className={`px-8 py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all shadow-xl active:scale-95 flex items-center gap-2 cursor-pointer ${
                isTownWinner
                  ? "bg-amberGold-500 hover:bg-amberGold-400 text-noir-950 shadow-glow-gold"
                  : "bg-blood-600 hover:bg-blood-500 text-white shadow-glow-crimson"
              }`}
            >
              {isRestarting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Preparing Next Match...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Play Again / Re-shuffle Roles</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Complete Role Reveal Table */}
      <div className="bg-noir-900/90 border border-noir-800 rounded-3xl p-6 sm:p-8 shadow-card-noir space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amberGold-400" />
            <span>Secret Dossier — All Roles Revealed</span>
          </h2>
          <p className="text-xs text-noir-400 mt-1">
            Every operative's true identity and final survival status.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-noir-800 text-noir-400 text-xs uppercase tracking-wider">
                <th className="pb-3 font-semibold">Operative</th>
                <th className="pb-3 font-semibold">True Role</th>
                <th className="pb-3 font-semibold">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-noir-850">
              {gameState.players.map((player) => {
                const role = allRoles[player.id] || player.role;
                const isSelf = player.id === gameState.selfPlayerId;

                return (
                  <tr key={player.id} className="hover:bg-noir-850/40 transition-colors">
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {player.name}
                        </span>
                        {isSelf && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-noir-800 text-amberGold-400 border border-noir-700">
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 pr-4">
                      {renderRoleBadge(role)}
                    </td>
                    <td className="py-3.5">
                      {player.isAlive ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800">
                          <CheckCircle className="w-3.5 h-3.5" /> Survived
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-noir-400 font-semibold bg-noir-950 px-2.5 py-1 rounded-lg border border-noir-800">
                          <XCircle className="w-3.5 h-3.5 text-blood-400" /> Eliminated
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
