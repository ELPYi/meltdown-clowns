import { Role } from './roles.js';
import { GameState } from './game-state.js';

// ---- Client -> Server Messages ----

export type ClientMessage =
  | PingMessage
  | JoinLobbyMessage
  | CreateRoomMessage
  | JoinRoomMessage
  | LeaveRoomMessage
  | SelectRoleMessage
  | StartGameMessage
  | GameActionMessage;

export interface PingMessage {
  type: 'ping';
  timestamp: number;
}

export interface JoinLobbyMessage {
  type: 'join-lobby';
  playerName: string;
}

export interface CreateRoomMessage {
  type: 'create-room';
  roomName: string;
}

export interface JoinRoomMessage {
  type: 'join-room';
  roomId: string;
}

export interface LeaveRoomMessage {
  type: 'leave-room';
}

export interface SelectRoleMessage {
  type: 'select-role';
  role: Role;
}

export interface StartGameMessage {
  type: 'start-game';
}

export interface GameActionMessage {
  type: 'game-action';
  action: GameAction;
}

// ---- Game Actions ----

export type GameAction =
  | { kind: 'set-control-rods'; position: number }
  | { kind: 'set-power'; level: number }
  | { kind: 'scram' }
  | { kind: 'repair-subsystem'; subsystemId: string }
  | { kind: 'toggle-fire-suppression'; subsystemId: string }
  | { kind: 'refill-coolant' }
  | { kind: 'calibrate-sensor'; sensorId: string }
  | { kind: 'run-diagnostic' }
  | { kind: 'set-shield-power'; level: number }
  | { kind: 'vent-pressure' }
  | { kind: 'emergency-coolant' }
  | { kind: 'authorize-protocol'; protocolId: string }
  | { kind: 'resolve-event'; eventId: string }
  | { kind: 'set-coolant-flow'; level: number };

// ---- Server -> Client Messages ----

export type ServerMessage =
  | PongMessage
  | LobbyListMessage
  | RoomUpdateMessage
  | GameStartMessage
  | GameStateMessage
  | GameOverMessage
  | ErrorMessage;

export interface PongMessage {
  type: 'pong';
  timestamp: number;
  serverTime: number;
}

export interface LobbyListMessage {
  type: 'lobby-list';
  rooms: RoomInfo[];
}

export interface RoomInfo {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  inGame: boolean;
}

export interface RoomUpdateMessage {
  type: 'room-update';
  room: RoomDetail;
}

export interface RoomDetail {
  id: string;
  name: string;
  players: PlayerInfo[];
  hostId: string;
  maxPlayers: number;
  inGame: boolean;
}

export interface PlayerInfo {
  id: string;
  name: string;
  selectedRoles: Role[];
  ready: boolean;
  connected: boolean;
}

export interface GameStartMessage {
  type: 'game-start';
  assignedRoles: Role[];
  sessionId: string;
}

export interface GameStateMessage {
  type: 'game-state';
  state: GameState;
  isDelta: boolean;
}

export interface GameOverMessage {
  type: 'game-over';
  won: boolean;
  reason: string;
  stats: GameStats;
}

export interface GameStats {
  survivalTime: number;
  eventsResolved: number;
  totalEvents: number;
  finalPhase: number;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
  code?: string;
}
