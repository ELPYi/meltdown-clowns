import { Role } from './roles.js';

export enum GamePhase {
  StableOperations = 0,
  AnomaliesDetected = 1,
  CascadeWarning = 2,
  CriticalMeltdown = 3,
  FinalCountdown = 4,
}

export const PHASE_NAMES: Record<GamePhase, string> = {
  [GamePhase.StableOperations]: 'Stable Operations',
  [GamePhase.AnomaliesDetected]: 'Anomalies Detected',
  [GamePhase.CascadeWarning]: 'Cascade Warning',
  [GamePhase.CriticalMeltdown]: 'Critical Meltdown',
  [GamePhase.FinalCountdown]: 'Final Countdown',
};

/** Timestamps (in seconds) for phase transitions in a 10-minute game */
export const PHASE_TIMES: Record<GamePhase, number> = {
  [GamePhase.StableOperations]: 0,
  [GamePhase.AnomaliesDetected]: 120,
  [GamePhase.CascadeWarning]: 240,
  [GamePhase.CriticalMeltdown]: 390,
  [GamePhase.FinalCountdown]: 540,
};

export const GAME_DURATION = 600; // 10 minutes in seconds

export interface ReactorState {
  temperature: number;       // 0-1000, critical at 900
  pressure: number;          // 0-100 (MPa), critical at 90
  powerOutput: number;       // 0-100 (%)
  coolantLevel: number;      // 0-100 (%)
  coolantFlow: number;       // 0-100 (%)
  radiation: number;         // 0-100 (mSv), critical at 80
  containment: number;       // 0-100 (%), critical below 20
  stability: number;         // 0-100 (%), lose at 0
  controlRodPosition: number; // 0-100 (% inserted, 100 = fully inserted = less power)
  shieldStrength: number;    // 0-100 (%)
}

export interface SubsystemStatus {
  id: string;
  name: string;
  health: number;         // 0-100
  operational: boolean;
  onFire: boolean;
  assignedRole: Role;
}

export interface GameEvent {
  id: string;
  type: EventType;
  targetRole: Role;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  startTime: number;          // game time when event started
  deadline: number;           // game time when unresolved event triggers consequence
  resolved: boolean;
  consequenceApplied: boolean;
  requiredAction: string;     // action type needed to resolve
}

export enum EventType {
  TemperatureSpike = 'temperature-spike',
  PressureSurge = 'pressure-surge',
  CoolantLeak = 'coolant-leak',
  RadiationLeak = 'radiation-leak',
  SubsystemFailure = 'subsystem-failure',
  SensorMalfunction = 'sensor-malfunction',
  ContainmentBreach = 'containment-breach',
  PowerSurge = 'power-surge',
  FireBreakout = 'fire-breakout',
  ShieldDegradation = 'shield-degradation',
}

export interface GameState {
  sessionId: string;
  phase: GamePhase;
  gameTime: number;           // seconds elapsed
  tickCount: number;
  reactor: ReactorState;
  subsystems: SubsystemStatus[];
  activeEvents: GameEvent[];
  resolvedEventCount: number;
  totalEventCount: number;
  playerCount: number;
  gameOver: boolean;
  won: boolean;
  gameOverReason?: string;
  criticalTempTimer: number;  // seconds at critical temp
}

export function createInitialReactorState(): ReactorState {
  return {
    temperature: 350,
    pressure: 40,
    powerOutput: 50,
    coolantLevel: 100,
    coolantFlow: 60,
    radiation: 5,
    containment: 100,
    stability: 100,
    controlRodPosition: 50,
    shieldStrength: 100,
  };
}

export function createInitialGameState(sessionId: string, playerCount: number): GameState {
  return {
    sessionId,
    phase: GamePhase.StableOperations,
    gameTime: 0,
    tickCount: 0,
    reactor: createInitialReactorState(),
    subsystems: createDefaultSubsystems(),
    activeEvents: [],
    resolvedEventCount: 0,
    totalEventCount: 0,
    playerCount,
    gameOver: false,
    won: false,
    criticalTempTimer: 0,
  };
}

function createDefaultSubsystems(): SubsystemStatus[] {
  return [
    { id: 'primary-coolant', name: 'Primary Coolant Loop', health: 100, operational: true, onFire: false, assignedRole: Role.Engineer },
    { id: 'secondary-coolant', name: 'Secondary Coolant Loop', health: 100, operational: true, onFire: false, assignedRole: Role.Engineer },
    { id: 'turbine-generator', name: 'Turbine Generator', health: 100, operational: true, onFire: false, assignedRole: Role.Engineer },
    { id: 'control-system', name: 'Control System', health: 100, operational: true, onFire: false, assignedRole: Role.ReactorOperator },
    { id: 'sensor-array', name: 'Sensor Array', health: 100, operational: true, onFire: false, assignedRole: Role.Technician },
    { id: 'containment-field', name: 'Containment Field', health: 100, operational: true, onFire: false, assignedRole: Role.SafetyOfficer },
    { id: 'shield-generator', name: 'Shield Generator', health: 100, operational: true, onFire: false, assignedRole: Role.SafetyOfficer },
    { id: 'ventilation', name: 'Ventilation System', health: 100, operational: true, onFire: false, assignedRole: Role.Engineer },
  ];
}
