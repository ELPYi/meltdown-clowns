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

/** Difficulty scaling by player count */
export const DIFFICULTY_SCALE: Record<number, { eventMultiplier: number; resolutionTimeMultiplier: number }> = {
  2: { eventMultiplier: 0.6, resolutionTimeMultiplier: 1.5 },
  3: { eventMultiplier: 0.8, resolutionTimeMultiplier: 1.25 },
  4: { eventMultiplier: 1.0, resolutionTimeMultiplier: 1.0 },
  5: { eventMultiplier: 1.15, resolutionTimeMultiplier: 0.9 },
  6: { eventMultiplier: 1.3, resolutionTimeMultiplier: 0.8 },
};

/** WebSocket server port */
export const DEFAULT_PORT = 3001;

/** Max particle count for performance */
export const MAX_PARTICLES = 500;
