"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "@/context/SocketContext";
import { Lobby } from "@/components/Lobby";
import { NightPhase } from "@/components/NightPhase";
import { DayReveal } from "@/components/DayReveal";
import { DayVoting } from "@/components/DayVoting";
import { GameOver } from "@/components/GameOver";
import { SpectatorView } from "@/components/SpectatorView";
import {
  Skull,
  Home,
  WifiOff,
  UserPlus,
  ArrowRight,
  Flame,
} from "lucide-react";
import Link from "next/link";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const rawCode = (params?.code as string) || "";
  const roomCode = rawCode.toUpperCase();

  const {
    gameState,
    isConnected,
    isConnecting,
    reconnectSession,
    joinRoom,
    error,
    clearError,
  } = useSocket();

  const [hasAttemptedReconnect, setHasAttemptedReconnect] = useState(false);
  const [directJoinName, setDirectJoinName] = useState("");
  const [isJoiningDirect, setIsJoiningDirect] = useState(false);

  // Load saved name if any
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mafia_player_name");
      if (saved) setDirectJoinName(saved);
    }
  }, []);

  // Attempt session reconnect if gameState doesn't match current room
  useEffect(() => {
    if (isConnected && roomCode) {
      if (!gameState || gameState.roomCode !== roomCode) {
        reconnectSession(roomCode).then((reconnected) => {
          setHasAttemptedReconnect(true);
        });
      } else {
        setHasAttemptedReconnect(true);
      }
    }
  }, [isConnected, roomCode, gameState, reconnectSession]);

  const handleDirectJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directJoinName.trim() || isJoiningDirect) return;
    setIsJoiningDirect(true);
    clearError();
    const res = await joinRoom(roomCode, directJoinName.trim());
    setIsJoiningDirect(false);
  };

  // Connecting to socket server
  if (isConnecting && !isConnected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-4 border-blood-600/30 border-t-blood-500 rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-white mb-1">Connecting to Syndicate Server...</h2>
        <p className="text-xs text-noir-400">Securing encrypted channel</p>
      </div>
    );
  }

  // Not in room yet (e.g. opened direct link without session)
  const isPlayerInRoom = gameState && gameState.roomCode === roomCode;

  if (!isPlayerInRoom && hasAttemptedReconnect) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full animate-fade-in">
        <div className="w-full rounded-3xl bg-noir-900/90 border border-noir-750 p-6 sm:p-8 shadow-card-noir space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-amber-950/80 border border-amberGold-500/40 text-amberGold-400 mb-2">
              <UserPlus className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Join Room {roomCode}</h2>
            <p className="text-xs text-noir-400">
              Enter your secret identity to join this session
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl border border-blood-600/70 bg-blood-950/70 text-blood-200 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleDirectJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-noir-300 uppercase tracking-wider mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. Vincent"
                value={directJoinName}
                onChange={(e) => setDirectJoinName(e.target.value)}
                maxLength={20}
                required
                className="w-full px-4 py-3 rounded-xl bg-noir-950 border border-noir-700 text-white placeholder-noir-500 focus:outline-none focus:border-amberGold-400 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isJoiningDirect || !directJoinName.trim()}
              className="w-full py-3.5 px-5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-amberGold-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-noir-950 shadow-glow-gold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              {isJoiningDirect ? (
                <>
                  <div className="w-4 h-4 border-2 border-noir-950/40 border-t-noir-950 rounded-full animate-spin" />
                  <span>Entering Room...</span>
                </>
              ) : (
                <>
                  <span>Enter Room</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <Link
              href="/"
              className="text-xs text-noir-400 hover:text-white transition-colors"
            >
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Waiting for state
  if (!gameState) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-8 h-8 border-3 border-amberGold-500/30 border-t-amberGold-500 rounded-full animate-spin mb-3" />
        <p className="text-xs text-noir-400">Loading Game State for {roomCode}...</p>
      </div>
    );
  }

  // Check if self player is eliminated
  const selfPlayer = gameState.players.find((p) => p.id === gameState.selfPlayerId);
  const isEliminated = selfPlayer && !selfPlayer.isAlive;

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Top Navbar */}
      <header className="border-b border-noir-800/80 bg-noir-950/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-white hover:text-blood-400 transition-colors group"
          >
            <div className="p-1.5 rounded-lg bg-blood-950 border border-blood-800/60 text-blood-400 group-hover:scale-105 transition-transform">
              <Skull className="w-4 h-4" />
            </div>
            <span className="font-extrabold tracking-tight text-sm">
              MAFIA <span className="text-blood-500">ONLINE</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="text-xs px-2.5 py-1 rounded-lg bg-noir-900 border border-noir-750 text-noir-300 font-mono">
              Room: <span className="text-amberGold-400 font-bold">{gameState.roomCode}</span>
            </div>

            <Link
              href="/"
              title="Leave Room"
              className="p-1.5 rounded-lg bg-noir-900 hover:bg-noir-850 border border-noir-750 text-noir-400 hover:text-white transition-colors"
            >
              <Home className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Game Screen */}
      <main className="flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full">
        {/* If eliminated, show Spectator God View */}
        {isEliminated && gameState.phase !== "game_over" && (
          <SpectatorView gameState={gameState} />
        )}

        {/* Phase Components */}
        {gameState.phase === "lobby" && <Lobby gameState={gameState} />}
        {gameState.phase === "night" && <NightPhase gameState={gameState} />}
        {gameState.phase === "day_reveal" && <DayReveal gameState={gameState} />}
        {gameState.phase === "day_voting" && <DayVoting gameState={gameState} />}
        {gameState.phase === "game_over" && <GameOver gameState={gameState} />}
      </main>
    </div>
  );
}
