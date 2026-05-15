import { create } from 'zustand';
import { GameState, GameAction, GameStats, Role, GamePhase, DiagnosticResultMessage } from '@meltdown/shared';
import { send } from '../network/ws-client.js';

export interface Callout {
  id: number;
  fromRole: Role;
  text: string;
  at: number; // Date.now()
}

interface GameStoreState {
  inGame: boolean;
  gameOver: boolean;
  won: boolean;
  gameOverReason: string;
  sessionId: string | null;
  assignedRoles: Role[];
  gameState: GameState | null;
  stats: GameStats | null;

  // Transient UI state
  phaseAlert: { phase: GamePhase; phaseName: string } | null;
  callouts: Callout[];
  diagnosticResult: DiagnosticResultMessage | null;
  disconnectedRoles: Role[];

  startGame: (roles: Role[], sessionId: string) => void;
  updateState: (state: GameState) => void;
  endGame: (won: boolean, reason: string, stats: GameStats) => void;
  sendAction: (action: GameAction) => void;
  returnToLobby: () => void;

  setPhaseAlert: (phase: GamePhase, phaseName: string) => void;
  clearPhaseAlert: () => void;
  addCallout: (fromRole: Role, text: string) => void;
  setDiagnosticResult: (result: DiagnosticResultMessage) => void;
  clearDiagnosticResult: () => void;
  setDisconnectedRoles: (roles: Role[]) => void;
}

let calloutIdCounter = 0;

export const useGameStore = create<GameStoreState>((set) => ({
  inGame: false,
  gameOver: false,
  won: false,
  gameOverReason: '',
  sessionId: null,
  assignedRoles: [],
  gameState: null,
  stats: null,
  phaseAlert: null,
  callouts: [],
  diagnosticResult: null,
  disconnectedRoles: [],

  startGame: (roles, sessionId) => set({
    inGame: true,
    gameOver: false,
    won: false,
    gameOverReason: '',
    sessionId,
    assignedRoles: roles,
    gameState: null,
    stats: null,
    phaseAlert: null,
    callouts: [],
    diagnosticResult: null,
    disconnectedRoles: [],
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
    phaseAlert: null,
    callouts: [],
    diagnosticResult: null,
    disconnectedRoles: [],
  }),

  setPhaseAlert: (phase, phaseName) => set({ phaseAlert: { phase, phaseName } }),
  clearPhaseAlert: () => set({ phaseAlert: null }),

  addCallout: (fromRole, text) => set(s => ({
    callouts: [
      ...s.callouts.slice(-4), // keep last 5
      { id: ++calloutIdCounter, fromRole, text, at: Date.now() },
    ],
  })),

  setDiagnosticResult: (result) => set({ diagnosticResult: result }),
  clearDiagnosticResult: () => set({ diagnosticResult: null }),

  setDisconnectedRoles: (roles) => set({ disconnectedRoles: roles }),
}));
