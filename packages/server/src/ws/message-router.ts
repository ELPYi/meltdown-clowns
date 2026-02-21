import { WebSocket } from 'ws';
import { ClientMessage, ServerMessage } from '@meltdown/shared';

export type MessageHandler = (playerId: string, message: ClientMessage) => void;

const connections = new Map<string, WebSocket>();
let messageHandler: MessageHandler | null = null;
let idCounter = 0;

export function registerConnection(ws: WebSocket): string {
  const playerId = `player-${++idCounter}-${Date.now().toString(36)}`;
  connections.set(playerId, ws);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString()) as ClientMessage;
      if (messageHandler) {
        messageHandler(playerId, message);
      }
    } catch {
      sendTo(playerId, { type: 'error', message: 'Invalid message format' });
    }
  });

  ws.on('close', () => {
    connections.delete(playerId);
    if (messageHandler) {
      // Synthesize a disconnect event
      messageHandler(playerId, { type: 'leave-room' } as ClientMessage);
    }
  });

  return playerId;
}

export function setMessageHandler(handler: MessageHandler): void {
  messageHandler = handler;
}

export function sendTo(playerId: string, message: ServerMessage): void {
  const ws = connections.get(playerId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

export function broadcast(playerIds: string[], message: ServerMessage): void {
  const data = JSON.stringify(message);
  for (const id of playerIds) {
    const ws = connections.get(id);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

export function isConnected(playerId: string): boolean {
  const ws = connections.get(playerId);
  return ws !== undefined && ws.readyState === WebSocket.OPEN;
}

export function disconnectPlayer(playerId: string): void {
  const ws = connections.get(playerId);
  if (ws) {
    ws.close();
    connections.delete(playerId);
  }
}
