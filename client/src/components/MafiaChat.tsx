"use client";

import React, { useState, useRef, useEffect } from "react";
import { MafiaChatMessage } from "@mafia/shared";
import { useSocket } from "@/context/SocketContext";
import { Send, MessageSquare, Skull } from "lucide-react";

interface MafiaChatProps {
  messages: MafiaChatMessage[];
  selfPlayerId: string;
}

export function MafiaChat({ messages, selfPlayerId }: MafiaChatProps) {
  const { sendMafiaChat } = useSocket();
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendMafiaChat(inputText.trim());
    setInputText("");
  };

  return (
    <div className="flex flex-col h-[340px] sm:h-[380px] bg-noir-900/90 border border-blood-900/60 rounded-2xl shadow-card-noir overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-blood-950/60 border-b border-blood-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skull className="w-4 h-4 text-blood-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-blood-300">
            Syndicate Secure Channel
          </span>
        </div>
        <span className="text-[10px] text-blood-400/80 bg-blood-900/40 px-2 py-0.5 rounded border border-blood-800/40">
          Private to Living Mafia
        </span>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-noir-500">
            <MessageSquare className="w-8 h-8 mb-2 opacity-40 text-blood-400" />
            <p className="text-xs">No whispers yet. Coordinate with your fellow mafias on tonight's hit!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.fromId === selfPlayerId;
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-noir-400 mb-1 px-1">
                  <span className={isSelf ? "text-amberGold-400 font-semibold" : "text-blood-300 font-semibold"}>
                    {msg.fromName}
                  </span>
                  <span className="text-[10px] text-noir-500">{timeStr}</span>
                </div>
                <div
                  className={`px-3.5 py-2 rounded-2xl text-xs max-w-[85%] break-words ${
                    isSelf
                      ? "bg-blood-700 text-white rounded-tr-xs"
                      : "bg-noir-800 text-noir-100 border border-noir-700/80 rounded-tl-xs"
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-2.5 bg-noir-950 border-t border-noir-800 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Whisper to syndicate..."
          maxLength={150}
          className="flex-1 px-3.5 py-2 rounded-xl bg-noir-900 border border-noir-750 text-white text-xs placeholder-noir-500 focus:outline-none focus:border-blood-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 rounded-xl bg-blood-600 hover:bg-blood-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
