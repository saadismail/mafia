"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import {
  GameStatePublic,
  MafiaChatMessage,
  ClientToServerEvents,
  ServerToClientEvents,
  Role,
} from "@mafia/shared";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface NotificationItem {
  id: string;
  message: string;
  type: "info" | "warning" | "success" | "danger";
  timestamp: number;
}

interface SocketContextType {
  socket: TypedSocket | null;
  isConnected: boolean;
  gameState: GameStatePublic | null;
  mafiaMessages: MafiaChatMessage[];
  notifications: NotificationItem[];
  error: string | null;
  isConnecting: boolean;
  createRoom: (playerName: string) => Promise<{ success: boolean; roomCode?: string; error?: string }>;
  joinRoom: (roomCode: string, playerName: string) => Promise<{ success: boolean; error?: string }>;
  reconnectSession: (roomCode: string) => Promise<boolean>;
  startGame: () => Promise<boolean>;
  sendMafiaChat: (message: string) => void;
  submitMafiaKill: (targetId: string) => Promise<boolean>;
  investigatePlayer: (targetId: string) => Promise<{ success: boolean; isMafia?: boolean; error?: string }>;
  protectPlayer: (targetId: string) => Promise<boolean>;
  proceedToVote: () => Promise<boolean>;
  castVote: (targetId: string) => Promise<boolean>;
  startNewGame: () => Promise<boolean>;
  clearError: () => void;
  removeNotification: (id: string) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<TypedSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [gameState, setGameState] = useState<GameStatePublic | null>(null);
  const [mafiaMessages, setMafiaMessages] = useState<MafiaChatMessage[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addNotification = useCallback((message: string, type: NotificationItem["type"] = "info") => {
    const item: NotificationItem = {
      id: Math.random().toString(36).substring(2, 9),
      message,
      type,
      timestamp: Date.now(),
    };
    setNotifications((prev) => [...prev.slice(-4), item]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== item.id));
    }, 5000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    const socketInstance: TypedSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      autoConnect: true,
    });

    socketRef.current = socketInstance;

    socketInstance.on("connect", () => {
      setIsConnected(true);
      setIsConnecting(false);
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
      setIsConnecting(false);
    });

    socketInstance.on("connect_error", (err) => {
      setIsConnected(false);
      setIsConnecting(false);
      console.warn("Socket connect error:", err.message);
    });

    socketInstance.on("game-state", (state: GameStatePublic) => {
      setGameState(state);
      // If round changes or reset to lobby, clear old messages if needed
      if (state.phase === "lobby") {
        setMafiaMessages([]);
      }
    });

    socketInstance.on("mafia-message", (msg: MafiaChatMessage) => {
      setMafiaMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socketInstance.on("investigation-result", (data) => {
      addNotification(
        `Investigation result: ${data.targetName} ${data.isMafia ? "IS MAFIA! 🕵️‍♂️🩸" : "is NOT Mafia 🕊️"}`,
        data.isMafia ? "danger" : "success"
      );
    });

    socketInstance.on("game-over", (data) => {
      addNotification(
        `Game Over! ${data.winner === "town" ? "Town" : "Mafia"} victory! 🏆`,
        data.winner === "town" ? "success" : "danger"
      );
    });

    socketInstance.on("notification", (data) => {
      addNotification(data.message, data.type || "info");
    });

    socketInstance.on("error-message", (data) => {
      setError(data.message);
      addNotification(data.message, "danger");
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [addNotification]);

  // Create room
  const createRoom = useCallback(
    async (playerName: string) => {
      if (!socketRef.current) return { success: false, error: "Socket not connected" };
      clearError();
      return new Promise<{ success: boolean; roomCode?: string; error?: string }>((resolve) => {
        socketRef.current!.emit("create-room", { playerName }, (res) => {
          if (res.success && res.roomCode && res.sessionToken) {
            if (typeof window !== "undefined") {
              localStorage.setItem(`mafia_token_${res.roomCode}`, res.sessionToken);
              localStorage.setItem("mafia_player_name", playerName);
              if (res.playerId) {
                localStorage.setItem(`mafia_player_${res.roomCode}`, res.playerId);
              }
            }
            resolve({ success: true, roomCode: res.roomCode });
          } else {
            setError(res.error || "Failed to create room");
            resolve({ success: false, error: res.error || "Failed to create room" });
          }
        });
      });
    },
    [clearError]
  );

  // Join room
  const joinRoom = useCallback(
    async (roomCode: string, playerName: string) => {
      if (!socketRef.current) return { success: false, error: "Socket not connected" };
      clearError();
      const cleanCode = roomCode.trim().toUpperCase();
      let sessionToken: string | undefined = undefined;
      if (typeof window !== "undefined") {
        sessionToken = localStorage.getItem(`mafia_token_${cleanCode}`) || undefined;
      }

      return new Promise<{ success: boolean; error?: string }>((resolve) => {
        socketRef.current!.emit("join-room", { roomCode: cleanCode, playerName, sessionToken }, (res) => {
          if (res.success && res.sessionToken) {
            if (typeof window !== "undefined") {
              localStorage.setItem(`mafia_token_${cleanCode}`, res.sessionToken);
              localStorage.setItem("mafia_player_name", playerName);
              if (res.playerId) {
                localStorage.setItem(`mafia_player_${cleanCode}`, res.playerId);
              }
            }
            resolve({ success: true });
          } else {
            setError(res.error || "Failed to join room");
            resolve({ success: false, error: res.error });
          }
        });
      });
    },
    [clearError]
  );

  // Reconnect with session token
  const reconnectSession = useCallback(
    async (roomCode: string) => {
      if (!socketRef.current) return false;
      const cleanCode = roomCode.trim().toUpperCase();
      let sessionToken: string | null = null;
      if (typeof window !== "undefined") {
        sessionToken = localStorage.getItem(`mafia_token_${cleanCode}`);
      }
      if (!sessionToken) return false;

      return new Promise<boolean>((resolve) => {
        socketRef.current!.emit("reconnect-session", { roomCode: cleanCode, sessionToken: sessionToken! }, (res) => {
          if (res.success && res.gameState) {
            setGameState(res.gameState);
            resolve(true);
          } else {
            resolve(false);
          }
        });
      });
    },
    []
  );

  // Start game
  const startGame = useCallback(async () => {
    if (!socketRef.current || !gameState) return false;
    return new Promise<boolean>((resolve) => {
      socketRef.current!.emit("start-game", { roomCode: gameState.roomCode }, (res) => {
        if (res && !res.success && res.error) {
          setError(res.error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }, [gameState]);

  // Mafia chat
  const sendMafiaChat = useCallback(
    (message: string) => {
      if (!socketRef.current || !gameState || !message.trim()) return;
      socketRef.current.emit("mafia-chat", { roomCode: gameState.roomCode, message: message.trim() });
    },
    [gameState]
  );

  // Mafia kill
  const submitMafiaKill = useCallback(
    async (targetId: string) => {
      if (!socketRef.current || !gameState) return false;
      return new Promise<boolean>((resolve) => {
        socketRef.current!.emit("mafia-kill", { roomCode: gameState.roomCode, targetId }, (res) => {
          if (res && !res.success) {
            if (res.error) setError(res.error);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    },
    [gameState]
  );

  // Police investigate
  const investigatePlayer = useCallback(
    async (targetId: string) => {
      if (!socketRef.current || !gameState) return { success: false, error: "Not ready" };
      return new Promise<{ success: boolean; isMafia?: boolean; error?: string }>((resolve) => {
        socketRef.current!.emit("police-investigate", { roomCode: gameState.roomCode, targetId }, (res) => {
          if (res && !res.success) {
            if (res.error) setError(res.error);
            resolve({ success: false, error: res.error });
          } else {
            resolve({ success: true, isMafia: res.isMafia });
          }
        });
      });
    },
    [gameState]
  );

  // Doctor protect
  const protectPlayer = useCallback(
    async (targetId: string) => {
      if (!socketRef.current || !gameState) return false;
      return new Promise<boolean>((resolve) => {
        socketRef.current!.emit("doctor-protect", { roomCode: gameState.roomCode, targetId }, (res) => {
          if (res && !res.success) {
            if (res.error) setError(res.error);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    },
    [gameState]
  );

  // Proceed to vote
  const proceedToVote = useCallback(async () => {
    if (!socketRef.current || !gameState) return false;
    return new Promise<boolean>((resolve) => {
      socketRef.current!.emit("proceed-to-vote", { roomCode: gameState.roomCode }, (res) => {
        if (res && !res.success) {
          if (res.error) setError(res.error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }, [gameState]);

  // Cast vote
  const castVote = useCallback(
    async (targetId: string) => {
      if (!socketRef.current || !gameState) return false;
      return new Promise<boolean>((resolve) => {
        socketRef.current!.emit("cast-vote", { roomCode: gameState.roomCode, targetId }, (res) => {
          if (res && !res.success) {
            if (res.error) setError(res.error);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    },
    [gameState]
  );

  // Start new game
  const startNewGame = useCallback(async () => {
    if (!socketRef.current || !gameState) return false;
    return new Promise<boolean>((resolve) => {
      socketRef.current!.emit("new-game", { roomCode: gameState.roomCode }, (res) => {
        if (res && !res.success) {
          if (res.error) setError(res.error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }, [gameState]);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        isConnecting,
        gameState,
        mafiaMessages,
        notifications,
        error,
        createRoom,
        joinRoom,
        reconnectSession,
        startGame,
        sendMafiaChat,
        submitMafiaKill,
        investigatePlayer,
        protectPlayer,
        proceedToVote,
        castVote,
        startNewGame,
        clearError,
        removeNotification,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
