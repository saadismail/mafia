"use client";

import React from "react";
import { GameStatePublic, Role } from "@mafia/shared";
import {
  Eye,
  Ghost,
  Crosshair,
  Shield,
  Search,
  Vote,
  Sparkles,
} from "lucide-react";

interface SpectatorViewProps {
  gameState: GameStatePublic;
}

export function SpectatorView({ gameState }: SpectatorViewProps) {
  const godView = gameState.spectatorGodView;
  const playerRoles = godView?.playerRoles || gameState.allRoles || {};
  const nightActions = godView?.nightActions;
  const votes = godView?.votes || gameState.votesCast || {};

  const getPlayerName = (id: string | null) => {
    if (!id) return "None";
    const found = gameState.players.find((p) => p.id === id);
    return found ? found.name : "Unknown";
  };

  return (
    <div className="w-full bg-gradient-to-r from-purple-950/40 via-noir-900 to-purple-950/40 border border-purple-800/50 rounded-2xl p-5 shadow-card-noir mb-6 animate-fade-in backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-800/40 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-700/60 text-purple-300">
            <Ghost className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
                Ghost Mode
              </span>
              <span className="text-xs text-purple-300 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> All Secrets Revealed
              </span>
            </div>
            <h3 className="text-base font-black text-white">
              Spectator God View
            </h3>
          </div>
        </div>

        <div className="text-xs text-purple-300/80 max-w-sm">
          You are eliminated from the game. You can see all player roles and nocturnal moves in real time!
        </div>
      </div>

      {/* Real-time Night Actions Tracking (if night) */}
      {gameState.phase === "night" && nightActions && (
        <div className="mb-4 p-4 rounded-xl bg-noir-950/80 border border-purple-900/60 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Live Night Actions In Motion</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-noir-900 border border-blood-800/50 flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-blood-400 shrink-0" />
              <div>
                <div className="text-noir-400 text-[10px]">Mafia Hit Target</div>
                <div className="font-bold text-white">
                  {getPlayerName(nightActions.mafiaKillTargetId)}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-noir-900 border border-emerald-800/50 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="text-noir-400 text-[10px]">Doctor Protection</div>
                <div className="font-bold text-white">
                  {getPlayerName(nightActions.doctorProtectTargetId)}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-noir-900 border border-policeBlue-800/50 flex items-center gap-2">
              <Search className="w-4 h-4 text-policeBlue-400 shrink-0" />
              <div>
                <div className="text-noir-400 text-[10px]">Police Investigation</div>
                <div className="font-bold text-white">
                  {getPlayerName(nightActions.policeInvestigateTargetId)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Votes Tracking (if day voting) */}
      {gameState.phase === "day_voting" && Object.keys(votes).length > 0 && (
        <div className="p-4 rounded-xl bg-noir-950/80 border border-purple-900/60 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
            <Vote className="w-3.5 h-3.5 text-purple-400" />
            <span>Live Ballots Revealed</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {Object.entries(votes).map(([voterId, targetId]) => (
              <div
                key={voterId}
                className="p-2.5 rounded-lg bg-noir-900 border border-noir-800 flex items-center justify-between"
              >
                <span className="text-noir-300 font-medium">
                  {getPlayerName(voterId)}
                </span>
                <span className="text-purple-300 font-bold">
                  → voted for {getPlayerName(targetId)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
