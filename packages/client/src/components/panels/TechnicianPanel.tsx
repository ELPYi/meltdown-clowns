import React from 'react';
import { GameState, Role } from '@meltdown/shared';
import { useGameStore } from '../../stores/game-store.js';
import { Gauge } from '../controls/Gauge.js';
import { EventQueue } from '../controls/EventQueue.js';
import { CalloutButton } from '../controls/CalloutButton.js';
import { playBeep, playDiagnosticScan } from '../../audio/sound-manager.js';

interface Props {
  gameState: GameState;
}

export function TechnicianPanel({ gameState }: Props) {
  const sendAction = useGameStore(s => s.sendAction);
  const diagnosticResult = useGameStore(s => s.diagnosticResult);
  const clearDiagnosticResult = useGameStore(s => s.clearDiagnosticResult);
  const r = gameState.reactor;
  const noise = gameState.sensorNoise;

  // Technicians always see real values — they're the ones who fix the noise
  return (
    <div>
      {/* Sensor noise warning */}
      {noise.active && (
        <div style={{
          background: '#3a1a00', border: '1px solid var(--warning)',
          borderRadius: 4, padding: '6px 10px', marginBottom: 8,
          fontSize: '0.8rem', color: 'var(--warning)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>⚠ SENSOR NOISE ACTIVE — other gauges corrupted ({noise.ttl.toFixed(0)}s)</span>
          <button
            className="btn btn-small btn-warning"
            onClick={() => { playBeep(); sendAction({ kind: 'calibrate-sensor', sensorId: 'all' }); }}
          >
            Calibrate
          </button>
        </div>
      )}

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
          <button
            className="btn"
            onClick={() => { playDiagnosticScan(); sendAction({ kind: 'run-diagnostic' }); }}
          >
            Run Full Diagnostic
          </button>
        </div>

        {/* Diagnostic result panel */}
        {diagnosticResult && (
          <div style={{
            marginTop: 8, background: 'var(--bg-panel)', border: '1px solid var(--border)',
            borderRadius: 4, padding: 8, fontSize: '0.78rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <strong style={{ color: 'var(--text-dim)' }}>DIAGNOSTIC REPORT</strong>
              <button className="btn btn-small" onClick={clearDiagnosticResult}>✕</button>
            </div>
            {diagnosticResult.risks.length === 0 ? (
              <div style={{ color: 'var(--safe)' }}>All systems nominal</div>
            ) : (
              diagnosticResult.risks.map((risk, i) => (
                <div key={i} style={{
                  color: risk.status === 'critical' ? 'var(--danger)' : 'var(--warning)',
                  marginBottom: 2,
                }}>
                  {risk.status === 'critical' ? '⛔' : '⚠'} {risk.metric}: {risk.value.toFixed(0)}
                </div>
              ))
            )}
            {diagnosticResult.mostAtRiskSubsystem && (
              <div style={{ marginTop: 6, color: 'var(--warning)', borderTop: '1px solid var(--border)', paddingTop: 4 }}>
                Most at risk: {diagnosticResult.mostAtRiskSubsystem}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="control-section">
        <h3>Subsystem Monitor</h3>
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

      <div className="control-section">
        <CalloutButton role={Role.Technician} />
      </div>
    </div>
  );
}
