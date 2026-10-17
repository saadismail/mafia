import { Socket, Server } from 'socket.io';
import { GameManager } from '../game/GameManager';

export function registerGameHandlers(
  io: Server,
  socket: Socket,
  gameManager: GameManager
): void {
  // start-game
  socket.on('start-game', ({ roomCode }, callback) => {
    try {
      gameManager.startGame(roomCode);
      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message || 'Failed to start game' });
      } else {
        socket.emit('error-message', { message: err.message || 'Failed to start game' });
      }
    }
  });

  // mafia-chat
  socket.on('mafia-chat', ({ roomCode, message }) => {
    try {
      const player = gameManager.getPlayerBySocketId(socket.id);
      if (!player) {
        socket.emit('error-message', { message: 'Player not found' });
        return;
      }
      gameManager.sendMafiaChat(roomCode, player.id, message);
    } catch (err: any) {
      socket.emit('error-message', { message: err.message || 'Failed to send mafia chat' });
    }
  });

  // mafia-kill
  socket.on('mafia-kill', ({ roomCode, targetId }, callback) => {
    try {
      const player = gameManager.getPlayerBySocketId(socket.id);
      if (!player) throw new Error('Player not found');
      gameManager.handleMafiaKill(roomCode, player.id, targetId);
      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message || 'Failed to submit kill target' });
      } else {
        socket.emit('error-message', { message: err.message });
      }
    }
  });

  // police-investigate
  socket.on('police-investigate', ({ roomCode, targetId }, callback) => {
    try {
      const player = gameManager.getPlayerBySocketId(socket.id);
      if (!player) throw new Error('Player not found');
      const { isMafia } = gameManager.handlePoliceInvestigate(roomCode, player.id, targetId);
      if (typeof callback === 'function') {
        callback({ success: true, isMafia });
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message || 'Failed to investigate target' });
      } else {
        socket.emit('error-message', { message: err.message });
      }
    }
  });

  // doctor-protect
  socket.on('doctor-protect', ({ roomCode, targetId }, callback) => {
    try {
      const player = gameManager.getPlayerBySocketId(socket.id);
      if (!player) throw new Error('Player not found');
      gameManager.handleDoctorProtect(roomCode, player.id, targetId);
      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message || 'Failed to protect target' });
      } else {
        socket.emit('error-message', { message: err.message });
      }
    }
  });

  // proceed-to-vote
  socket.on('proceed-to-vote', ({ roomCode }, callback) => {
    try {
      const player = gameManager.getPlayerBySocketId(socket.id);
      if (!player) throw new Error('Player not found');
      gameManager.proceedToVote(roomCode, player.id);
      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message || 'Failed to proceed to vote' });
      } else {
        socket.emit('error-message', { message: err.message });
      }
    }
  });

  // cast-vote
  socket.on('cast-vote', ({ roomCode, targetId }, callback) => {
    try {
      const player = gameManager.getPlayerBySocketId(socket.id);
      if (!player) throw new Error('Player not found');
      gameManager.handleCastVote(roomCode, player.id, targetId);
      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message || 'Failed to cast vote' });
      } else {
        socket.emit('error-message', { message: err.message });
      }
    }
  });

  // new-game
  socket.on('new-game', ({ roomCode }, callback) => {
    try {
      gameManager.newGame(roomCode);
      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err: any) {
      if (typeof callback === 'function') {
        callback({ success: false, error: err.message || 'Failed to start new game' });
      } else {
        socket.emit('error-message', { message: err.message });
      }
    }
  });
}
