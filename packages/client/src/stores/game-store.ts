import { create } from 'zustand';
import { GameState, GameAction, GameStats, Role } from '@meltdown/shared';
import { send } from '../network/ws-client.js';

interface GameStoreState {
  inGame: boolean;
  gameOver: boolean;
  won: boolean;
  gameOverReason: string;
  sessionId: string | null;
  assignedRoles: Role[];
  gameState: GameState | null;
  stats: GameStats | null;
  startGame: (roles: Role[], sessionId: string) => void;
  updateState: (state: GameState) => void;
  endGame: (won: boolean, reason: string, stats: GameStats) => void;
  sendAction: (action: GameAction) => void;
  returnToLobby: () => void;
}

export const useGameStore = create<GameStoreState>((set) => ({
  inGame: false,
  gameOver: false,
  won: false,
  gameOverReason: '',
  sessionId: null,
  assignedRoles: [],
  gameState: null,
  stats: null,

  startGame: (roles, sessionId) => set({
    inGame: true,
    gameOver: false,
    won: false,
    gameOverReason: '',
    sessionId,
    assignedRoles: roles,
    gameState: null,
    stats: null,
  }),

  updateState: (state) => set({ gameState: state }),

  endGame: (won, reason, stats) => set({
    gameOver: true,
    won,
    gameOverReason: reason,
    stats,
  }),

  sendAction: (action) => {
    send({ type: 'game-action', action });
  },

  returnToLobby: () => set({
    inGame: false,
    gameOver: false,
    won: false,
    gameOverReason: '',
    sessionId: null,
    assignedRoles: [],
    gameState: null,
    stats: null,
  }),
}));
