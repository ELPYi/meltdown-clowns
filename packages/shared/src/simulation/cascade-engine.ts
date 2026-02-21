import { GameState, GameEvent, EventType } from '../types/game-state.js';
import { Role } from '../types/roles.js';
import { SeededRNG } from '../util/rng.js';
import { TICK_DELTA, DIFFICULTY_SCALE, EVENT_RAMP_UP } from '../util/constants.js';
import { getEventFrequency, getSeverityWeights } from './phase-manager.js';

interface CascadeEdge {
  from: EventType;
  to: EventType;
  probability: number;
  delay: number; // seconds
}

/** Directed graph of cascade dependencies between event types */
const CASCADE_GRAPH: CascadeEdge[] = [
  { from: EventType.TemperatureSpike, to: EventType.PressureSurge, probability: 0.6, delay: 5 },
  { from: EventType.TemperatureSpike, to: EventType.FireBreakout, probability: 0.3, delay: 8 },
  { from: EventType.PressureSurge, to: EventType.CoolantLeak, probability: 0.5, delay: 4 },
  { from: EventType.CoolantLeak, to: EventType.TemperatureSpike, probability: 0.7, delay: 6 },
  { from: EventType.SubsystemFailure, to: EventType.SensorMalfunction, probability: 0.4, delay: 3 },
  { from: EventType.FireBreakout, to: EventType.SubsystemFailure, probability: 0.5, delay: 5 },
  { from: EventType.RadiationLeak, to: EventType.ShieldDegradation, probability: 0.6, delay: 4 },
  { from: EventType.ContainmentBreach, to: EventType.RadiationLeak, probability: 0.8, delay: 2 },
  { from: EventType.PowerSurge, to: EventType.TemperatureSpike, probability: 0.7, delay: 3 },
  { from: EventType.ShieldDegradation, to: EventType.ContainmentBreach, probability: 0.4, delay: 7 },
];

const EVENT_ROLE_MAP: Record<EventType, Role> = {
  [EventType.TemperatureSpike]: Role.ReactorOperator,
  [EventType.PressureSurge]: Role.SafetyOfficer,
  [EventType.CoolantLeak]: Role.Engineer,
  [EventType.RadiationLeak]: Role.SafetyOfficer,
  [EventType.SubsystemFailure]: Role.Engineer,
  [EventType.SensorMalfunction]: Role.Technician,
  [EventType.ContainmentBreach]: Role.SafetyOfficer,
  [EventType.PowerSurge]: Role.ReactorOperator,
  [EventType.FireBreakout]: Role.Engineer,
  [EventType.ShieldDegradation]: Role.SafetyOfficer,
};

const EVENT_TITLES: Record<EventType, string> = {
  [EventType.TemperatureSpike]: 'Temperature Spike',
  [EventType.PressureSurge]: 'Pressure Surge',
  [EventType.CoolantLeak]: 'Coolant Leak',
  [EventType.RadiationLeak]: 'Radiation Leak',
  [EventType.SubsystemFailure]: 'Subsystem Failure',
  [EventType.SensorMalfunction]: 'Sensor Malfunction',
  [EventType.ContainmentBreach]: 'Containment Breach',
  [EventType.PowerSurge]: 'Power Surge',
  [EventType.FireBreakout]: 'Fire Breakout',
  [EventType.ShieldDegradation]: 'Shield Degradation',
};

const EVENT_ACTIONS: Record<EventType, string> = {
  [EventType.TemperatureSpike]: 'set-control-rods',
  [EventType.PressureSurge]: 'vent-pressure',
  [EventType.CoolantLeak]: 'repair-subsystem',
  [EventType.RadiationLeak]: 'set-shield-power',
  [EventType.SubsystemFailure]: 'repair-subsystem',
  [EventType.SensorMalfunction]: 'calibrate-sensor',
  [EventType.ContainmentBreach]: 'authorize-protocol',
  [EventType.PowerSurge]: 'set-control-rods',
  [EventType.FireBreakout]: 'toggle-fire-suppression',
  [EventType.ShieldDegradation]: 'set-shield-power',
};

const SEVERITY_DEADLINES: Record<string, number> = {
  low: 30,
  medium: 20,
  high: 12,
  critical: 8,
};

let eventCounter = 0;
let lastEventTime = 0;

export function resetCascadeEngine(): void {
  eventCounter = 0;
  lastEventTime = 0;
}

/**
 * Generate new events and process cascades each tick.
 */
export function tickEvents(state: GameState, rng: SeededRNG): void {
  const dt = TICK_DELTA;
  const difficulty = DIFFICULTY_SCALE[state.playerCount] ?? DIFFICULTY_SCALE[4];

  // Generate random events based on phase frequency
  const eventsPerSecond = getEventFrequency(state.phase) / 60 * difficulty.eventMultiplier;
  const timeSinceLastEvent = state.gameTime - lastEventTime;
  const minInterval = 3 / difficulty.eventMultiplier; // At least 3 seconds between events

  if (timeSinceLastEvent >= minInterval && rng.chance(eventsPerSecond * dt)) {
    const event = generateEvent(state, rng, difficulty.resolutionTimeMultiplier);
    if (event) {
      state.activeEvents.push(event);
      state.totalEventCount++;
      lastEventTime = state.gameTime;
    }
  }

  // Process unresolved event consequences
  for (const event of state.activeEvents) {
    if (event.resolved || event.consequenceApplied) continue;

    if (state.gameTime >= event.deadline) {
      applyConsequence(state, event, rng);
      event.consequenceApplied = true;
    }
  }

  // Clean up old resolved events (keep last 10)
  const resolved = state.activeEvents.filter(e => e.resolved || e.consequenceApplied);
  if (resolved.length > 10) {
    const toRemove = resolved.slice(0, resolved.length - 10);
    state.activeEvents = state.activeEvents.filter(e => !toRemove.includes(e));
  }
}

function generateEvent(
  state: GameState,
  rng: SeededRNG,
  resolutionMultiplier: number
): GameEvent | null {
  const eventTypes = Object.values(EventType);
  const type = rng.pick(eventTypes);

  // Don't stack too many events of same type
  const sameTypeActive = state.activeEvents.filter(
    e => e.type === type && !e.resolved && !e.consequenceApplied
  ).length;
  if (sameTypeActive >= 2) return null;

  const severityWeights = getSeverityWeights(state.phase);
  const severity = pickSeverity(rng, severityWeights);
  const baseDeadline = SEVERITY_DEADLINES[severity];
  const deadline = baseDeadline * resolutionMultiplier;

  eventCounter++;
  return {
    id: `evt-${eventCounter}`,
    type,
    targetRole: EVENT_ROLE_MAP[type],
    title: EVENT_TITLES[type],
    description: getEventDescription(type, severity),
    severity,
    startTime: state.gameTime,
    deadline: state.gameTime + deadline,
    resolved: false,
    consequenceApplied: false,
    requiredAction: EVENT_ACTIONS[type],
  };
}

function pickSeverity(
  rng: SeededRNG,
  weights: [number, number, number, number]
): 'low' | 'medium' | 'high' | 'critical' {
  const severities: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];
  const r = rng.next();
  let cumulative = 0;
  for (let i = 0; i < 4; i++) {
    cumulative += weights[i];
    if (r < cumulative) return severities[i];
  }
  return 'medium';
}

function applyConsequence(state: GameState, event: GameEvent, rng: SeededRNG): void {
  const r = state.reactor;
  const severity = event.severity === 'critical' ? 3 : event.severity === 'high' ? 2 : event.severity === 'medium' ? 1.5 : 1;

  switch (event.type) {
    case EventType.TemperatureSpike:
      r.temperature += 50 * severity;
      break;
    case EventType.PressureSurge:
      r.pressure += 15 * severity;
      break;
    case EventType.CoolantLeak:
      r.coolantLevel -= 20 * severity;
      break;
    case EventType.RadiationLeak:
      r.radiation += 15 * severity;
      break;
    case EventType.SubsystemFailure: {
      const operational = state.subsystems.filter(s => s.operational);
      if (operational.length > 0) {
        const sub = rng.pick(operational);
        sub.health -= 30 * severity;
        if (sub.health <= 0) {
          sub.health = 0;
          sub.operational = false;
        }
      }
      break;
    }
    case EventType.SensorMalfunction:
      // Sensors go wonky - handled by client-side display
      break;
    case EventType.ContainmentBreach:
      r.containment -= 15 * severity;
      break;
    case EventType.PowerSurge:
      r.powerOutput = Math.min(100, r.powerOutput + 20 * severity);
      r.temperature += 30 * severity;
      break;
    case EventType.FireBreakout: {
      const subs = state.subsystems.filter(s => !s.onFire && s.operational);
      if (subs.length > 0) {
        rng.pick(subs).onFire = true;
      }
      break;
    }
    case EventType.ShieldDegradation:
      r.shieldStrength -= 20 * severity;
      break;
  }

  // Trigger cascades
  const cascades = CASCADE_GRAPH.filter(c => c.from === event.type);
  for (const cascade of cascades) {
    if (rng.chance(cascade.probability * (severity / 2))) {
      // Schedule a cascaded event
      const cascadedEvent = generateCascadeEvent(state, cascade.to, event.severity, cascade.delay);
      if (cascadedEvent) {
        state.activeEvents.push(cascadedEvent);
        state.totalEventCount++;
      }
    }
  }
}

function generateCascadeEvent(
  state: GameState,
  type: EventType,
  parentSeverity: string,
  delay: number
): GameEvent | null {
  // Don't stack too many
  const sameTypeActive = state.activeEvents.filter(
    e => e.type === type && !e.resolved && !e.consequenceApplied
  ).length;
  if (sameTypeActive >= 3) return null;

  const severity = parentSeverity === 'critical' ? 'high' : parentSeverity as 'low' | 'medium' | 'high' | 'critical';
  const baseDeadline = SEVERITY_DEADLINES[severity];

  eventCounter++;
  return {
    id: `evt-${eventCounter}`,
    type,
    targetRole: EVENT_ROLE_MAP[type],
    title: `[CASCADE] ${EVENT_TITLES[type]}`,
    description: getEventDescription(type, severity),
    severity,
    startTime: state.gameTime + delay,
    deadline: state.gameTime + delay + baseDeadline,
    resolved: false,
    consequenceApplied: false,
    requiredAction: EVENT_ACTIONS[type],
  };
}

function getEventDescription(type: EventType, severity: string): string {
  const level = severity.toUpperCase();
  switch (type) {
    case EventType.TemperatureSpike: return `[${level}] Core temperature rising abnormally. Adjust control rods.`;
    case EventType.PressureSurge: return `[${level}] Pressure building in primary loop. Vent immediately.`;
    case EventType.CoolantLeak: return `[${level}] Coolant leak detected. Repair the affected loop.`;
    case EventType.RadiationLeak: return `[${level}] Radiation levels spiking. Boost shields.`;
    case EventType.SubsystemFailure: return `[${level}] A subsystem has failed. Dispatch repair.`;
    case EventType.SensorMalfunction: return `[${level}] Sensor readings unreliable. Recalibrate.`;
    case EventType.ContainmentBreach: return `[${level}] Containment integrity compromised! Authorize emergency protocol.`;
    case EventType.PowerSurge: return `[${level}] Power output surging. Reduce control rod position.`;
    case EventType.FireBreakout: return `[${level}] Fire detected in a subsystem. Activate suppression.`;
    case EventType.ShieldDegradation: return `[${level}] Shield generators losing power. Boost shield output.`;
  }
}
