import React, { useEffect } from 'react';
import { useGameStore } from '../stores/game-store.js';
import { Role, ROLE_LABELS, PHASE_NAMES, GamePhase, DIFFICULTY_CONFIG, LOW_POWER_GRACE_S } from '@meltdown/shared';
import { ReactorDisplay } from '../components/reactor-display/ReactorDisplay.js';
import { ReactorOperatorPanel } from '../components/panels/ReactorOperatorPanel.js';
import { EngineerPanel } from '../components/panels/EngineerPanel.js';
import { TechnicianPanel } from '../components/panels/TechnicianPanel.js';
import { SafetyOfficerPanel } from '../components/panels/SafetyOfficerPanel.js';
import { CombinedPanel } from '../components/panels/CombinedPanel.js';
import { useGameAudio } from '../audio/useGameAudio.js';

const PHASE_ALERT_DURATION_MS = 4000;

const PHASE_COLORS: Record<GamePhase, string> = {
  [GamePhase.StableOperations]: 'var(--safe)',
  [GamePhase.AnomaliesDetected]: 'var(--warning)',
  [GamePhase.CascadeWarning]: '#ff8c00',
  [GamePhase.CriticalMeltdown]: 'var(--danger)',
  [GamePhase.FinalCountdown]: 'var(--danger)',
};

export function GameScreen() {
  const gameState = useGameStore(s => s.gameState);
  const assignedRoles = useGameStore(s => s.assignedRoles);
  const gameOver = useGameStore(s => s.gameOver);
  const won = useGameStore(s => s.won);
  const phaseAlert = useGameStore(s => s.phaseAlert);
  const clearPhaseAlert = useGameStore(s => s.clearPhaseAlert);
  const callouts = useGameStore(s => s.callouts);
  const disconnectedRoles = useGameStore(s => s.disconnectedRoles);

  useGameAudio(gameState, gameOver, won);

  // Auto-dismiss phase alert
  useEffect(() => {
    if (!phaseAlert) return;
    const t = setTimeout(clearPhaseAlert, PHASE_ALERT_DURATION_MS);
    return () => clearTimeout(t);
  }, [phaseAlert, clearPhaseAlert]);

  if (!gameState) {
    return (
      <div className="game-screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
        <p>Initializing reactor systems...</p>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const timeRemaining = 600 - gameState.gameTime;

  return (
    <div className="game-screen">
      {/* Phase transition alert */}
      {phaseAlert && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          background: PHASE_COLORS[phaseAlert.phase],
          color: '#000', textAlign: 'center', padding: '12px 0',
          fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: 2,
          animation: 'blink 0.4s step-start 3',
        }}>
          ⚠ PHASE TRANSITION: {phaseAlert.phaseName.toUpperCase()}
        </div>
      )}

      {/* Low power warning */}
      {gameState.lowPowerTimer > 0 && (
        <div style={{
          background: gameState.lowPowerTimer > LOW_POWER_GRACE_S ? '#5a0000' : '#3a1a00',
          color: gameState.lowPowerTimer > LOW_POWER_GRACE_S ? 'var(--danger)' : 'var(--warning)',
          padding: '4px 12px', fontSize: '0.78rem', textAlign: 'center',
          borderBottom: `1px solid ${gameState.lowPowerTimer > LOW_POWER_GRACE_S ? 'var(--danger)' : 'var(--warning)'}`,
          fontWeight: 'bold', animation: gameState.lowPowerTimer > LOW_POWER_GRACE_S ? 'blink 0.6s step-start infinite' : 'none',
        }}>
          ⚡ LOW POWER — {gameState.reactor.powerOutput.toFixed(0)}% output
          {gameState.lowPowerTimer <= LOW_POWER_GRACE_S
            ? ` — restore above 25% within ${Math.ceil(LOW_POWER_GRACE_S - gameState.lowPowerTimer)}s`
            : ` — PENALTY ACTIVE — game over in ${Math.ceil(30 - gameState.lowPowerTimer)}s`}
        </div>
      )}

      {/* Disconnected player banner */}
      {disconnectedRoles.length > 0 && (
        <div style={{
          background: '#5a1a00', color: 'var(--warning)', padding: '4px 12px',
          fontSize: '0.75rem', textAlign: 'center', borderBottom: '1px solid var(--warning)',
        }}>
          PLAYER DISCONNECTED — roles offline: {disconnectedRoles.map(r => ROLE_LABELS[r]).join(', ')}
          {gameState.disconnectedRoles.length > 0 && ' (AI assist active)'}
        </div>
      )}

      {/* Status Bar */}
      <div className="status-bar">
        <span className="phase-name">{PHASE_NAMES[gameState.phase]}</span>
        <span className="timer">{formatTime(Math.max(0, timeRemaining))}</span>
        <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>
          {assignedRoles.map(r => ROLE_LABELS[r]).join(' + ')}
        </span>
        <span style={{ fontSize: '0.7rem', color: gameState.emergencyActionsLeft === 0 ? 'var(--danger)' : 'var(--text-dim)' }}>
          ⚠ Emergency: {gameState.emergencyActionsLeft}/{DIFFICULTY_CONFIG[gameState.difficulty].emergencyPool}
        </span>
      </div>

      {/* Callout feed — last 5 messages, fades after 8s */}
      {callouts.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 8, left: 8, zIndex: 50,
          display: 'flex', flexDirection: 'column', gap: 4, pointerEvents: 'none',
        }}>
          {callouts.map(c => (
            <CalloutToast key={c.id} callout={c} />
          ))}
        </div>
      )}

      {/* Reactor Visualization */}
      <div className="reactor-status scanlines">
        <ReactorDisplay reactor={gameState.reactor} phase={gameState.phase} />
      </div>

      {/* Role Panels */}
      <div className="role-panel-area">
        {assignedRoles.length > 1 ? (
          <CombinedPanel roles={assignedRoles} gameState={gameState} />
        ) : assignedRoles.length === 1 ? (
          <SingleRolePanel role={assignedRoles[0]} gameState={gameState} />
        ) : (
          <p>No role assigned</p>
        )}
      </div>
    </div>
  );
}

function CalloutToast({ callout }: { callout: { fromRole: Role; text: string } }) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.85)', border: '1px solid var(--warning)',
      borderRadius: 4, padding: '4px 10px', fontSize: '0.78rem', color: 'var(--warning)',
      maxWidth: 260,
    }}>
      <span style={{ color: 'var(--text-dim)', marginRight: 6 }}>
        [{ROLE_LABELS[callout.fromRole]}]
      </span>
      {callout.text}
    </div>
  );
}

function SingleRolePanel({ role, gameState }: { role: Role; gameState: any }) {
  switch (role) {
    case Role.ReactorOperator:
      return <ReactorOperatorPanel gameState={gameState} />;
    case Role.Engineer:
      return <EngineerPanel gameState={gameState} />;
    case Role.Technician:
      return <TechnicianPanel gameState={gameState} />;
    case Role.SafetyOfficer:
      return <SafetyOfficerPanel gameState={gameState} />;
    default:
      return <p>Unknown role</p>;
  }
}
