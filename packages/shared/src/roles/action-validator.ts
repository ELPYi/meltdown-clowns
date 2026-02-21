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
  'resolve-event': [Role.ReactorOperator, Role.Engineer, Role.Technician, Role.SafetyOfficer],
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
      if (action.position < 0 || action.position > 100) {
        return { valid: false, reason: 'Control rod position must be 0-100' };
      }
      break;
    case 'set-power':
      if (action.level < 0 || action.level > 100) {
        return { valid: false, reason: 'Power level must be 0-100' };
      }
      break;
    case 'set-shield-power':
      if (action.level < 0 || action.level > 100) {
        return { valid: false, reason: 'Shield power must be 0-100' };
      }
      break;
    case 'set-coolant-flow':
      if (action.level < 0 || action.level > 100) {
        return { valid: false, reason: 'Coolant flow must be 0-100' };
      }
      break;
    case 'repair-subsystem': {
      const sub = state.subsystems.find(s => s.id === action.subsystemId);
      if (!sub) {
        return { valid: false, reason: 'Unknown subsystem' };
      }
      break;
    }
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
      r.controlRodPosition = action.position;
      break;
    case 'set-power':
      // Adjust control rods inversely
      r.controlRodPosition = 100 - action.level;
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
      r.coolantFlow = action.level;
      break;
    case 'calibrate-sensor':
      // Improves sensor accuracy - handled by client filtering
      break;
    case 'run-diagnostic':
      // Shows hidden info - handled by client
      break;
    case 'set-shield-power':
      r.shieldStrength = Math.min(100, action.level);
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
      // Various emergency protocols
      r.containment = Math.min(100, r.containment + 20);
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
