import React, { useState } from 'react';
import { useConnectionStore } from '../stores/connection-store.js';
import { useLobbyStore } from '../stores/lobby-store.js';
import { resumeAudio, playClick } from '../audio/sound-manager.js';

export function LobbyBrowser() {
  const [roomName, setRoomName] = useState('');
  const [playerName, setPlayerName] = useState(useConnectionStore.getState().playerName);
  const rooms = useLobbyStore(s => s.rooms);
  const createRoom = useLobbyStore(s => s.createRoom);
  const joinRoom = useLobbyStore(s => s.joinRoom);
  const setName = useConnectionStore(s => s.setPlayerName);

  const handleCreate = () => {
    resumeAudio();
    playClick();
    if (playerName.trim()) {
      setName(playerName.trim());
    }
    createRoom(roomName || 'Reactor Room');
    setRoomName('');
  };

  const handleJoin = (roomId: string) => {
    resumeAudio();
    playClick();
    if (playerName.trim()) {
      setName(playerName.trim());
    }
    joinRoom(roomId);
  };

  return (
    <div className="lobby-screen">
      <div className="lobby-header">
        <h1>MELTDOWN CLOWNS</h1>
        <p>Cooperative Dyson Sphere Reactor Defense</p>
      </div>

      <div className="lobby-controls">
        <input
          type="text"
          placeholder="Your name..."
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
          maxLength={20}
        />
        <input
          type="text"
          placeholder="Room name..."
          value={roomName}
          onChange={e => setRoomName(e.target.value)}
          maxLength={30}
        />
        <button className="btn" onClick={handleCreate}>
          Create Room
        </button>
      </div>

      <div className="room-list">
        {rooms.length === 0 ? (
          <div className="room-empty">
            <p>No active rooms</p>
            <p style={{ fontSize: '0.75rem', marginTop: 8 }}>Create one to get started</p>
          </div>
        ) : (
          rooms.map(room => (
            <div
              key={room.id}
              className="room-item"
              onClick={() => !room.inGame && handleJoin(room.id)}
              style={{ opacity: room.inGame ? 0.5 : 1 }}
            >
              <div className="room-item-info">
                <h3>{room.name}</h3>
                <span>
                  {room.playerCount}/{room.maxPlayers} players
                  {room.inGame ? ' - IN GAME' : ''}
                </span>
              </div>
              {!room.inGame && (
                <button className="btn btn-small">Join</button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
