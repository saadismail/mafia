"use client";

import React, { useState } from "react";
import { GameStatePublic } from "@mafia/shared";
import { useSocket } from "@/context/SocketContext";
import {
  Copy,
  Check,
  Play,
  Users,
  Share2,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { PlayerList } from "./PlayerList";

interface LobbyProps {
  gameState: GameStatePublic;
}

export function Lobby({ gameState }: LobbyProps) {
  const { startGame } = useSocket();
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const playerCount = gameState.players.length;
  const canStart = playerCount >= 4;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(gameState.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/room/${gameState.roomCode}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleStartGame = async () => {
    if (!canStart || isStarting) return;
    setIsStarting(true);
    await startGame();
    setIsStarting(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Room Code Card Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-noir-850 via-noir-900 to-noir-950 border border-noir-750 p-6 sm:p-8 shadow-card-noir">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blood-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-noir-400 mb-1">
              <Users className="w-4 h-4 text-amberGold-400" />
              <span>Room Lobby</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Secret Syndicate Assembly
            </h1>
            <p className="text-sm text-noir-400 mt-1">
              Invite players using the code below. Minimum 4 players required to initiate game.
            </p>
          </div>

          {/* Room Code Box */}
          <div className="flex flex-col items-center sm:items-end w-full sm:w-auto">
            <span className="text-[11px] font-bold uppercase tracking-widest text-noir-400 mb-1">
              Room Code
            </span>
            <div className="flex items-center gap-2 bg-noir-950 border border-noir-700/80 rounded-2xl p-2 px-4 shadow-inner">
              <span className="text-2xl sm:text-3xl font-mono font-black text-amberGold-400 tracking-wider">
                {gameState.roomCode}
              </span>
              <button
                onClick={handleCopyCode}
                title="Copy Room Code"
                className="p-2 rounded-xl bg-noir-850 hover:bg-noir-800 border border-noir-700 text-noir-300 hover:text-white transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={handleCopyLink}
              className="mt-2 text-xs text-noir-400 hover:text-amberGold-400 flex items-center gap-1.5 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Copy Direct Invite Link</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Player Roster & Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Player Cards & Start CTA */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-noir-900/90 border border-noir-800 rounded-2xl p-6 shadow-card-noir">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blood-400" />
                <span>Assembled Operatives ({playerCount})</span>
              </h2>
              <span className="text-xs px-2.5 py-1 rounded-full bg-noir-800 border border-noir-700 text-noir-300">
                {canStart ? "Ready to Start" : `Waiting for ${4 - playerCount} more`}
              </span>
            </div>

            {/* Players Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {gameState.players.map((player) => {
                const isSelf = player.id === gameState.selfPlayerId;
                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      isSelf
                        ? "bg-noir-800/80 border-amberGold-500/40 shadow-sm"
                        : "bg-noir-950/70 border-noir-800"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-noir-850 border border-noir-700 flex items-center justify-center font-bold text-xs text-noir-300">
                        {player.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                          <span>{player.name}</span>
                          {isSelf && (
                            <span className="text-[10px] text-amberGold-400 font-normal">
                              (You)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Connected</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Start Game Action */}
            <div className="border-t border-noir-800 pt-5">
              {!canStart ? (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-noir-950 border border-noir-800 text-xs text-noir-400">
                  <ShieldAlert className="w-5 h-5 text-amberGold-400 shrink-0" />
                  <span>
                    The game requires at least <strong>4 players</strong> to balance roles (Mafia, Doctor, Police, Citizens). Share the room code to recruit allies!
                  </span>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-noir-300">
                    <span className="text-emerald-400 font-bold">Quorum reached!</span> Any player can initiate the session.
                  </div>
                  <button
                    onClick={handleStartGame}
                    disabled={isStarting}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r from-blood-600 to-blood-500 hover:from-blood-500 hover:to-blood-400 active:scale-95 text-white shadow-glow-crimson transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isStarting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>Dealing Secret Roles...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>Deal Roles & Start Game</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Quick Tips / Rules */}
        <div className="space-y-4">
          <div className="bg-noir-900/90 border border-noir-800 rounded-2xl p-5 shadow-card-noir text-xs text-noir-300 space-y-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amberGold-400" />
              <span>Role Distribution</span>
            </h3>
            <p>Once started, roles are secretly dealt to every player:</p>
            <ul className="space-y-2 text-noir-400 pl-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blood-500" />
                <span className="text-noir-200">1+ Mafia:</span> Conspires and kills at night
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-policeBlue-500" />
                <span className="text-noir-200">1 Police:</span> Investigates one player nightly
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-noir-200">1 Doctor:</span> Protects one player nightly
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-noir-400" />
                <span className="text-noir-200">Citizens:</span> Deduce and vote by day
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
