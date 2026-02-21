import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { DEFAULT_PORT } from '@meltdown/shared';
import { registerConnection, setMessageHandler, sendTo } from './ws/message-router.js';
import {
  setPlayerName,
  createRoom,
  joinRoom,
  leaveRoom,
  selectRole,
  startGame,
  getRoomList,
  handleDisconnect,
  getPlayerRoom,
  endGame,
  getRoomPlayerIds,
} from './lobby/lobby-manager.js';
import { GameSession } from './game/game-session.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);

const app = Fastify({ logger: true });

// Active game sessions by room ID
const gameSessions = new Map<string, GameSession>();

async function main() {
  await app.register(cors, { origin: true });
  await app.register(websocket);

  // Serve static client files in production
  const clientDist = join(__dirname, '../../client/dist');
  try {
    await app.register(fastifyStatic, {
      root: clientDist,
      prefix: '/',
    });
  } catch {
    // Client not built yet, that's fine in dev
  }

  // REST API
  app.get('/api/lobbies', async () => {
    return getRoomList();
  });

  app.post('/api/lobbies', async (request) => {
    const { name } = request.body as { name: string };
    return { name, message: 'Use WebSocket to create rooms' };
  });

  app.get('/api/health', async () => {
    return { status: 'ok', sessions: gameSessions.size };
  });

  // WebSocket endpoint
  app.get('/ws', { websocket: true }, (socket, _req) => {
    const playerId = registerConnection(socket);
    sendTo(playerId, {
      type: 'pong',
      timestamp: Date.now(),
      serverTime: Date.now(),
    });
  });

  // Set up message handler
  setMessageHandler((playerId, message) => {
    switch (message.type) {
      case 'ping':
        sendTo(playerId, {
          type: 'pong',
          timestamp: message.timestamp,
          serverTime: Date.now(),
        });
        break;

      case 'join-lobby':
        setPlayerName(playerId, message.playerName);
        sendTo(playerId, {
          type: 'lobby-list',
          rooms: getRoomList(),
        });
        break;

      case 'create-room': {
        const room = createRoom(playerId, message.roomName);
        if (!room) {
          sendTo(playerId, { type: 'error', message: 'Could not create room' });
        }
        // Room update is sent automatically
        break;
      }

      case 'join-room': {
        const success = joinRoom(playerId, message.roomId);
        if (!success) {
          sendTo(playerId, { type: 'error', message: 'Could not join room' });
        }
        break;
      }

      case 'leave-room': {
        // Check if in a game session
        const room = getPlayerRoom(playerId);
        if (room) {
          const session = gameSessions.get(room.id);
          if (session) {
            session.handleDisconnect(playerId);
          }
        }
        handleDisconnect(playerId);
        leaveRoom(playerId);
        break;
      }

      case 'select-role':
        selectRole(playerId, message.role);
        break;

      case 'start-game': {
        const result = startGame(playerId);
        if (!result.started) {
          sendTo(playerId, { type: 'error', message: result.reason ?? 'Cannot start game' });
          break;
        }
        if (result.room && result.assignments) {
          const playerIds = getRoomPlayerIds(result.room.id);
          const session = new GameSession(
            result.room.id,
            playerIds,
            result.assignments,
            (s) => {
              gameSessions.delete(result.room!.id);
              endGame(result.room!.id);
            }
          );
          gameSessions.set(result.room.id, session);
          session.start();
        }
        break;
      }

      case 'game-action': {
        const room2 = getPlayerRoom(playerId);
        if (room2) {
          const session = gameSessions.get(room2.id);
          if (session) {
            session.handleAction(playerId, message.action);
          }
        }
        break;
      }
    }
  });

  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Meltdown Clowns server running on port ${PORT}`);
}

main().catch(console.error);
