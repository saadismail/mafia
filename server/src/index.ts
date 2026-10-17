import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase, closeDatabase } from './db/database';
import { Repository } from './db/repository';
import { GameManager } from './game/GameManager';
import { setupSocketIO } from './socket/socketManager';

dotenv.config();

const PORT = parseInt(process.env.PORT || '4000', 10);
const CLIENT_URL = process.env.CLIENT_URL || '*';

export function createApp(dbPath?: string, gracePeriodMs?: number) {
  const app = express();
  app.use(cors({ origin: CLIENT_URL, credentials: true }));
  app.use(express.json());

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  const db = initDatabase(dbPath);
  const repo = new Repository(db);
  const gameManager = new GameManager(repo, gracePeriodMs);

  setupSocketIO(io, gameManager);

  // Health and info endpoints
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/rooms/:code', (req, res) => {
    const room = gameManager.getRoom(req.params.code);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    return res.json({
      code: room.code,
      phase: room.phase,
      playerCount: room.players.size,
      round: room.round,
    });
  });

  return { app, server, io, gameManager, repo };
}

if (process.env.NODE_ENV !== 'test' && require.main === module) {
  const { server } = createApp();

  server.listen(PORT, () => {
    console.log(`[Mafia Server] listening on port ${PORT}`);
  });

  const shutdown = () => {
    console.log('[Mafia Server] Shutting down gracefully...');
    server.close(() => {
      closeDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
