import React from 'react';
import { useGameStore } from '../stores/game-store.js';
import { PHASE_NAMES, GamePhase } from '@meltdown/shared';
import { playClick } from '../audio/sound-manager.js';

export function GameOver() {
  const won = useGameStore(s => s.won);
  const reason = useGameStore(s => s.gameOverReason);
  const stats = useGameStore(s => s.stats);
  const returnToLobby = useGameStore(s => s.returnToLobby);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="gameover-screen">
      <h1 className={won ? 'victory' : 'defeat'}>
        {won ? 'REACTOR STABILIZED' : 'MELTDOWN'}
      </h1>

      <p className="gameover-reason">{reason}</p>

      {stats && (
        <div className="gameover-stats">
          <div className="stat-box">
            <div className="stat-label">Survival Time</div>
            <div className="stat-value">{formatTime(stats.survivalTime)}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Events Resolved</div>
            <div className="stat-value">{stats.eventsResolved}/{stats.totalEvents}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Final Phase</div>
            <div className="stat-value">{PHASE_NAMES[stats.finalPhase as GamePhase]}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Resolution Rate</div>
            <div className="stat-value">
              {stats.totalEvents > 0
                ? `${Math.round((stats.eventsResolved / stats.totalEvents) * 100)}%`
                : 'N/A'}
            </div>
          </div>
        </div>
      )}

      <button className="btn" onClick={() => { playClick(); returnToLobby(); }}>
        Return to Lobby
      </button>
    </div>
  );
}
