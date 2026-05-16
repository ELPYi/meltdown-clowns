/** Server simulation tick rate in Hz */
export const TICK_RATE = 20;

/** Milliseconds per tick */
export const TICK_MS = 1000 / TICK_RATE; // 50ms

/** Seconds per tick */
export const TICK_DELTA = 1 / TICK_RATE; // 0.05s

/** Full keyframe broadcast interval in ticks */
export const KEYFRAME_INTERVAL = 60; // Every 3 seconds (60 ticks at 20Hz)

/** Maximum players per room */
export const MAX_PLAYERS = 6;

/** Minimum players to start */
export const MIN_PLAYERS = 2;

/** Game duration in seconds */
export const GAME_DURATION_S = 600;

/** Critical temperature threshold */
export const CRITICAL_TEMP = 900;

/** Critical temperature hold time before meltdown (seconds) */
export const CRITICAL_TEMP_HOLD = 10;

/** Critical pressure threshold */
export const CRITICAL_PRESSURE = 90;

/** Critical radiation threshold */
export const CRITICAL_RADIATION = 80;

/** Critical containment threshold (below this = breach) */
export const CRITICAL_CONTAINMENT = 20;

/** Event ramp-up duration in seconds */
export const EVENT_RAMP_UP = 7;

/** Event fade duration in seconds */
export const EVENT_FADE = 5;

/** Difficulty scaling by player count.
 *  More players → more events (keeps everyone busy), but resolution time doesn't shrink —
 *  extra hands should compensate for the higher event load. */
export const DIFFICULTY_SCALE: Record<number, { eventMultiplier: number; resolutionTimeMultiplier: number }> = {
  2: { eventMultiplier: 0.6, resolutionTimeMultiplier: 1.4 },
  3: { eventMultiplier: 0.8, resolutionTimeMultiplier: 1.2 },
  4: { eventMultiplier: 1.0, resolutionTimeMultiplier: 1.0 },
  5: { eventMultiplier: 1.2, resolutionTimeMultiplier: 1.0 },
  6: { eventMultiplier: 1.4, resolutionTimeMultiplier: 1.0 },
};

/** WebSocket server port */
export const DEFAULT_PORT = 3001;

/** Max particle count for performance */
export const MAX_PARTICLES = 500;

/** Max simultaneous unresolved active events (prevents cascade DoS) */
export const MAX_ACTIVE_EVENTS = 15;

/** Broadcast game state every N ticks (5 Hz at 20 Hz tick rate) */
export const STATE_BROADCAST_INTERVAL = 4;

/** Seconds of noise on sensor displays after a SensorMalfunction consequence */
export const SENSOR_NOISE_TTL = 45;

/** Seconds before an AI takes over a disconnected player's role */
export const AI_TAKEOVER_DELAY_S = 30;

/** Cooldown in seconds between callout messages, per player */
export const CALLOUT_COOLDOWN_S = 5;

// ---- Difficulty ----

export enum Difficulty {
  Easy = 'easy',
  Normal = 'normal',
  Hard = 'hard',
  Impossible = 'impossible',
}

export interface DifficultySettings {
  label: string;
  multiplier: number;
  emergencyPool: number;
  /** Max fraction of events allowed to fail before game over. 0 = any failure ends game. */
  failureThreshold: number;
  sliderSensitivity: number;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultySettings> = {
  [Difficulty.Easy]: {
    label: 'Easy',
    multiplier: 0.6,
    emergencyPool: 7,
    failureThreshold: 0.7,
    sliderSensitivity: 1.0,
  },
  [Difficulty.Normal]: {
    label: 'Normal',
    multiplier: 1.0,
    emergencyPool: 5,
    failureThreshold: 0.5,
    sliderSensitivity: 1.0,
  },
  [Difficulty.Hard]: {
    label: 'Hard',
    multiplier: 1.5,
    emergencyPool: 2,
    failureThreshold: 0.2,
    sliderSensitivity: 1.3,
  },
  [Difficulty.Impossible]: {
    label: 'Impossible',
    multiplier: 2.0,
    emergencyPool: 0,
    failureThreshold: 0,
    sliderSensitivity: 1.7,
  },
};

// ---- Scoring ----

export const SCORE_PER_EVENT = 100;
export const SCORE_PER_PLAYER = 150;
export const SCORE_MAX_POWER = 500;
export const SCORE_PER_MINUTE = 50;
export const SCORE_SURVIVAL_BONUS = 1000;
export const SCORE_EMERGENCY_PENALTY = 75;

// ---- Low power mechanic ----

export const MIN_POWER_THRESHOLD = 25;
export const LOW_POWER_GRACE_S = 10;
export const LOW_POWER_GAME_OVER_S = 30;
export const LOW_POWER_PENALTY_PER_S = 20;
export const SCRAM_PROTECTION_S = 60;
