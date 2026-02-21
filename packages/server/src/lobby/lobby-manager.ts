import {
  Role,
  Player,
  RoomInfo,
  RoomDetail,
  PlayerInfo,
  ROLE_COMBINATIONS,
  MAX_PLAYERS,
  MIN_PLAYERS,
} from '@meltdown/shared';
import { sendTo, broadcast, isConnected } from '../ws/message-router.js';

interface Room {
  id: string;
  name: string;
  players: Map<string, Player>;
  hostId: string;
  maxPlayers: number;
  inGame: boolean;
  createdAt: number;
}

const rooms = new Map<string, Room>();
const playerRooms = new Map<string, string>(); // playerId -> roomId
const playerNames = new Map<string, string>(); // playerId -> name

let roomCounter = 0;

export function getPlayerName(playerId: string): string {
  return playerNames.get(playerId) ?? 'Unknown';
}

export function setPlayerName(playerId: string, name: string): void {
  playerNames.set(playerId, name);
}

export function createRoom(playerId: string, roomName: string): Room | null {
  if (playerRooms.has(playerId)) return null;

  const id = `room-${++roomCounter}`;
  const room: Room = {
    id,
    name: roomName || `Room ${roomCounter}`,
    players: new Map(),
    hostId: playerId,
    maxPlayers: MAX_PLAYERS,
    inGame: false,
    createdAt: Date.now(),
  };

  const player: Player = {
    id: playerId,
    name: playerNames.get(playerId) ?? 'Player',
    selectedRoles: [],
    ready: false,
    connected: true,
  };

  room.players.set(playerId, player);
  rooms.set(id, room);
  playerRooms.set(playerId, id);

  broadcastLobbyList();
  sendRoomUpdate(room);
  return room;
}

export function joinRoom(playerId: string, roomId: string): boolean {
  if (playerRooms.has(playerId)) return false;

  const room = rooms.get(roomId);
  if (!room || room.inGame || room.players.size >= room.maxPlayers) return false;

  const player: Player = {
    id: playerId,
    name: playerNames.get(playerId) ?? 'Player',
    selectedRoles: [],
    ready: false,
    connected: true,
  };

  room.players.set(playerId, player);
  playerRooms.set(playerId, roomId);

  broadcastLobbyList();
  sendRoomUpdate(room);
  return true;
}

export function leaveRoom(playerId: string): void {
  const roomId = playerRooms.get(playerId);
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) return;

  room.players.delete(playerId);
  playerRooms.delete(playerId);

  if (room.players.size === 0) {
    rooms.delete(roomId);
  } else if (room.hostId === playerId) {
    // Transfer host
    room.hostId = room.players.keys().next().value!;
    sendRoomUpdate(room);
  } else {
    sendRoomUpdate(room);
  }

  broadcastLobbyList();
}

export function selectRole(playerId: string, role: Role): void {
  const roomId = playerRooms.get(playerId);
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room || room.inGame) return;

  const player = room.players.get(playerId);
  if (!player) return;

  // Toggle role selection
  const idx = player.selectedRoles.indexOf(role);
  if (idx >= 0) {
    player.selectedRoles.splice(idx, 1);
  } else {
    player.selectedRoles.push(role);
  }

  sendRoomUpdate(room);
}

export function canStartGame(roomId: string): { canStart: boolean; reason?: string } {
  const room = rooms.get(roomId);
  if (!room) return { canStart: false, reason: 'Room not found' };
  if (room.inGame) return { canStart: false, reason: 'Game already in progress' };
  if (room.players.size < MIN_PLAYERS) {
    return { canStart: false, reason: `Need at least ${MIN_PLAYERS} players` };
  }
  return { canStart: true };
}

export function startGame(playerId: string): {
  started: boolean;
  room?: Room;
  assignments?: Map<string, Role[]>;
  reason?: string;
} {
  const roomId = playerRooms.get(playerId);
  if (!roomId) return { started: false, reason: 'Not in a room' };

  const room = rooms.get(roomId);
  if (!room) return { started: false, reason: 'Room not found' };
  if (room.hostId !== playerId) return { started: false, reason: 'Only host can start' };

  const check = canStartGame(roomId);
  if (!check.canStart) return { started: false, reason: check.reason };

  room.inGame = true;

  // Assign roles
  const assignments = assignRoles(room);

  broadcastLobbyList();
  return { started: true, room, assignments };
}

function assignRoles(room: Room): Map<string, Role[]> {
  const playerIds = [...room.players.keys()];
  const playerCount = playerIds.length;
  const assignments = new Map<string, Role[]>();

  // Use predefined combinations or default assignment
  const combos = ROLE_COMBINATIONS[Math.min(playerCount, 4)];

  if (combos && playerCount <= 4) {
    for (let i = 0; i < playerIds.length; i++) {
      assignments.set(playerIds[i], [...combos[i % combos.length]]);
    }
  } else {
    // For 5+ players, distribute roles and some share
    const allRoles = [Role.ReactorOperator, Role.Engineer, Role.Technician, Role.SafetyOfficer];
    for (let i = 0; i < playerIds.length; i++) {
      assignments.set(playerIds[i], [allRoles[i % allRoles.length]]);
    }
  }

  return assignments;
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function getPlayerRoom(playerId: string): Room | undefined {
  const roomId = playerRooms.get(playerId);
  return roomId ? rooms.get(roomId) : undefined;
}

export function getRoomPlayerIds(roomId: string): string[] {
  const room = rooms.get(roomId);
  return room ? [...room.players.keys()] : [];
}

export function endGame(roomId: string): void {
  const room = rooms.get(roomId);
  if (room) {
    room.inGame = false;
    broadcastLobbyList();
    sendRoomUpdate(room);
  }
}

export function handleDisconnect(playerId: string): void {
  const roomId = playerRooms.get(playerId);
  if (roomId) {
    const room = rooms.get(roomId);
    if (room) {
      const player = room.players.get(playerId);
      if (player) {
        player.connected = false;
        if (!room.inGame) {
          leaveRoom(playerId);
        } else {
          sendRoomUpdate(room);
        }
      }
    }
  }
  playerNames.delete(playerId);
}

function sendRoomUpdate(room: Room): void {
  const detail = roomToDetail(room);
  broadcast(
    [...room.players.keys()],
    { type: 'room-update', room: detail }
  );
}

export function broadcastLobbyList(): void {
  const list = getRoomList();
  // Send to all connected players not in rooms (lobby browsers)
  // For simplicity, we'll have the caller handle this
}

export function getRoomList(): RoomInfo[] {
  return [...rooms.values()].map(room => ({
    id: room.id,
    name: room.name,
    playerCount: room.players.size,
    maxPlayers: room.maxPlayers,
    inGame: room.inGame,
  }));
}

function roomToDetail(room: Room): RoomDetail {
  return {
    id: room.id,
    name: room.name,
    players: [...room.players.values()].map(playerToInfo),
    hostId: room.hostId,
    maxPlayers: room.maxPlayers,
    inGame: room.inGame,
  };
}

function playerToInfo(player: Player): PlayerInfo {
  return {
    id: player.id,
    name: player.name,
    selectedRoles: player.selectedRoles,
    ready: player.ready,
    connected: player.connected,
  };
}
