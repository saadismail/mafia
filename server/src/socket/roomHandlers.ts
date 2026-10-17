import { Socket, Server } from 'socket.io';
import { GameManager } from '../game/GameManager';

export function registerRoomHandlers(
  io: Server,
  socket: Socket,
  gameManager: GameManager
): void {
  // create-room
  socket.on('create-room', ({ playerName }, callback) => {
    try {
      const result = gameManager.createRoom(playerName, socket.id);
      socket.join(result.roomCode);

      if (typeof callback === 'function') {
        callback({
          success: true,
          roomCode: result.roomCode,
          playerId: result.playerId,
          sessionToken: result.sessionToken,
        });
      }

      gameManager.broadcastGameState(result.roomCode);
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({
          success: false,
          error: err.message || 'Failed to create room',
        });
      }
    }
  });

  // join-room
  socket.on('join-room', ({ roomCode, playerName, sessionToken }, callback) => {
    try {
      const result = gameManager.joinRoom(roomCode, playerName, socket.id, sessionToken);
      socket.join(result.roomCode);

      if (typeof callback === 'function') {
        callback({
          success: true,
          roomCode: result.roomCode,
          playerId: result.playerId,
          sessionToken: result.sessionToken,
        });
      }

      const player = gameManager.getPlayerBySocketId(socket.id);
      if (player) {
        socket.to(result.roomCode).emit('player-joined', {
          player: {
            id: player.id,
            name: player.name,
            isAlive: player.isAlive,
            isConnected: player.isConnected,
          },
        });
      }

      gameManager.broadcastGameState(result.roomCode);
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({
          success: false,
          error: err.message || 'Failed to join room',
        });
      }
    }
  });

  // reconnect-session
  socket.on('reconnect-session', ({ roomCode, sessionToken }, callback) => {
    try {
      const gameState = gameManager.reconnectSession(roomCode, sessionToken, socket.id);
      socket.join(roomCode.toUpperCase().trim());

      if (typeof callback === 'function') {
        callback({
          success: true,
          gameState,
        });
      }

      gameManager.broadcastGameState(roomCode.toUpperCase().trim());
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({
          success: false,
          error: err.message || 'Failed to reconnect session',
        });
      }
    }
  });
}
