"use client";

import React from "react";
import { useSocket } from "@/context/SocketContext";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";

export function NotificationToast() {
  const { notifications, removeNotification } = useSocket();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {notifications.map((item) => {
        let borderClass = "border-noir-600 bg-noir-900/90 text-noir-100";
        let Icon = Info;
        let iconColor = "text-blue-400";

        if (item.type === "danger") {
          borderClass = "border-blood-500/80 bg-blood-900/90 text-white shadow-glow-crimson";
          Icon = AlertCircle;
          iconColor = "text-blood-400";
        } else if (item.type === "success") {
          borderClass = "border-emerald-500/80 bg-emerald-950/90 text-white shadow-glow-green";
          Icon = CheckCircle;
          iconColor = "text-emerald-400";
        } else if (item.type === "warning") {
          borderClass = "border-amberGold-500/80 bg-amber-950/90 text-white shadow-glow-gold";
          Icon = AlertCircle;
          iconColor = "text-amber-400";
        }

        return (
          <div
            key={item.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 animate-fade-in ${borderClass}`}
          >
            <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconColor}`} />
            <div className="flex-1 text-sm font-medium leading-snug">{item.message}</div>
            <button
              onClick={() => removeNotification(item.id)}
              className="text-noir-400 hover:text-white p-0.5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
