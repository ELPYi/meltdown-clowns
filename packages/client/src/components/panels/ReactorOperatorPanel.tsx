import React, { useState, useEffect, useRef } from 'react';
import { GameState, Role } from '@meltdown/shared';
import { useGameStore } from '../../stores/game-store.js';
import { Gauge } from '../controls/Gauge.js';
import { ControlSlider } from '../controls/ControlSlider.js';
import { EventQueue } from '../controls/EventQueue.js';
import { playThunk, playSliderTick } from '../../audio/sound-manager.js';

interface Props {
  gameState: GameState;
}

export function ReactorOperatorPanel({ gameState }: Props) {
  const sendAction = useGameStore(s => s.sendAction);
  const r = gameState.reactor;
  const [rodPos, setRodPos] = useState(r.controlRodPosition);

  useEffect(() => {
    setRodPos(r.controlRodPosition);
  }, [r.controlRodPosition]);

  const lastTickRef = useRef(0);
  const handleRodChange = (value: number) => {
    setRodPos(value);
    sendAction({ kind: 'set-control-rods', position: value });
    const now = Date.now();
    if (now - lastTickRef.current > 80) {
      playSliderTick();
      lastTickRef.current = now;
    }
  };

  return (
    <div>
      <div className="gauge-grid">
        <Gauge label="Core Temp" value={r.temperature} max={1000} unit="K" thresholds={[600, 800]} decimals={0} />
        <Gauge label="Pressure" value={r.pressure} max={100} unit="MPa" thresholds={[60, 80]} decimals={1} />
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
          <button
            className="scram-button"
            onClick={() => { playThunk(); sendAction({ kind: 'scram' }); }}
          >
            SCRAM
          </button>
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
    </div>
  );
}
