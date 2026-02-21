import React, { useState, useEffect, useRef } from 'react';
import { GameState, Role } from '@meltdown/shared';
import { useGameStore } from '../../stores/game-store.js';
import { Gauge } from '../controls/Gauge.js';
import { ControlSlider } from '../controls/ControlSlider.js';
import { EventQueue } from '../controls/EventQueue.js';
import {
  playThunk, playVentHiss, playCoolantRush, playContainmentRestore,
  playShieldCharge, playSliderTick,
} from '../../audio/sound-manager.js';

interface Props {
  gameState: GameState;
}

export function SafetyOfficerPanel({ gameState }: Props) {
  const sendAction = useGameStore(s => s.sendAction);
  const r = gameState.reactor;
  const [shieldPower, setShieldPower] = useState(r.shieldStrength);
  const lastTickRef = useRef(0);

  useEffect(() => {
    setShieldPower(r.shieldStrength);
  }, [r.shieldStrength]);

  return (
    <div>
      <div className="gauge-grid">
        <Gauge label="Radiation" value={r.radiation} max={100} unit="mSv" thresholds={[40, 70]} />
        <Gauge label="Containment" value={r.containment} max={100} unit="%" thresholds={[50, 25]} />
        <Gauge label="Shield Power" value={r.shieldStrength} max={100} unit="%" thresholds={[40, 20]} />
        <Gauge label="Pressure" value={r.pressure} max={100} unit="MPa" thresholds={[60, 80]} decimals={1} />
      </div>

      <div className="control-section">
        <h3>Shield Controls</h3>
        <ControlSlider
          label="Shield Power"
          value={shieldPower}
          onChange={(v) => {
            setShieldPower(v);
            sendAction({ kind: 'set-shield-power', level: v });
            const now = Date.now();
            if (now - lastTickRef.current > 80) {
              playSliderTick();
              lastTickRef.current = now;
            }
          }}
        />
      </div>

      <div className="control-section">
        <h3>Emergency Systems</h3>
        <div className="control-row" style={{ flexWrap: 'wrap', gap: 12 }}>
          <button
            className="btn btn-warning"
            onClick={() => { playVentHiss(); sendAction({ kind: 'vent-pressure' }); }}
          >
            Vent Pressure
          </button>
          <button
            className="btn btn-danger"
            onClick={() => { playCoolantRush(); sendAction({ kind: 'emergency-coolant' }); }}
          >
            Emergency Coolant
          </button>
          <button
            className="btn"
            onClick={() => { playContainmentRestore(); sendAction({ kind: 'authorize-protocol', protocolId: 'containment-restore' }); }}
          >
            Restore Containment
          </button>
          <button
            className="scram-button"
            onClick={() => { playThunk(); sendAction({ kind: 'scram' }); }}
            style={{ width: 64, height: 64, fontSize: '0.7rem' }}
          >
            SCRAM
          </button>
        </div>
      </div>

      <div className="control-section">
        <h3>Safety Alerts</h3>
        <EventQueue
          events={gameState.activeEvents}
          gameTime={gameState.gameTime}
          filterRole={Role.SafetyOfficer}
        />
      </div>

      {/* Warning indicators */}
      <div className="control-section">
        <h3>Status Indicators</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <WarningLight label="Radiation" level={r.radiation > 70 ? 'danger' : r.radiation > 40 ? 'warning' : 'safe'} />
          <WarningLight label="Containment" level={r.containment < 25 ? 'danger' : r.containment < 50 ? 'warning' : 'safe'} />
          <WarningLight label="Shields" level={r.shieldStrength < 20 ? 'danger' : r.shieldStrength < 40 ? 'warning' : 'safe'} />
          <WarningLight label="Pressure" level={r.pressure > 80 ? 'danger' : r.pressure > 60 ? 'warning' : 'safe'} />
          <WarningLight label="Temperature" level={r.temperature > 800 ? 'danger' : r.temperature > 600 ? 'warning' : 'safe'} />
        </div>
      </div>
    </div>
  );
}

function WarningLight({ label, level }: { label: string; level: 'safe' | 'warning' | 'danger' | 'off' }) {
  return (
    <div className={`warning-light ${level}`}>
      <div className="indicator" />
      <span>{label}</span>
    </div>
  );
}
