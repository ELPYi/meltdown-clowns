import React, { useState } from 'react';
import { GameState, Role, ROLE_LABELS } from '@meltdown/shared';
import { ReactorOperatorPanel } from './ReactorOperatorPanel.js';
import { EngineerPanel } from './EngineerPanel.js';
import { TechnicianPanel } from './TechnicianPanel.js';
import { SafetyOfficerPanel } from './SafetyOfficerPanel.js';

interface Props {
  roles: Role[];
  gameState: GameState;
}

export function CombinedPanel({ roles, gameState }: Props) {
  const [activeTab, setActiveTab] = useState(0);

  const renderPanel = (role: Role) => {
    switch (role) {
      case Role.ReactorOperator: return <ReactorOperatorPanel gameState={gameState} />;
      case Role.Engineer: return <EngineerPanel gameState={gameState} />;
      case Role.Technician: return <TechnicianPanel gameState={gameState} />;
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
      <div className="tab-bar">
        {roles.map((role, i) => (
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
          </div>
        ))}
      </div>
      <div style={{ padding: '12px 0' }}>
        {renderPanel(roles[activeTab])}
      </div>
    </div>
  );
}
