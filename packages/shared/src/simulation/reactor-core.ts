import { ReactorState, GameState, GamePhase } from '../types/game-state.js';
import { TICK_DELTA, CRITICAL_TEMP, CRITICAL_TEMP_HOLD } from '../util/constants.js';

/**
 * Core reactor physics simulation. Runs every tick (50ms).
 * Models simplified but "feels right" physics.
 */
export function tickReactor(state: GameState): void {
  const r = state.reactor;
  const dt = TICK_DELTA;
  const phaseFactor = 1 + state.phase * 0.15; // Things get harder each phase

  // Power output based on control rod position (inverted: 0 = max power, 100 = shutdown)
  const targetPower = 100 - r.controlRodPosition;
  r.powerOutput += (targetPower - r.powerOutput) * 0.1 * dt * 20;
  r.powerOutput = clamp(r.powerOutput, 0, 100);

  // Temperature rises with power, decreases with coolant
  const heatGeneration = r.powerOutput * 8 * phaseFactor;
  const coolantEfficiency = (r.coolantLevel / 100) * (r.coolantFlow / 100);
  const heatRemoval = coolantEfficiency * 600;
  const ambientCooling = 20;

  r.temperature += (heatGeneration - heatRemoval - ambientCooling) * dt;
  r.temperature = clamp(r.temperature, 20, 1000);

  // Pressure correlates with temperature
  const targetPressure = (r.temperature / 1000) * 100;
  r.pressure += (targetPressure - r.pressure) * 0.3 * dt * 20;
  r.pressure = clamp(r.pressure, 0, 100);

  // Coolant depletes slowly, faster at high temperatures
  const coolantDepletion = (0.5 + (r.temperature / 1000) * 2) * phaseFactor;
  r.coolantLevel -= coolantDepletion * dt;
  r.coolantLevel = clamp(r.coolantLevel, 0, 100);

  // Radiation increases when containment is low or temperature is high
  const containmentLeakage = Math.max(0, (50 - r.containment) / 50);
  const tempRadiation = Math.max(0, (r.temperature - 500) / 500) * 30;
  const targetRadiation = containmentLeakage * 60 + tempRadiation;
  r.radiation += (targetRadiation - r.radiation) * 0.2 * dt * 20;
  r.radiation = clamp(r.radiation, 0, 100);

  // Containment degrades under high temp/pressure
  if (r.temperature > 700 || r.pressure > 70) {
    const stressFactor = Math.max((r.temperature - 700) / 300, (r.pressure - 70) / 30);
    r.containment -= stressFactor * 3 * phaseFactor * dt;
  }
  // Containment slowly regenerates when under control
  if (r.temperature < 500 && r.pressure < 50) {
    r.containment += 0.5 * dt;
  }
  r.containment = clamp(r.containment, 0, 100);

  // Shield degrades when absorbing radiation
  if (r.radiation > 20) {
    r.shieldStrength -= ((r.radiation - 20) / 80) * 2 * dt;
  }
  // Slow shield regen
  if (r.radiation < 10) {
    r.shieldStrength += 0.3 * dt;
  }
  r.shieldStrength = clamp(r.shieldStrength, 0, 100);

  // Stability is an aggregate health metric
  const tempFactor = r.temperature > 700 ? (r.temperature - 700) / 300 : 0;
  const pressureFactor = r.pressure > 70 ? (r.pressure - 70) / 30 : 0;
  const containFactor = r.containment < 50 ? (50 - r.containment) / 50 : 0;
  const radFactor = r.radiation > 50 ? (r.radiation - 50) / 50 : 0;

  const instability = (tempFactor + pressureFactor + containFactor + radFactor) * 5 * phaseFactor;
  const recovery = r.temperature < 500 && r.pressure < 50 ? 2 : 0;
  r.stability += (recovery - instability) * dt;
  r.stability = clamp(r.stability, 0, 100);

  // Check for subsystem effects
  updateSubsystemEffects(state);

  // Critical temperature timer
  if (r.temperature >= CRITICAL_TEMP) {
    state.criticalTempTimer += dt;
  } else {
    state.criticalTempTimer = Math.max(0, state.criticalTempTimer - dt * 2);
  }

  // Check game-over conditions
  checkGameOver(state);
}

function updateSubsystemEffects(state: GameState): void {
  const r = state.reactor;

  for (const sub of state.subsystems) {
    // Non-operational subsystems have negative effects
    if (!sub.operational) {
      switch (sub.id) {
        case 'primary-coolant':
          r.coolantFlow = Math.max(0, r.coolantFlow - 5 * TICK_DELTA);
          break;
        case 'secondary-coolant':
          r.coolantFlow = Math.max(0, r.coolantFlow - 3 * TICK_DELTA);
          break;
        case 'turbine-generator':
          r.powerOutput = Math.min(r.powerOutput, 60);
          break;
        case 'containment-field':
          r.containment -= 2 * TICK_DELTA;
          break;
        case 'shield-generator':
          r.shieldStrength -= 3 * TICK_DELTA;
          break;
      }
    }

    // Fire damage
    if (sub.onFire) {
      sub.health -= 5 * TICK_DELTA;
      if (sub.health <= 0) {
        sub.health = 0;
        sub.operational = false;
      }
    }
  }
}

function checkGameOver(state: GameState): void {
  if (state.gameOver) return;

  const r = state.reactor;

  // Win condition: survived final countdown
  if (state.gameTime >= 600 && state.phase === GamePhase.FinalCountdown) {
    state.gameOver = true;
    state.won = true;
    state.gameOverReason = 'Reactor stabilized! The Dyson sphere is saved!';
    return;
  }

  // Lose: critical temp for too long
  if (state.criticalTempTimer >= CRITICAL_TEMP_HOLD) {
    state.gameOver = true;
    state.won = false;
    state.gameOverReason = 'Core temperature exceeded critical threshold for too long - MELTDOWN!';
    return;
  }

  // Lose: containment breach
  if (r.containment <= 0) {
    state.gameOver = true;
    state.won = false;
    state.gameOverReason = 'Containment breach - catastrophic radiation release!';
    return;
  }

  // Lose: stability zero
  if (r.stability <= 0) {
    state.gameOver = true;
    state.won = false;
    state.gameOverReason = 'Reactor destabilized - cascade failure!';
    return;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
