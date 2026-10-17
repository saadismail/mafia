import { Server, Socket } from 'socket.io';
import { GameManager } from '../game/GameManager';
import { registerRoomHandlers } from './roomHandlers';
import { registerGameHandlers } from './gameHandlers';

export function setupSocketIO(io: Server, gameManager: GameManager): void {
  // Wire GameManager callbacks to Socket.IO
  gameManager.setCallbacks({
    onBroadcast: (roomCode: string, event: string, data: any) => {
      io.to(roomCode).emit(event, data);
    },
    onDirectMessage: (socketId: string, event: string, data: any) => {
      io.to(socketId).emit(event, data);
    },
  });

  io.on('connection', (socket: Socket) => {
    registerRoomHandlers(io, socket, gameManager);
    registerGameHandlers(io, socket, gameManager);

    socket.on('disconnect', () => {
      const player = gameManager.getPlayerBySocketId(socket.id);
      if (player) {
        socket.to(player.roomCode).emit('player-left', {
          playerId: player.id,
          name: player.name,
        });
      }

      gameManager.handleSocketDisconnect(socket.id);

      if (player) {
        gameManager.broadcastGameState(player.roomCode);
      }
    });
  });
}
