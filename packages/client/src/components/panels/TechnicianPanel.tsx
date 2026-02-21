import React from 'react';
import { GameState, Role } from '@meltdown/shared';
import { useGameStore } from '../../stores/game-store.js';
import { Gauge } from '../controls/Gauge.js';
import { EventQueue } from '../controls/EventQueue.js';
import { playBeep, playDiagnosticScan } from '../../audio/sound-manager.js';

interface Props {
  gameState: GameState;
}

export function TechnicianPanel({ gameState }: Props) {
  const sendAction = useGameStore(s => s.sendAction);
  const r = gameState.reactor;

  // Sensor bank - shows all reactor metrics
  return (
    <div>
      <div className="gauge-grid">
        <Gauge label="Core Temp" value={r.temperature} max={1000} unit="K" thresholds={[600, 800]} />
        <Gauge label="Pressure" value={r.pressure} max={100} unit="MPa" thresholds={[60, 80]} decimals={1} />
        <Gauge label="Power" value={r.powerOutput} max={100} unit="%" />
        <Gauge label="Coolant" value={r.coolantLevel} max={100} unit="%" thresholds={[40, 20]} />
        <Gauge label="Flow Rate" value={r.coolantFlow} max={100} unit="%" />
        <Gauge label="Radiation" value={r.radiation} max={100} unit="mSv" thresholds={[40, 70]} />
        <Gauge label="Containment" value={r.containment} max={100} unit="%" thresholds={[50, 25]} />
        <Gauge label="Shields" value={r.shieldStrength} max={100} unit="%" thresholds={[40, 20]} />
        <Gauge label="Stability" value={r.stability} max={100} unit="%" thresholds={[50, 25]} />
        <Gauge label="Ctrl Rods" value={r.controlRodPosition} max={100} unit="%" />
      </div>

      <div className="control-section">
        <h3>Diagnostics</h3>
        <div className="control-row">
          <button className="btn" onClick={() => { playDiagnosticScan(); sendAction({ kind: 'run-diagnostic' }); }}>
            Run Full Diagnostic
          </button>
        </div>

        <div className="subsystem-grid">
          {gameState.subsystems.map(sub => (
            <div key={sub.id} className="subsystem-card">
              <div className="subsystem-name">{sub.name}</div>
              <div className="subsystem-health-bar">
                <div
                  className="subsystem-health-fill"
                  style={{
                    width: `${sub.health}%`,
                    background: sub.health > 60 ? 'var(--safe)' : sub.health > 30 ? 'var(--warning)' : 'var(--danger)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="subsystem-status" style={{
                  color: sub.onFire ? 'var(--danger)' : !sub.operational ? 'var(--danger)' : sub.health < 60 ? 'var(--warning)' : 'var(--safe)'
                }}>
                  {sub.onFire ? 'FIRE' : !sub.operational ? 'OFFLINE' : sub.health < 60 ? 'DEGRADED' : 'NOMINAL'}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                  {sub.health.toFixed(0)}%
                </span>
              </div>
              <button
                className="btn btn-small"
                style={{ marginTop: 4, width: '100%' }}
                onClick={() => { playBeep(); sendAction({ kind: 'calibrate-sensor', sensorId: sub.id }); }}
              >
                Calibrate
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="control-section">
        <h3>Sensor Alerts</h3>
        <EventQueue
          events={gameState.activeEvents}
          gameTime={gameState.gameTime}
          filterRole={Role.Technician}
        />
      </div>
    </div>
  );
}
