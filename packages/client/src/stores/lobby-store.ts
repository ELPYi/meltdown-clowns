import { create } from 'zustand';
import { RoomInfo, RoomDetail, Role, Difficulty } from '@meltdown/shared';
import { send } from '../network/ws-client.js';

interface LobbyState {
  rooms: RoomInfo[];
  currentRoom: RoomDetail | null;
  setRooms: (rooms: RoomInfo[]) => void;
  setCurrentRoom: (room: RoomDetail | null) => void;
  createRoom: (name: string) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  selectRole: (role: Role) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  startGame: () => void;
  refreshLobby: () => void;
}

export const useLobbyStore = create<LobbyState>((set) => ({
  rooms: [],
  currentRoom: null,

  setRooms: (rooms) => set({ rooms }),
  setCurrentRoom: (room) => set({ currentRoom: room }),

  createRoom: (name: string) => {
    send({ type: 'create-room', roomName: name });
  },

  joinRoom: (roomId: string) => {
    send({ type: 'join-room', roomId });
  },

  leaveRoom: () => {
    send({ type: 'leave-room' });
    set({ currentRoom: null });
  },

  selectRole: (role: Role) => {
    send({ type: 'select-role', role });
  },

  setDifficulty: (difficulty: Difficulty) => {
    send({ type: 'set-difficulty', difficulty });
  },

  startGame: () => {
    send({ type: 'start-game' });
  },

  refreshLobby: () => {
    // Re-send lobby join to get fresh list
    send({ type: 'join-lobby', playerName: '' });
  },
}));
