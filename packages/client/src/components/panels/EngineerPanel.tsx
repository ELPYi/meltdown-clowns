import React, { useState, useEffect, useRef } from 'react';
import { GameState, Role } from '@meltdown/shared';
import { useGameStore } from '../../stores/game-store.js';
import { Gauge } from '../controls/Gauge.js';
import { ControlSlider } from '../controls/ControlSlider.js';
import { EventQueue } from '../controls/EventQueue.js';
import { CalloutButton } from '../controls/CalloutButton.js';
import { CooldownButton } from '../controls/CooldownButton.js';
import { noisy } from '../controls/noisyValue.js';
import { useCooldown } from '../../hooks/useCooldown.js';
import { DIFFICULTY_CONFIG } from '@meltdown/shared';
import { playClick, playCoolantRush, playRepair, playExtinguish, playSliderTick } from '../../audio/sound-manager.js';

const cdOverlay: React.CSSProperties = {
  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
  justifyContent: 'center', background: 'rgba(0,0,0,0.5)',
  fontSize: '1.1rem', fontWeight: 'bold', color: '#fff',
  pointerEvents: 'none', borderRadius: 'inherit',
};

interface Props {
  gameState: GameState;
}

export function EngineerPanel({ gameState }: Props) {
  const sendAction = useGameStore(s => s.sendAction);
  const r = gameState.reactor;
  const noise = gameState.sensorNoise;
  const [coolantFlow, setCoolantFlow] = useState(r.coolantFlow);
  const repairCooldown = useCooldown(8, 'repair-subsystem');
  const extinguishCooldown = useCooldown(5, 'toggle-fire-suppression');

  const lastTickRef = useRef(0);

  useEffect(() => {
    setCoolantFlow(r.coolantFlow);
  }, [r.coolantFlow]);

  return (
    <div>
      {noise.active && (
        <div style={{
          background: '#3a1a00', border: '1px solid var(--warning)',
          borderRadius: 4, padding: '4px 10px', marginBottom: 8,
          fontSize: '0.75rem', color: 'var(--warning)',
        }}>
          ⚠ Sensor malfunction — coolant readings may be inaccurate. Notify Technician.
        </div>
      )}

      <div className="gauge-grid">
        <Gauge label="Coolant Level" value={noisy(r.coolantLevel, 'coolantLevel', noise, false)} unit="%" thresholds={[40, 20]} />
        <Gauge label="Coolant Flow" value={r.coolantFlow} unit="%" />
        <Gauge label="Core Temp" value={noisy(r.temperature, 'temperature', noise, false)} max={1000} unit="K" thresholds={[600, 800]} />
      </div>

      <div className="control-section">
        <h3>Coolant Controls</h3>
        <ControlSlider
          label="Coolant Flow"
          value={coolantFlow}
          onChange={(v) => {
            const sensitivity = DIFFICULTY_CONFIG[gameState.difficulty].sliderSensitivity;
            const delta = v - r.coolantFlow;
            const amplified = Math.max(0, Math.min(100, r.coolantFlow + delta * sensitivity));
            setCoolantFlow(amplified);
            sendAction({ kind: 'set-coolant-flow', level: amplified });
            const now = Date.now();
            if (now - lastTickRef.current > 80) {
              playSliderTick();
              lastTickRef.current = now;
            }
          }}
        />
        <div className="control-row">
          <CooldownButton
            className="btn"
            cooldownSec={15}
            actionKey="refill-coolant"
            onClick={() => { playCoolantRush(); sendAction({ kind: 'refill-coolant' }); }}
          >
            Refill Coolant
          </CooldownButton>
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

            const needsRepair = sub.health < 80 || sub.onFire;

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
                        disabled={extinguishCooldown.isOnCooldown}
                        style={{ position: 'relative', opacity: extinguishCooldown.isOnCooldown ? 0.5 : 1 }}
                        onClick={() => { extinguishCooldown.trigger(); playExtinguish(); sendAction({ kind: 'toggle-fire-suppression', subsystemId: sub.id }); }}
                      >
                        Extinguish
                        {extinguishCooldown.isOnCooldown && <span style={cdOverlay}>{extinguishCooldown.remaining}s</span>}
                      </button>
                    )}
                    {needsRepair && (
                      <button
                        className="btn btn-small"
                        disabled={repairCooldown.isOnCooldown}
                        style={{ position: 'relative', opacity: repairCooldown.isOnCooldown ? 0.5 : 1 }}
                        onClick={() => { repairCooldown.trigger(); playRepair(); sendAction({ kind: 'repair-subsystem', subsystemId: sub.id }); }}
                      >
                        Repair
                        {repairCooldown.isOnCooldown && <span style={cdOverlay}>{repairCooldown.remaining}s</span>}
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

      <div className="control-section">
        <CalloutButton role={Role.Engineer} />
      </div>
    </div>
  );
}
