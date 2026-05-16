import { GameAction } from '../types/messages.js';
import { Role } from '../types/roles.js';
import { GameState } from '../types/game-state.js';

/** Which roles can perform which actions */
const ACTION_PERMISSIONS: Record<string, Role[]> = {
  'set-control-rods': [Role.ReactorOperator],
  'set-power': [Role.ReactorOperator],
  'scram': [Role.ReactorOperator, Role.SafetyOfficer],
  'repair-subsystem': [Role.Engineer],
  'toggle-fire-suppression': [Role.Engineer],
  'refill-coolant': [Role.Engineer],
  'set-coolant-flow': [Role.Engineer],
  'calibrate-sensor': [Role.Technician],
  'run-diagnostic': [Role.Technician],
  'set-shield-power': [Role.SafetyOfficer],
  'vent-pressure': [Role.SafetyOfficer],
  'emergency-coolant': [Role.SafetyOfficer],
  'authorize-protocol': [Role.SafetyOfficer],
  'seal-containment': [Role.SafetyOfficer],
  'resolve-event': [Role.ReactorOperator, Role.Engineer, Role.Technician, Role.SafetyOfficer],
  'callout': [Role.ReactorOperator, Role.Engineer, Role.Technician, Role.SafetyOfficer],
};

export function validateAction(
  action: GameAction,
  playerRoles: Role[],
  state: GameState
): { valid: boolean; reason?: string } {
  const allowedRoles = ACTION_PERMISSIONS[action.kind];
  if (!allowedRoles) {
    return { valid: false, reason: `Unknown action: ${action.kind}` };
  }

  const hasPermission = playerRoles.some(role => allowedRoles.includes(role));
  if (!hasPermission) {
    return { valid: false, reason: `None of your roles can perform ${action.kind}` };
  }

  // Action-specific validation
  switch (action.kind) {
    case 'set-control-rods':
      if (!Number.isFinite(action.position) || action.position < 0 || action.position > 100) {
        return { valid: false, reason: 'Control rod position must be 0-100' };
      }
      break;
    case 'set-power':
      if (!Number.isFinite(action.level) || action.level < 0 || action.level > 100) {
        return { valid: false, reason: 'Power level must be 0-100' };
      }
      break;
    case 'set-shield-power':
      if (!Number.isFinite(action.level) || action.level < 0 || action.level > 100) {
        return { valid: false, reason: 'Shield power must be 0-100' };
      }
      break;
    case 'set-coolant-flow':
      if (!Number.isFinite(action.level) || action.level < 0 || action.level > 100) {
        return { valid: false, reason: 'Coolant flow must be 0-100' };
      }
      break;
    case 'repair-subsystem': {
      const sub = state.subsystems.find(s => s.id === action.subsystemId);
      if (!sub) {
        return { valid: false, reason: 'Unknown subsystem' };
      }
      if (sub.health >= 80 && !sub.onFire) {
        return { valid: false, reason: 'Subsystem is functioning normally — repair not needed' };
      }
      break;
    }
    case 'authorize-protocol': {
      const validProtocols = ['containment-restore', 'radiation-flush', 'power-reroute'] as const;
      if (!validProtocols.includes(action.protocolId)) {
        return { valid: false, reason: 'Unknown protocol' };
      }
      break;
    }
    case 'callout':
      if (!action.text || action.text.trim().length === 0) {
        return { valid: false, reason: 'Callout text cannot be empty' };
      }
      if (action.text.length > 100) {
        return { valid: false, reason: 'Callout text too long' };
      }
      break;
    case 'resolve-event': {
      const event = state.activeEvents.find(e => e.id === action.eventId);
      if (!event) {
        return { valid: false, reason: 'Unknown event' };
      }
      if (event.resolved) {
        return { valid: false, reason: 'Event already resolved' };
      }
      if (!playerRoles.includes(event.targetRole)) {
        return { valid: false, reason: 'This event requires a different role' };
      }
      break;
    }
  }

  return { valid: true };
}

export function applyAction(action: GameAction, state: GameState): void {
  const r = state.reactor;

  switch (action.kind) {
    case 'set-control-rods':
      r.controlRodPosition = Math.max(0, Math.min(100, action.position));
      break;
    case 'set-power':
      // Adjust control rods inversely
      r.controlRodPosition = Math.max(0, Math.min(100, 100 - action.level));
      break;
    case 'scram':
      // Emergency shutdown - slam all rods in
      r.controlRodPosition = 100;
      break;
    case 'repair-subsystem': {
      const sub = state.subsystems.find(s => s.id === action.subsystemId);
      if (sub) {
        sub.health = Math.min(100, sub.health + 30);
        sub.onFire = false;
        if (sub.health > 0) sub.operational = true;
      }
      break;
    }
    case 'toggle-fire-suppression': {
      const sub = state.subsystems.find(s => s.id === action.subsystemId);
      if (sub) sub.onFire = false;
      break;
    }
    case 'refill-coolant':
      r.coolantLevel = Math.min(100, r.coolantLevel + 25);
      break;
    case 'set-coolant-flow':
      r.coolantFlow = Math.max(0, Math.min(100, action.level));
      break;
    case 'calibrate-sensor':
      // Clear any active sensor noise — this is what the Technician's calibration does
      state.sensorNoise.active = false;
      state.sensorNoise.ttl = 0;
      break;
    case 'run-diagnostic':
      // Diagnostic result is computed and sent by game-session; no reactor state change
      break;
    case 'set-shield-power':
      r.shieldStrength = Math.max(0, Math.min(100, action.level));
      break;
    case 'vent-pressure':
      r.pressure = Math.max(0, r.pressure - 15);
      // Venting reduces containment slightly
      r.containment = Math.max(0, r.containment - 2);
      break;
    case 'emergency-coolant':
      r.coolantLevel = 100;
      r.temperature = Math.max(200, r.temperature - 200);
      break;
    case 'authorize-protocol':
      switch (action.protocolId) {
        case 'containment-restore':
          r.containment = Math.min(100, r.containment + 20);
          break;
        case 'radiation-flush':
          // Flush radiation at the cost of some shield integrity
          r.radiation = Math.max(0, r.radiation - 30);
          r.shieldStrength = Math.max(0, r.shieldStrength - 10);
          break;
        case 'power-reroute':
          // Emergency power rerouting stabilizes the reactor aggregate score
          r.stability = Math.min(100, r.stability + 15);
          break;
      }
      break;
    case 'seal-containment':
      // Slow manual patch — smaller gain than the emergency protocol but uses no pool charge
      r.containment = Math.min(100, r.containment + 8);
      break;
    case 'callout':
      // Forwarded as a broadcast message by game-session; no reactor state change
      break;
    case 'resolve-event': {
      const event = state.activeEvents.find(e => e.id === action.eventId);
      if (event && !event.resolved) {
        event.resolved = true;
        state.resolvedEventCount++;
      }
      break;
    }
  }
}
