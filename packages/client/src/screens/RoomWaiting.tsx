import React from 'react';
import { useLobbyStore } from '../stores/lobby-store.js';
import { ALL_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, Role } from '@meltdown/shared';
import { playClick, playSwitch, playThunk } from '../audio/sound-manager.js';

export function RoomWaiting() {
  const room = useLobbyStore(s => s.currentRoom);
  const leaveRoom = useLobbyStore(s => s.leaveRoom);
  const selectRole = useLobbyStore(s => s.selectRole);
  const startGame = useLobbyStore(s => s.startGame);

  if (!room) return null;

  const canStart = room.players.length >= 2;

  return (
    <div className="room-screen">
      <div className="room-header">
        <h2>{room.name}</h2>
        <button className="btn btn-small btn-danger" onClick={() => { playClick(); leaveRoom(); }}>
          Leave
        </button>
      </div>

      <div className="control-section">
        <h3>Players ({room.players.length}/{room.maxPlayers})</h3>
        <div className="player-list">
          {room.players.map(player => (
            <div key={player.id} className="player-card">
              <div>
                <span className="player-name">{player.name}</span>
                {player.id === room.hostId && (
                  <span className="host-badge">[HOST]</span>
                )}
                {!player.connected && (
                  <span style={{ color: 'var(--danger)', marginLeft: 8, fontSize: '0.75rem' }}>
                    DISCONNECTED
                  </span>
                )}
              </div>
              <span className="player-roles">
                {player.selectedRoles.length > 0
                  ? player.selectedRoles.map(r => ROLE_LABELS[r]).join(', ')
                  : 'No role selected'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="control-section">
        <h3>Select Your Role</h3>
        <div className="role-selection">
          {ALL_ROLES.map(role => (
            <div
              key={role}
              className={`role-card ${isRoleSelected(room.players, role) ? 'selected' : ''}`}
              onClick={() => { playSwitch(); selectRole(role); }}
            >
              <h4>{ROLE_LABELS[role]}</h4>
              <p>{ROLE_DESCRIPTIONS[role]}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="room-actions">
        <button
          className="btn"
          onClick={() => { playThunk(); startGame(); }}
          disabled={!canStart}
        >
          {canStart ? 'Start Reactor' : `Need ${2 - room.players.length} more players`}
        </button>
      </div>
    </div>
  );
}

function isRoleSelected(players: Array<{ selectedRoles: Role[] }>, role: Role): boolean {
  return players.some(p => p.selectedRoles.includes(role));
}
