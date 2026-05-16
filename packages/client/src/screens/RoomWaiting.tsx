import React from 'react';
import { useLobbyStore } from '../stores/lobby-store.js';
import { useConnectionStore } from '../stores/connection-store.js';
import { ALL_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, Role, Difficulty, DIFFICULTY_CONFIG } from '@meltdown/shared';
import { playClick, playSwitch, playThunk } from '../audio/sound-manager.js';

const DIFFICULTIES = [Difficulty.Easy, Difficulty.Normal, Difficulty.Hard, Difficulty.Impossible];

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  [Difficulty.Easy]: 'var(--safe)',
  [Difficulty.Normal]: 'var(--warning)',
  [Difficulty.Hard]: '#ff6600',
  [Difficulty.Impossible]: 'var(--danger)',
};

export function RoomWaiting() {
  const room = useLobbyStore(s => s.currentRoom);
  const leaveRoom = useLobbyStore(s => s.leaveRoom);
  const selectRole = useLobbyStore(s => s.selectRole);
  const setDifficulty = useLobbyStore(s => s.setDifficulty);
  const startGame = useLobbyStore(s => s.startGame);
  const myName = useConnectionStore(s => s.playerName);

  if (!room) return null;

  const canStart = room.players.length >= 2;
  const myPlayer = room.players.find(p => p.name === myName);
  const isHost = myPlayer?.id === room.hostId || room.players[0]?.id === room.hostId;
  const currentDifficulty = room.difficulty ?? Difficulty.Normal;
  const diffConfig = DIFFICULTY_CONFIG[currentDifficulty];

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

      <div className="control-section">
        <h3>Difficulty</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {DIFFICULTIES.map(d => (
            <button
              key={d}
              className="btn btn-small"
              style={{
                borderColor: DIFFICULTY_COLORS[d],
                color: d === currentDifficulty ? '#000' : DIFFICULTY_COLORS[d],
                background: d === currentDifficulty ? DIFFICULTY_COLORS[d] : 'transparent',
                opacity: !isHost && d !== currentDifficulty ? 0.4 : 1,
              }}
              disabled={!isHost}
              onClick={() => { playClick(); setDifficulty(d); }}
            >
              {DIFFICULTY_CONFIG[d].label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.6 }}>
          <span style={{ color: DIFFICULTY_COLORS[currentDifficulty], fontWeight: 'bold' }}>
            {diffConfig.label}
          </span>
          {' · '}Score ×{diffConfig.multiplier}
          {' · '}Emergency pool: {diffConfig.emergencyPool === 0 ? 'None' : diffConfig.emergencyPool}
          {' · '}Failure limit: {diffConfig.failureThreshold === 0 ? 'Any = game over' : `${Math.round(diffConfig.failureThreshold * 100)}%`}
          {!isHost && <span style={{ marginLeft: 8, color: 'var(--text-dim)' }}>(host sets difficulty)</span>}
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
