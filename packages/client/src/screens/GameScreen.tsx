import React, { useState } from 'react';
import { useGameStore } from '../stores/game-store.js';
import { Role, ROLE_LABELS, PHASE_NAMES, GamePhase } from '@meltdown/shared';
import { ReactorDisplay } from '../components/reactor-display/ReactorDisplay.js';
import { ReactorOperatorPanel } from '../components/panels/ReactorOperatorPanel.js';
import { EngineerPanel } from '../components/panels/EngineerPanel.js';
import { TechnicianPanel } from '../components/panels/TechnicianPanel.js';
import { SafetyOfficerPanel } from '../components/panels/SafetyOfficerPanel.js';
import { CombinedPanel } from '../components/panels/CombinedPanel.js';
import { useGameAudio } from '../audio/useGameAudio.js';

export function GameScreen() {
  const gameState = useGameStore(s => s.gameState);
  const assignedRoles = useGameStore(s => s.assignedRoles);
  const gameOver = useGameStore(s => s.gameOver);
  const won = useGameStore(s => s.won);

  // Drive all reactive audio (ambient, alarms, phase transitions, game over)
  useGameAudio(gameState, gameOver, won);

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
      {/* Status Bar */}
      <div className="status-bar">
        <span className="phase-name">{PHASE_NAMES[gameState.phase]}</span>
        <span className="timer">{formatTime(Math.max(0, timeRemaining))}</span>
        <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>
          {assignedRoles.map(r => ROLE_LABELS[r]).join(' + ')}
        </span>
      </div>

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
