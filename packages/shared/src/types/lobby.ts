import { Role } from './roles.js';

export interface Room {
  id: string;
  name: string;
  players: Map<string, Player>;
  hostId: string;
  maxPlayers: number;
  inGame: boolean;
  createdAt: number;
}

export interface Player {
  id: string;
  name: string;
  selectedRoles: Role[];
  ready: boolean;
  connected: boolean;
  roomId?: string;
}

export enum RoomState {
  Waiting = 'waiting',
  Starting = 'starting',
  InGame = 'in-game',
  Finished = 'finished',
}
