import React, { useState, useEffect, useRef } from 'react';
import { GameState, Role, DIFFICULTY_CONFIG } from '@meltdown/shared';
import { useGameStore } from '../../stores/game-store.js';
import { Gauge } from '../controls/Gauge.js';
import { ControlSlider } from '../controls/ControlSlider.js';
import { EventQueue } from '../controls/EventQueue.js';
import { CalloutButton } from '../controls/CalloutButton.js';
import { CooldownButton } from '../controls/CooldownButton.js';
import { noisy } from '../controls/noisyValue.js';
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
  const noise = gameState.sensorNoise;
  const [shieldPower, setShieldPower] = useState(r.shieldStrength);
  const lastTickRef = useRef(0);

  useEffect(() => {
    setShieldPower(r.shieldStrength);
  }, [r.shieldStrength]);

  const nRad = noisy(r.radiation, 'radiation', noise, false);
  const nCon = noisy(r.containment, 'containment', noise, false);
  const nPres = noisy(r.pressure, 'pressure', noise, false);

  return (
    <div>
      {noise.active && (
        <div style={{
          background: '#3a1a00', border: '1px solid var(--warning)',
          borderRadius: 4, padding: '4px 10px', marginBottom: 8,
          fontSize: '0.75rem', color: 'var(--warning)',
        }}>
          ⚠ Sensor malfunction — radiation/containment/pressure readings may be inaccurate.
        </div>
      )}

      <div className="gauge-grid">
        <Gauge label="Radiation" value={nRad} max={100} unit="mSv" thresholds={[40, 70]} />
        <Gauge label="Containment" value={nCon} max={100} unit="%" thresholds={[50, 25]} />
        <Gauge label="Shield Power" value={r.shieldStrength} max={100} unit="%" thresholds={[40, 20]} />
        <Gauge label="Pressure" value={nPres} max={100} unit="MPa" thresholds={[60, 80]} decimals={1} />
      </div>

      <div className="control-section">
        <h3>Shield Controls</h3>
        <ControlSlider
          label="Shield Power"
          value={shieldPower}
          onChange={(v) => {
            const sensitivity = DIFFICULTY_CONFIG[gameState.difficulty].sliderSensitivity;
            const delta = v - r.shieldStrength;
            const amplified = Math.max(0, Math.min(100, r.shieldStrength + delta * sensitivity));
            setShieldPower(amplified);
            sendAction({ kind: 'set-shield-power', level: amplified });
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
          <CooldownButton
            className="btn btn-warning"
            cooldownSec={8}
            actionKey="vent-pressure"
            disabled={gameState.emergencyActionsLeft <= 0}
            onClick={() => { playVentHiss(); sendAction({ kind: 'vent-pressure' }); }}
          >
            Vent Pressure
          </CooldownButton>
          <CooldownButton
            className="btn btn-danger"
            cooldownSec={45}
            actionKey="emergency-coolant"
            disabled={gameState.emergencyActionsLeft <= 0}
            onClick={() => { playCoolantRush(); sendAction({ kind: 'emergency-coolant' }); }}
          >
            Emergency Coolant
          </CooldownButton>
          <CooldownButton
            className="scram-button"
            cooldownSec={10}
            actionKey="scram"
            style={{ width: 64, height: 64, fontSize: '0.7rem' }}
            disabled={gameState.emergencyActionsLeft <= 0}
            onClick={() => { playThunk(); sendAction({ kind: 'scram' }); }}
          >
            SCRAM
          </CooldownButton>
        </div>
      </div>

      <div className="control-section">
        <h3>Emergency Protocols</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ProtocolButton
            label="Restore Containment"
            description="+20% containment integrity"
            actionKey="authorize-protocol:containment-restore"
            disabled={gameState.emergencyActionsLeft <= 0}
            onClick={() => { playContainmentRestore(); sendAction({ kind: 'authorize-protocol', protocolId: 'containment-restore' }); }}
          />
          <ProtocolButton
            label="Radiation Flush"
            description="-30 mSv radiation / -10% shields"
            actionKey="authorize-protocol:radiation-flush"
            disabled={gameState.emergencyActionsLeft <= 0}
            onClick={() => { playShieldCharge(); sendAction({ kind: 'authorize-protocol', protocolId: 'radiation-flush' }); }}
          />
          <ProtocolButton
            label="Power Reroute"
            description="+15% reactor stability"
            actionKey="authorize-protocol:power-reroute"
            disabled={gameState.emergencyActionsLeft <= 0}
            onClick={() => { playThunk(); sendAction({ kind: 'authorize-protocol', protocolId: 'power-reroute' }); }}
          />
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

      <div className="control-section">
        <h3>Status Indicators</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <WarningLight label="Radiation" level={nRad > 70 ? 'danger' : nRad > 40 ? 'warning' : 'safe'} />
          <WarningLight label="Containment" level={nCon < 25 ? 'danger' : nCon < 50 ? 'warning' : 'safe'} />
          <WarningLight label="Shields" level={r.shieldStrength < 20 ? 'danger' : r.shieldStrength < 40 ? 'warning' : 'safe'} />
          <WarningLight label="Pressure" level={nPres > 80 ? 'danger' : nPres > 60 ? 'warning' : 'safe'} />
          <WarningLight label="Temperature" level={r.temperature > 800 ? 'danger' : r.temperature > 600 ? 'warning' : 'safe'} />
        </div>
      </div>

      <div className="control-section">
        <CalloutButton role={Role.SafetyOfficer} />
      </div>
    </div>
  );
}

function ProtocolButton({
  label, description, actionKey, disabled, onClick,
}: { label: string; description: string; actionKey: string; disabled?: boolean; onClick: () => void }) {
  return (
    <CooldownButton
      className="btn"
      style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2 }}
      cooldownSec={30}
      actionKey={actionKey}
      disabled={disabled}
      onClick={onClick}
    >
      <span>{label}</span>
      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 'normal' }}>
        {description}
      </span>
    </CooldownButton>
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
