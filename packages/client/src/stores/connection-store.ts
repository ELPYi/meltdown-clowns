import { create } from 'zustand';
import { connect, send, onMessage } from '../network/ws-client.js';
import { useGameStore } from './game-store.js';
import { useLobbyStore } from './lobby-store.js';
import { ServerMessage } from '@meltdown/shared';

interface ConnectionState {
  connected: boolean;
  latency: number;
  playerName: string;
  setPlayerName: (name: string) => void;
  init: () => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  connected: false,
  latency: 0,
  playerName: `Player-${Math.random().toString(36).slice(2, 6)}`,

  setPlayerName: (name: string) => set({ playerName: name }),

  init: () => {
    connect(
      () => {
        set({ connected: true });
        // Join lobby with player name
        send({
          type: 'join-lobby',
          playerName: get().playerName,
        });
      },
      () => set({ connected: false })
    );

    onMessage((message: ServerMessage) => {
      switch (message.type) {
        case 'pong':
          set({ latency: Date.now() - message.timestamp });
          break;
        case 'lobby-list':
          useLobbyStore.getState().setRooms(message.rooms);
          break;
        case 'room-update':
          useLobbyStore.getState().setCurrentRoom(message.room);
          break;
        case 'game-start':
          useGameStore.getState().startGame(message.assignedRoles, message.sessionId);
          break;
        case 'game-state':
          useGameStore.getState().updateState(message.state);
          break;
        case 'game-over':
          useGameStore.getState().endGame(message.won, message.reason, message.stats);
          break;
        case 'error':
          console.error('[Server Error]', message.message);
          break;
      }
    });

    // Ping every 5 seconds
    setInterval(() => {
      if (get().connected) {
        send({ type: 'ping', timestamp: Date.now() });
      }
    }, 5000);
  },
}));

// Auto-initialize on import
useConnectionStore.getState().init();
