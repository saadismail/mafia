"use client";

import React from "react";
import { PlayerPublic, Role } from "@mafia/shared";
import { Skull, Shield, Search, User, Crown, WifiOff, Eye } from "lucide-react";

interface PlayerListProps {
  players: PlayerPublic[];
  selfPlayerId: string;
  selfRole?: Role;
  allRoles?: Record<string, Role>;
  isSpectator?: boolean;
}

export function PlayerList({
  players,
  selfPlayerId,
  selfRole,
  allRoles,
  isSpectator,
}: PlayerListProps) {
  const getRoleBadge = (player: PlayerPublic) => {
    // If allRoles is available (game_over or spectator view)
    const effectiveRole = allRoles?.[player.id] || player.role;

    if (!effectiveRole) {
      if (player.id === selfPlayerId && selfRole) {
        return renderRoleTag(selfRole);
      }
      return null;
    }

    return renderRoleTag(effectiveRole);
  };

  const renderRoleTag = (role: Role) => {
    switch (role) {
      case "mafia":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blood-950 border border-blood-800 text-blood-400">
            <Skull className="w-2.5 h-2.5" /> Mafia
          </span>
        );
      case "police":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-950 border border-policeBlue-600 text-policeBlue-400">
            <Search className="w-2.5 h-2.5" /> Police
          </span>
        );
      case "doctor":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-400">
            <Shield className="w-2.5 h-2.5" /> Doctor
          </span>
        );
      case "citizen":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-noir-800 border border-noir-600 text-noir-300">
            <User className="w-2.5 h-2.5" /> Citizen
          </span>
        );
    }
  };

  return (
    <div className="bg-noir-900/80 border border-noir-800 rounded-2xl p-4 sm:p-5 backdrop-blur-sm shadow-card-noir">
      <div className="flex items-center justify-between mb-3 border-b border-noir-800 pb-2">
        <h3 className="text-xs font-bold text-noir-400 uppercase tracking-wider flex items-center gap-2">
          <span>Players ({players.length})</span>
          {isSpectator && (
            <span className="inline-flex items-center gap-1 text-[10px] text-purple-400 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800">
              <Eye className="w-2.5 h-2.5" /> God View
            </span>
          )}
        </h3>
        <span className="text-[11px] text-noir-400">
          {players.filter((p) => p.isAlive).length} Alive
        </span>
      </div>

      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {players.map((p) => {
          const isSelf = p.id === selfPlayerId;

          return (
            <div
              key={p.id}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                !p.isAlive
                  ? "bg-noir-950/40 border-noir-850 opacity-60 line-through text-noir-500"
                  : isSelf
                  ? "bg-noir-850 border-noir-600 shadow-sm"
                  : "bg-noir-950/70 border-noir-800/80"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Connection dot */}
                <div className="relative shrink-0">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      p.isConnected ? "bg-emerald-500" : "bg-red-500 animate-pulse"
                    }`}
                  />
                  {!p.isConnected && (
                    <span className="sr-only">Disconnected</span>
                  )}
                </div>

                <div className="truncate flex items-center gap-1.5">
                  <span
                    className={`text-xs sm:text-sm font-semibold truncate ${
                      isSelf ? "text-amberGold-300 font-bold" : "text-white"
                    }`}
                  >
                    {p.name}
                  </span>

                  {isSelf && (
                    <span className="text-[10px] px-1 py-0.2 rounded bg-noir-800 text-noir-400 border border-noir-700">
                      You
                    </span>
                  )}

                  {p.isMafiaLeader && p.isAlive && (
                    <span
                      title="Mafia Leader (Submits kill)"
                      className="text-blood-400 inline-flex items-center"
                    >
                      <Crown className="w-3 h-3 text-blood-400" />
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {!p.isConnected && (
                  <span
                    title="Player disconnected — 60s reconnect grace period"
                    className="flex items-center gap-1 text-[10px] text-red-400 bg-red-950/80 px-1.5 py-0.5 rounded border border-red-800"
                  >
                    <WifiOff className="w-2.5 h-2.5" /> Reconnecting
                  </span>
                )}

                {!p.isAlive ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-noir-900 text-noir-500 border border-noir-800 not-italic">
                    Eliminated
                  </span>
                ) : (
                  getRoleBadge(p)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
