import React, { useState, useEffect, useRef } from 'react';
import { GameState, Role, DIFFICULTY_CONFIG } from '@meltdown/shared';
import { useGameStore } from '../../stores/game-store.js';
import { Gauge } from '../controls/Gauge.js';
import { ControlSlider } from '../controls/ControlSlider.js';
import { EventQueue } from '../controls/EventQueue.js';
import { CalloutButton } from '../controls/CalloutButton.js';
import { CooldownButton } from '../controls/CooldownButton.js';
import { noisy } from '../controls/noisyValue.js';
import { playThunk, playSliderTick } from '../../audio/sound-manager.js';

interface Props {
  gameState: GameState;
}

export function ReactorOperatorPanel({ gameState }: Props) {
  const sendAction = useGameStore(s => s.sendAction);
  const r = gameState.reactor;
  const noise = gameState.sensorNoise;
  const [rodPos, setRodPos] = useState(r.controlRodPosition);

  useEffect(() => {
    setRodPos(r.controlRodPosition);
  }, [r.controlRodPosition]);

  const lastTickRef = useRef(0);
  const handleRodChange = (value: number) => {
    const sensitivity = DIFFICULTY_CONFIG[gameState.difficulty].sliderSensitivity;
    const delta = value - r.controlRodPosition;
    const amplified = Math.max(0, Math.min(100, r.controlRodPosition + delta * sensitivity));
    setRodPos(amplified);
    sendAction({ kind: 'set-control-rods', position: amplified });
    const now = Date.now();
    if (now - lastTickRef.current > 80) {
      playSliderTick();
      lastTickRef.current = now;
    }
  };

  return (
    <div>
      {noise.active && (
        <div style={{
          background: '#3a1a00', border: '1px solid var(--warning)',
          borderRadius: 4, padding: '4px 10px', marginBottom: 8,
          fontSize: '0.75rem', color: 'var(--warning)',
        }}>
          ⚠ Sensor malfunction — readings may be inaccurate. Notify Technician.
        </div>
      )}

      <div className="gauge-grid">
        <Gauge label="Core Temp" value={noisy(r.temperature, 'temperature', noise, false)} max={1000} unit="K" thresholds={[600, 800]} decimals={0} />
        <Gauge label="Pressure" value={noisy(r.pressure, 'pressure', noise, false)} max={100} unit="MPa" thresholds={[60, 80]} decimals={1} />
        <Gauge label="Power Output" value={r.powerOutput} max={100} unit="%" decimals={0} />
        <Gauge label="Stability" value={r.stability} max={100} unit="%" thresholds={[50, 25]} decimals={0} />
      </div>

      <div className="control-section">
        <h3>Reactor Controls</h3>

        <ControlSlider
          label="Control Rods"
          value={rodPos}
          onChange={handleRodChange}
        />

        <div className="control-row" style={{ justifyContent: 'center', marginTop: 16 }}>
          <CooldownButton
            className="scram-button"
            cooldownSec={10}
            actionKey="scram"
            disabled={gameState.emergencyActionsLeft <= 0}
            onClick={() => { playThunk(); sendAction({ kind: 'scram' }); }}
          >
            SCRAM
          </CooldownButton>
        </div>
      </div>

      <div className="control-section">
        <h3>Alerts</h3>
        <EventQueue
          events={gameState.activeEvents}
          gameTime={gameState.gameTime}
          filterRole={Role.ReactorOperator}
        />
      </div>

      <div className="control-section">
        <CalloutButton role={Role.ReactorOperator} />
      </div>
    </div>
  );
}
