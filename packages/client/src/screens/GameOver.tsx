import React from 'react';
import { useGameStore } from '../stores/game-store.js';
import { PHASE_NAMES, GamePhase, DIFFICULTY_CONFIG } from '@meltdown/shared';
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

  const score = stats?.score;
  const diffLabel = score ? DIFFICULTY_CONFIG[score.difficulty].label : '';

  return (
    <div className="gameover-screen">
      <h1 className={won ? 'victory' : 'defeat'}>
        {won ? 'REACTOR STABILIZED' : 'MELTDOWN'}
      </h1>

      <p className="gameover-reason">{reason}</p>

      {stats && (
        <>
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
              <div className="stat-label">Difficulty</div>
              <div className="stat-value">{diffLabel}</div>
            </div>
          </div>

          {score && (
            <div style={{ width: '100%', maxWidth: 480, margin: '20px auto 0' }}>
              <h3 style={{ textAlign: 'center', marginBottom: 12, letterSpacing: 2 }}>SCORE BREAKDOWN</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <ScoreRow label="Events resolved" value={score.eventsScore} />
                <ScoreRow label="Players" value={score.playerScore} />
                <ScoreRow label="Avg power output" value={score.powerScore} />
                <ScoreRow label="Survival time" value={score.timeScore} />
                {score.survivalBonus > 0 && (
                  <ScoreRow label="Full 10-min bonus" value={score.survivalBonus} highlight />
                )}
                {score.emergencyPenalty > 0 && (
                  <ScoreRow label="Emergency actions" value={-score.emergencyPenalty} penalty />
                )}
                {score.lowPowerPenalty > 0 && (
                  <ScoreRow label="Low power penalty" value={-score.lowPowerPenalty} penalty />
                )}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 4 }}>
                  <ScoreRow label={`Subtotal × ${score.multiplier}× (${diffLabel})`} value={score.subtotal} />
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'var(--bg-raised)', borderRadius: 4, padding: '8px 12px',
                  marginTop: 4,
                }}>
                  <span style={{ fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: 1 }}>FINAL SCORE</span>
                  <span style={{ fontWeight: 'bold', fontSize: '1.4rem', color: won ? 'var(--safe)' : 'var(--warning)' }}>
                    {score.total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <button className="btn" style={{ marginTop: 24 }} onClick={() => { playClick(); returnToLobby(); }}>
        Return to Lobby
      </button>
    </div>
  );
}

function ScoreRow({ label, value, highlight, penalty }: {
  label: string; value: number; highlight?: boolean; penalty?: boolean;
}) {
  const color = penalty ? 'var(--danger)' : highlight ? 'var(--safe)' : 'var(--text)';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 4px', fontSize: '0.88rem' }}>
      <span style={{ color: 'var(--text-dim)' }}>{label}</span>
      <span style={{ color, fontWeight: highlight || penalty ? 'bold' : 'normal' }}>
        {value >= 0 ? '+' : ''}{value.toLocaleString()}
      </span>
    </div>
  );
}
