import React, { useState, useEffect, useRef } from 'react';
import { GameState, Role } from '@meltdown/shared';
import { useGameStore } from '../../stores/game-store.js';
import { Gauge } from '../controls/Gauge.js';
import { ControlSlider } from '../controls/ControlSlider.js';
import { EventQueue } from '../controls/EventQueue.js';
import { playClick, playCoolantRush, playRepair, playExtinguish, playSliderTick } from '../../audio/sound-manager.js';

interface Props {
  gameState: GameState;
}

export function EngineerPanel({ gameState }: Props) {
  const sendAction = useGameStore(s => s.sendAction);
  const r = gameState.reactor;
  const [coolantFlow, setCoolantFlow] = useState(r.coolantFlow);

  const lastTickRef = useRef(0);

  useEffect(() => {
    setCoolantFlow(r.coolantFlow);
  }, [r.coolantFlow]);

  return (
    <div>
      <div className="gauge-grid">
        <Gauge label="Coolant Level" value={r.coolantLevel} unit="%" thresholds={[40, 20]} />
        <Gauge label="Coolant Flow" value={r.coolantFlow} unit="%" />
        <Gauge label="Core Temp" value={r.temperature} max={1000} unit="K" thresholds={[600, 800]} />
      </div>

      <div className="control-section">
        <h3>Coolant Controls</h3>
        <ControlSlider
          label="Coolant Flow"
          value={coolantFlow}
          onChange={(v) => {
            setCoolantFlow(v);
            sendAction({ kind: 'set-coolant-flow', level: v });
            const now = Date.now();
            if (now - lastTickRef.current > 80) {
              playSliderTick();
              lastTickRef.current = now;
            }
          }}
        />
        <div className="control-row">
          <button
            className="btn"
            onClick={() => { playCoolantRush(); sendAction({ kind: 'refill-coolant' }); }}
          >
            Refill Coolant
          </button>
        </div>
      </div>

      <div className="control-section">
        <h3>Subsystems</h3>
        <div className="subsystem-grid">
          {gameState.subsystems.map(sub => {
            const healthColor = sub.health > 60 ? 'var(--safe)'
              : sub.health > 30 ? 'var(--warning)'
              : 'var(--danger)';

            let statusClass = 'operational';
            let statusText = 'ONLINE';
            if (sub.onFire) { statusClass = 'fire'; statusText = 'FIRE'; }
            else if (!sub.operational) { statusClass = 'offline'; statusText = 'OFFLINE'; }
            else if (sub.health < 60) { statusClass = 'damaged'; statusText = 'DAMAGED'; }

            return (
              <div key={sub.id} className="subsystem-card">
                <div className="subsystem-name">{sub.name}</div>
                <div className="subsystem-health-bar">
                  <div
                    className="subsystem-health-fill"
                    style={{ width: `${sub.health}%`, background: healthColor }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={`subsystem-status ${statusClass}`}>{statusText}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {sub.onFire && (
                      <button
                        className="btn btn-small btn-danger"
                        onClick={() => { playExtinguish(); sendAction({ kind: 'toggle-fire-suppression', subsystemId: sub.id }); }}
                      >
                        Extinguish
                      </button>
                    )}
                    {sub.health < 100 && (
                      <button
                        className="btn btn-small"
                        onClick={() => { playRepair(); sendAction({ kind: 'repair-subsystem', subsystemId: sub.id }); }}
                      >
                        Repair
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="control-section">
        <h3>Alerts</h3>
        <EventQueue
          events={gameState.activeEvents}
          gameTime={gameState.gameTime}
          filterRole={Role.Engineer}
        />
      </div>
    </div>
  );
}
