import React, { useState } from 'react';
import { Role, ROLE_LABELS } from '@meltdown/shared';
import { useGameStore } from '../../stores/game-store.js';
import { playClick } from '../../audio/sound-manager.js';

const CALLOUTS: Record<Role, string[]> = {
  [Role.ReactorOperator]: [
    'TEMPERATURE CRITICAL',
    'POWER SURGE DETECTED',
    'RODS INSERTED — SCRAM',
    'NEED ENGINEER: COOLANT',
    'ALL CLEAR',
  ],
  [Role.Engineer]: [
    'COOLANT CRITICALLY LOW',
    'SUBSYSTEM ON FIRE',
    'COOLANT REFILLED',
    'SUBSYSTEM REPAIRED',
    'ALL CLEAR',
  ],
  [Role.Technician]: [
    'SENSORS COMPROMISED',
    'SENSORS CALIBRATED',
    'SUBSYSTEM FAILING SOON',
    'NEED SAFETY OFFICER',
    'ALL CLEAR',
  ],
  [Role.SafetyOfficer]: [
    'CONTAINMENT CRITICAL',
    'RADIATION HIGH',
    'PRESSURE VENTED',
    'SHIELDS FAILING',
    'ALL CLEAR',
  ],
};

interface Props {
  role: Role;
}

export function CalloutButton({ role }: Props) {
  const sendAction = useGameStore(s => s.sendAction);
  const [open, setOpen] = useState(false);

  const options = CALLOUTS[role] ?? [];

  const send = (text: string) => {
    playClick();
    sendAction({ kind: 'callout', text });
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        className="btn"
        style={{ width: '100%', background: 'var(--bg-raised)', color: 'var(--warning)' }}
        onClick={() => setOpen(o => !o)}
      >
        📢 CALLOUT
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, right: 0, zIndex: 20,
          background: 'var(--bg-panel)', border: '1px solid var(--warning)',
          borderRadius: 4, overflow: 'hidden',
        }}>
          {options.map(opt => (
            <button
              key={opt}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: 'none', border: 'none', borderBottom: '1px solid var(--border)',
                color: 'var(--text)', padding: '6px 10px', cursor: 'pointer',
                fontSize: '0.78rem',
              }}
              onClick={() => send(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
