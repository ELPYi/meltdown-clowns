import React, { useState } from 'react';
import { GameState, Role, ROLE_LABELS } from '@meltdown/shared';
import { ReactorOperatorPanel } from './ReactorOperatorPanel.js';
import { EngineerPanel } from './EngineerPanel.js';
import { TechnicianPanel } from './TechnicianPanel.js';
import { SafetyOfficerPanel } from './SafetyOfficerPanel.js';
import { useGameStore } from '../../stores/game-store.js';
import { playBeep } from '../../audio/sound-manager.js';

interface Props {
  roles: Role[];
  gameState: GameState;
}

export function CombinedPanel({ roles, gameState }: Props) {
  const [activeTab, setActiveTab] = useState(0);
  const sendAction = useGameStore(s => s.sendAction);

  const hasTechnicianRole = roles.includes(Role.Technician);
  const noise = gameState.sensorNoise;
  const showNoiseAlert = hasTechnicianRole && noise.active;

  const renderPanel = (role: Role) => {
    switch (role) {
      case Role.ReactorOperator: return <ReactorOperatorPanel gameState={gameState} />;
      case Role.Engineer: return <EngineerPanel gameState={gameState} />;
      case Role.Technician: return <TechnicianPanel gameState={gameState} hideNoiseAlert={showNoiseAlert} />;
      case Role.SafetyOfficer: return <SafetyOfficerPanel gameState={gameState} />;
    }
  };

  // Count unresolved events per role
  const eventCounts = roles.map(role =>
    gameState.activeEvents.filter(
      e => e.targetRole === role && !e.resolved && !e.consequenceApplied
    ).length
  );

  return (
    <div>
      {showNoiseAlert && (
        <div style={{
          background: '#3a1a00', border: '1px solid var(--warning)',
          borderRadius: 4, padding: '6px 10px', marginBottom: 8,
          fontSize: '0.8rem', color: 'var(--warning)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>⚠ SENSOR NOISE ACTIVE — gauges corrupted ({noise.ttl.toFixed(0)}s)</span>
          <button
            className="btn btn-small btn-warning"
            onClick={() => { playBeep(); sendAction({ kind: 'calibrate-sensor', sensorId: 'all' }); }}
          >
            Calibrate
          </button>
        </div>
      )}
      <div className="tab-bar">
        {roles.map((role, i) => {
          const hasNoiseBadge = role === Role.Technician && showNoiseAlert && i !== activeTab;
          return (
          <div
            key={role}
            className={`tab ${i === activeTab ? 'active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {ROLE_LABELS[role]}
            {eventCounts[i] > 0 && (
              <span style={{
                marginLeft: 6,
                background: 'var(--danger)',
                color: 'white',
                borderRadius: '50%',
                width: 18,
                height: 18,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.6rem',
              }}>
                {eventCounts[i]}
              </span>
            )}
            {hasNoiseBadge && (
              <span style={{
                marginLeft: 4,
                color: 'var(--warning)',
                fontSize: '0.7rem',
              }}>⚠</span>
            )}
          </div>
          );
        })}
      </div>
      <div style={{ padding: '12px 0' }}>
        {renderPanel(roles[activeTab])}
      </div>
    </div>
  );
}
