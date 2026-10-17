"use client";

import React, { useState } from "react";
import { GameStatePublic, Role } from "@mafia/shared";
import { useSocket } from "@/context/SocketContext";
import {
  Moon,
  Skull,
  Shield,
  Search,
  User,
  Crown,
  Crosshair,
  CheckCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { MafiaChat } from "./MafiaChat";
import { PlayerList } from "./PlayerList";

interface NightPhaseProps {
  gameState: GameStatePublic;
}

export function NightPhase({ gameState }: NightPhaseProps) {
  const {
    submitMafiaKill,
    investigatePlayer,
    protectPlayer,
    mafiaMessages,
  } = useSocket();

  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [investigationResult, setInvestigationResult] = useState<{
    targetName: string;
    isMafia: boolean;
  } | null>(gameState.policeInvestigationResult ? {
    targetName: gameState.policeInvestigationResult.targetName,
    isMafia: gameState.policeInvestigationResult.isMafia
  } : null);

  const selfRole = gameState.selfRole || "citizen";
  const selfPlayer = gameState.players.find((p) => p.id === gameState.selfPlayerId);
  const isAlive = selfPlayer?.isAlive ?? true;
  const isMafiaLeader = !!gameState.isMafiaLeader;
  const hasActed = !!gameState.nightActionCompleted;

  // Filter alive targets
  const alivePlayers = gameState.players.filter((p) => p.isAlive);
  const livingMafiaIds = gameState.livingMafiaIds || [];

  // Allowed targets per role:
  // Mafia: alive non-mafias (or any other alive player)
  const mafiaEligibleTargets = alivePlayers.filter(
    (p) => !livingMafiaIds.includes(p.id)
  );

  // Police: alive players excluding self
  const policeEligibleTargets = alivePlayers.filter(
    (p) => p.id !== gameState.selfPlayerId
  );

  // Doctor: all alive players including self
  const doctorEligibleTargets = alivePlayers;

  const handleAction = async () => {
    if (!selectedTarget || isSubmitting || hasActed) return;
    setIsSubmitting(true);

    try {
      if (selfRole === "mafia" && isMafiaLeader) {
        await submitMafiaKill(selectedTarget);
      } else if (selfRole === "police") {
        const res = await investigatePlayer(selectedTarget);
        if (res.success && res.isMafia !== undefined) {
          const target = gameState.players.find((p) => p.id === selectedTarget);
          setInvestigationResult({
            targetName: target ? target.name : "Target",
            isMafia: res.isMafia,
          });
        }
      } else if (selfRole === "doctor") {
        await protectPlayer(selectedTarget);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleHeaderInfo = () => {
    switch (selfRole) {
      case "mafia":
        return {
          title: "The Mafia",
          badge: "Syndicate",
          color: "border-blood-600/70 text-blood-400 bg-blood-950/60 shadow-glow-crimson",
          icon: Skull,
          description: isMafiaLeader
            ? "You are tonight's Mafia Leader! Consult your fellow mobsters in private chat, choose your hit, and confirm the kill."
            : "You are a Mafia Operative. Discuss tonight's target in the syndicate chat with your leader.",
        };
      case "police":
        return {
          title: "The Police Detective",
          badge: "Law Enforcement",
          color: "border-policeBlue-500/70 text-policeBlue-400 bg-blue-950/60 shadow-glow-blue",
          icon: Search,
          description:
            "Select one suspect to covertly interrogate. You will immediately discover whether they belong to the Mafia.",
        };
      case "doctor":
        return {
          title: "The Doctor",
          badge: "Medical Protection",
          color: "border-emerald-600/70 text-emerald-400 bg-emerald-950/60 shadow-glow-green",
          icon: Shield,
          description:
            "Select one person to protect from assassination tonight. You may choose yourself or an ally.",
        };
      case "citizen":
      default:
        return {
          title: "Innocent Citizen",
          badge: "Townsperson",
          color: "border-noir-700 text-noir-200 bg-noir-900/80 shadow-card-noir",
          icon: User,
          description:
            "You have no night actions. The town is wrapped in darkness and danger. Sleep quietly and wait for dawn.",
        };
    }
  };

  const roleInfo = getRoleHeaderInfo();
  const RoleIcon = roleInfo.icon;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Night Sky Atmospheric Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-noir-900 via-noir-950 to-noir-950 border border-noir-800 p-6 sm:p-8 shadow-card-noir">
        <div className="absolute top-2 right-4 text-noir-700/30 flex items-center gap-2 pointer-events-none select-none">
          <Moon className="w-24 h-24 stroke-[1]" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/70 border border-indigo-800/60 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Night {gameState.round}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Darkness Falls Over the Town
            </h1>
            <p className="text-xs sm:text-sm text-noir-400 mt-1 max-w-xl">
              Special operatives are making their nocturnal moves under cover of shadow.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-amberGold-400 bg-amberGold-500/10 border border-amberGold-500/30 px-3 py-1.5 rounded-xl self-start sm:self-center">
            <Clock className="w-4 h-4 animate-spin" />
            <span>Night Phase Active</span>
          </div>
        </div>
      </div>

      {/* Secret Role Card */}
      <div className={`p-5 sm:p-6 rounded-2xl border backdrop-blur-md transition-all ${roleInfo.color}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-noir-950/80 border border-white/10">
              <RoleIcon className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider opacity-75">
                  Your Secret Role
                </span>
                {selfRole === "mafia" && isMafiaLeader && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blood-800 text-white border border-blood-600">
                    <Crown className="w-3 h-3 text-amberGold-400" /> Tonight's Leader
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {roleInfo.title}
              </h2>
            </div>
          </div>

          {hasActed && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950 border border-emerald-600 text-emerald-400 text-xs font-bold shadow-glow-green">
              <CheckCircle className="w-4 h-4" />
              <span>Night Action Confirmed</span>
            </div>
          )}
        </div>

        <p className="text-xs sm:text-sm leading-relaxed opacity-90 max-w-2xl">
          {roleInfo.description}
        </p>
      </div>

      {/* Main Night Action Interactive Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Role Specific Action */}
        <div className="md:col-span-2 space-y-6">
          {/* ================= MAFIA VIEW ================= */}
          {selfRole === "mafia" && (
            <div className="space-y-6">
              {/* Target selection if leader */}
              <div className="bg-noir-900/90 border border-blood-900/60 rounded-2xl p-5 shadow-card-noir space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-blood-400" />
                    <span>Select Assassination Target</span>
                  </h3>
                  {isMafiaLeader ? (
                    <span className="text-xs text-blood-400 font-semibold bg-blood-950 px-2 py-0.5 rounded border border-blood-800">
                      You are Leader: Strike Decision
                    </span>
                  ) : (
                    <span className="text-xs text-noir-400">
                      Leader submits target
                    </span>
                  )}
                </div>

                {hasActed ? (
                  <div className="p-4 rounded-xl bg-blood-950/40 border border-blood-800/60 text-center text-xs text-blood-300">
                    Target confirmed. Waiting for police and doctor to complete their moves...
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {mafiaEligibleTargets.map((target) => {
                        const isSelected = selectedTarget === target.id;
                        return (
                          <button
                            key={target.id}
                            disabled={!isMafiaLeader || isSubmitting}
                            onClick={() => setSelectedTarget(target.id)}
                            className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                              isSelected
                                ? "bg-blood-900/80 border-blood-500 shadow-glow-crimson text-white"
                                : "bg-noir-950 border-noir-800 hover:border-blood-800/80 text-noir-200"
                            } ${!isMafiaLeader ? "cursor-default" : "cursor-pointer"}`}
                          >
                            <span className="font-semibold text-xs truncate">
                              {target.name}
                            </span>
                            {isSelected && (
                              <Crosshair className="w-4 h-4 text-blood-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {isMafiaLeader && (
                      <button
                        onClick={handleAction}
                        disabled={!selectedTarget || isSubmitting}
                        className="w-full py-3 rounded-xl font-bold text-xs tracking-wider uppercase bg-blood-600 hover:bg-blood-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-glow-crimson transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            <span>Submitting Hit...</span>
                          </>
                        ) : (
                          <>
                            <Skull className="w-4 h-4" />
                            <span>Confirm Assassination</span>
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Private Mafia Chat */}
              <MafiaChat messages={mafiaMessages} selfPlayerId={gameState.selfPlayerId} />
            </div>
          )}

          {/* ================= POLICE VIEW ================= */}
          {selfRole === "police" && (
            <div className="bg-noir-900/90 border border-policeBlue-600/40 rounded-2xl p-5 shadow-card-noir space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Search className="w-4 h-4 text-policeBlue-400" />
                  <span>Select Suspect to Interrogate</span>
                </h3>
                <span className="text-xs text-policeBlue-400">Night Inquiry</span>
              </div>

              {investigationResult ? (
                <div
                  className={`p-5 rounded-2xl border ${
                    investigationResult.isMafia
                      ? "bg-blood-950/80 border-blood-600 text-blood-200 shadow-glow-crimson"
                      : "bg-emerald-950/80 border-emerald-600 text-emerald-200 shadow-glow-green"
                  } animate-fade-in text-center space-y-2`}
                >
                  <div className="text-3xl">
                    {investigationResult.isMafia ? "🩸" : "🕊️"}
                  </div>
                  <div className="text-lg font-black text-white">
                    {investigationResult.targetName}
                  </div>
                  <div className="text-sm font-bold uppercase tracking-wider">
                    {investigationResult.isMafia
                      ? "IS A MAFIA MEMBER!"
                      : "IS NOT MAFIA (INNOCENT)"}
                  </div>
                  <p className="text-xs opacity-75 pt-1">
                    Keep this knowledge safe and steer the vote during the day!
                  </p>
                </div>
              ) : hasActed ? (
                <div className="p-4 rounded-xl bg-blue-950/40 border border-policeBlue-800 text-center text-xs text-policeBlue-300">
                  Inquiry completed. Waiting for the rest of the town...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {policeEligibleTargets.map((target) => {
                      const isSelected = selectedTarget === target.id;
                      return (
                        <button
                          key={target.id}
                          disabled={isSubmitting}
                          onClick={() => setSelectedTarget(target.id)}
                          className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? "bg-policeBlue-600/30 border-policeBlue-500 shadow-glow-blue text-white"
                              : "bg-noir-950 border-noir-800 hover:border-policeBlue-800/80 text-noir-200"
                          }`}
                        >
                          <span className="font-semibold text-xs truncate">
                            {target.name}
                          </span>
                          {isSelected && (
                            <Search className="w-4 h-4 text-policeBlue-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={handleAction}
                    disabled={!selectedTarget || isSubmitting}
                    className="w-full py-3 rounded-xl font-bold text-xs tracking-wider uppercase bg-policeBlue-600 hover:bg-policeBlue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-glow-blue transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>Investigating...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Interrogate Suspect</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ================= DOCTOR VIEW ================= */}
          {selfRole === "doctor" && (
            <div className="bg-noir-900/90 border border-emerald-600/40 rounded-2xl p-5 shadow-card-noir space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Select Patient to Protect</span>
                </h3>
                <span className="text-xs text-emerald-400">Medical Guard</span>
              </div>

              {hasActed ? (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-center text-xs text-emerald-300">
                  Protection administered! If Mafia attacks your patient tonight, they will survive.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {doctorEligibleTargets.map((target) => {
                      const isSelected = selectedTarget === target.id;
                      const isSelf = target.id === gameState.selfPlayerId;
                      return (
                        <button
                          key={target.id}
                          disabled={isSubmitting}
                          onClick={() => setSelectedTarget(target.id)}
                          className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? "bg-emerald-950/80 border-emerald-500 shadow-glow-green text-white"
                              : "bg-noir-950 border-noir-800 hover:border-emerald-800/80 text-noir-200"
                          }`}
                        >
                          <div className="truncate">
                            <span className="font-semibold text-xs truncate">
                              {target.name}
                            </span>
                            {isSelf && (
                              <span className="ml-1.5 text-[10px] text-emerald-400">
                                (Self)
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={handleAction}
                    disabled={!selectedTarget || isSubmitting}
                    className="w-full py-3 rounded-xl font-bold text-xs tracking-wider uppercase bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-glow-green transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>Administering Guard...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        <span>Protect Patient</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ================= CITIZEN VIEW ================= */}
          {selfRole === "citizen" && (
            <div className="p-8 sm:p-12 rounded-2xl bg-noir-900/90 border border-noir-800 shadow-card-noir text-center space-y-4">
              <div className="inline-flex p-4 rounded-full bg-noir-950 border border-noir-850 shadow-inner">
                <Moon className="w-10 h-10 text-noir-500 animate-pulse-slow" />
              </div>
              <h3 className="text-xl font-bold text-white">
                The Town is Asleep
              </h3>
              <p className="text-xs sm:text-sm text-noir-400 max-w-md mx-auto leading-relaxed">
                Mafias are prowling the silent cobblestone streets. The Doctor and Detective are making their moves. Wait until dawn breaks to discover what happened.
              </p>
              <div className="inline-flex items-center gap-2 text-xs text-noir-500 pt-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>Awaiting Night Resolution...</span>
              </div>
            </div>
          )}
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
