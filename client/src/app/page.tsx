"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/context/SocketContext";
import {
  Skull,
  Shield,
  Search,
  Users,
  Flame,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Wifi,
  WifiOff,
  Crosshair,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { createRoom, joinRoom, isConnected, isConnecting, error, clearError } = useSocket();

  // Create room state
  const [createName, setCreateName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Join room state
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // Rules accordion state
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || isCreating) return;

    setIsCreating(true);
    clearError();
    const result = await createRoom(createName.trim());
    setIsCreating(false);

    if (result.success && result.roomCode) {
      router.push(`/room/${result.roomCode}`);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !joinName.trim() || isJoining) return;

    setIsJoining(true);
    clearError();
    const result = await joinRoom(joinCode.trim(), joinName.trim());
    setIsJoining(false);

    if (result.success) {
      router.push(`/room/${joinCode.trim().toUpperCase()}`);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12 max-w-5xl mx-auto w-full">
      {/* Top status bar */}
      <div className="w-full flex items-center justify-end mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-noir-850/80 border border-noir-700/60 text-xs backdrop-blur-sm">
          {isConnected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-noir-300">Server Connected</span>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            </>
          ) : isConnecting ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-noir-300">Connecting...</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-blood-500" />
              <span className="text-blood-400">Server Offline</span>
              <WifiOff className="w-3.5 h-3.5 text-blood-400" />
            </>
          )}
        </div>
      </div>

      {/* Cinematic Header */}
      <div className="text-center mb-10 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blood-900/40 border border-blood-700/50 text-blood-400 text-xs font-semibold tracking-widest uppercase mb-4 shadow-glow-crimson">
          <Flame className="w-3.5 h-3.5" />
          Multiplayer Social Deduction
        </div>
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white mb-3">
          MAFIA <span className="text-transparent bg-clip-text bg-gradient-to-r from-blood-500 via-blood-400 to-amber-500">ONLINE</span>
        </h1>
        <p className="text-noir-300 text-base sm:text-lg font-normal leading-relaxed">
          Trust no one. Deceive everyone. Uncover the syndicate before dusk falls on the city.
        </p>
      </div>

      {/* Global Error Banner if any */}
      {error && (
        <div className="w-full max-w-2xl mb-6 p-4 rounded-xl border border-blood-600/70 bg-blood-950/70 text-blood-200 text-sm flex items-center justify-between shadow-glow-crimson animate-fade-in">
          <span>{error}</span>
          <button
            onClick={clearError}
            className="text-xs uppercase font-bold tracking-wider px-2 py-1 bg-blood-900/60 hover:bg-blood-800 rounded border border-blood-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Action Cards: Create & Join */}
      <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {/* Create Room Card */}
        <div className="relative group rounded-2xl bg-gradient-to-b from-noir-800 to-noir-900 border border-noir-700/80 p-6 sm:p-8 shadow-card-noir hover:border-blood-500/50 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blood-600/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blood-600/20 transition-all" />
          
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-blood-950/80 border border-blood-700/60 text-blood-400">
              <Crosshair className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Create Room</h2>
              <p className="text-xs text-noir-400">Host a new game for friends</p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="space-y-4 mt-6">
            <div>
              <label htmlFor="create-name" className="block text-xs font-medium text-noir-300 mb-1.5 uppercase tracking-wider">
                Your Display Name
              </label>
              <input
                id="create-name"
                type="text"
                placeholder="e.g. Don Corleone"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                maxLength={20}
                required
                className="w-full px-4 py-3 rounded-xl bg-noir-950 border border-noir-700 text-white placeholder-noir-500 focus:outline-none focus:border-blood-500 focus:ring-1 focus:ring-blood-500 transition-all text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isCreating || !createName.trim()}
              className="w-full py-3.5 px-5 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r from-blood-600 to-blood-500 hover:from-blood-500 hover:to-blood-400 active:scale-[0.99] text-white shadow-glow-crimson transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Creating Room...</span>
                </>
              ) : (
                <>
                  <span>Create Room</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Join Room Card */}
        <div className="relative group rounded-2xl bg-gradient-to-b from-noir-800 to-noir-900 border border-noir-700/80 p-6 sm:p-8 shadow-card-noir hover:border-amberGold-500/50 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amberGold-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amberGold-500/20 transition-all" />

          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-amber-950/80 border border-amberGold-500/40 text-amberGold-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Join Room</h2>
              <p className="text-xs text-noir-400">Enter code to join a game</p>
            </div>
          </div>

          <form onSubmit={handleJoin} className="space-y-4 mt-6">
            <div>
              <label htmlFor="join-code" className="block text-xs font-medium text-noir-300 mb-1.5 uppercase tracking-wider">
                6-Character Room Code
              </label>
              <input
                id="join-code"
                type="text"
                placeholder="e.g. M7X9K2"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={8}
                required
                className="w-full px-4 py-3 rounded-xl bg-noir-950 border border-noir-700 text-white placeholder-noir-500 uppercase tracking-widest font-mono text-center focus:outline-none focus:border-amberGold-400 focus:ring-1 focus:ring-amberGold-400 transition-all text-sm"
              />
            </div>

            <div>
              <label htmlFor="join-name" className="block text-xs font-medium text-noir-300 mb-1.5 uppercase tracking-wider">
                Your Display Name
              </label>
              <input
                id="join-name"
                type="text"
                placeholder="e.g. Detective Miller"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                maxLength={20}
                required
                className="w-full px-4 py-3 rounded-xl bg-noir-950 border border-noir-700 text-white placeholder-noir-500 focus:outline-none focus:border-amberGold-400 focus:ring-1 focus:ring-amberGold-400 transition-all text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isJoining || !joinCode.trim() || !joinName.trim()}
              className="w-full py-3.5 px-5 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r from-noir-700 to-noir-600 hover:from-noir-600 hover:to-noir-500 text-white border border-noir-500/80 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isJoining ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Entering Room...</span>
                </>
              ) : (
                <>
                  <span>Join Room</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Rules & Guide Accordion */}
      <div className="w-full max-w-3xl rounded-2xl bg-noir-900/90 border border-noir-800 overflow-hidden shadow-card-noir mb-8">
        <button
          onClick={() => setIsRulesOpen(!isRulesOpen)}
          className="w-full p-5 sm:p-6 flex items-center justify-between text-left hover:bg-noir-850/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amberGold-400" />
            <div>
              <h3 className="font-bold text-white text-base">How to Play & Role Guide</h3>
              <p className="text-xs text-noir-400">Rules, win conditions, and abilities overview</p>
            </div>
          </div>
          {isRulesOpen ? (
            <ChevronUp className="w-5 h-5 text-noir-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-noir-400" />
          )}
        </button>

        {isRulesOpen && (
          <div className="p-6 pt-0 border-t border-noir-800 space-y-6 text-sm text-noir-300">
            {/* Roles Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="p-4 rounded-xl bg-noir-950/60 border border-blood-800/40">
                <div className="flex items-center gap-2 text-blood-400 font-bold mb-1.5">
                  <Skull className="w-4 h-4" />
                  <span>Mafia (The Syndicate)</span>
                </div>
                <p className="text-xs leading-relaxed text-noir-300">
                  Knows fellow Mafias. Conspires in private night chat. The designated rotating Mafia Leader confirms the night kill target.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-noir-950/60 border border-policeBlue-500/40">
                <div className="flex items-center gap-2 text-policeBlue-400 font-bold mb-1.5">
                  <Search className="w-4 h-4" />
                  <span>Police (The Detective)</span>
                </div>
                <p className="text-xs leading-relaxed text-noir-300">
                  Each night, interrogates one suspect to uncover whether they are Mafia or innocent. Shares discoveries cautiously by day.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-noir-950/60 border border-emerald-500/40">
                <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1.5">
                  <Shield className="w-4 h-4" />
                  <span>Doctor (The Protector)</span>
                </div>
                <p className="text-xs leading-relaxed text-noir-300">
                  Each night, administers medical protection to one player (or oneself). If the protected player is targeted, they survive.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-noir-950/60 border border-noir-700">
                <div className="flex items-center gap-2 text-noir-200 font-bold mb-1.5">
                  <Users className="w-4 h-4" />
                  <span>Citizen (The Town)</span>
                </div>
                <p className="text-xs leading-relaxed text-noir-300">
                  Has no night abilities. Must observe behavior, detect lies, debate during the day, and cast crucial elimination votes.
                </p>
              </div>
            </div>

            {/* Win conditions */}
            <div className="p-4 rounded-xl bg-noir-950/80 border border-noir-800 space-y-2 text-xs">
              <h4 className="font-bold text-white text-sm">Win Conditions</h4>
              <p>
                <strong className="text-emerald-400">Town Victory:</strong> All Mafia members are identified and eliminated by vote.
              </p>
              <p>
                <strong className="text-blood-400">Mafia Victory:</strong> Living Mafias equal or outnumber living non-Mafia citizens.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-noir-500">
        4–15 Players • Automated Moderator • Private Roles & God View Spectators
      </footer>
    </main>
  );
}
