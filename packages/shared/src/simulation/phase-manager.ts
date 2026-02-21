import { GameState, GamePhase, PHASE_TIMES, GAME_DURATION } from '../types/game-state.js';

/**
 * Manages phase transitions based on game time.
 */
export function updatePhase(state: GameState): boolean {
  const previousPhase = state.phase;

  if (state.gameTime >= PHASE_TIMES[GamePhase.FinalCountdown]) {
    state.phase = GamePhase.FinalCountdown;
  } else if (state.gameTime >= PHASE_TIMES[GamePhase.CriticalMeltdown]) {
    state.phase = GamePhase.CriticalMeltdown;
  } else if (state.gameTime >= PHASE_TIMES[GamePhase.CascadeWarning]) {
    state.phase = GamePhase.CascadeWarning;
  } else if (state.gameTime >= PHASE_TIMES[GamePhase.AnomaliesDetected]) {
    state.phase = GamePhase.AnomaliesDetected;
  } else {
    state.phase = GamePhase.StableOperations;
  }

  return state.phase !== previousPhase;
}

/** Get phase progress (0-1) within current phase */
export function getPhaseProgress(state: GameState): number {
  const currentPhaseStart = PHASE_TIMES[state.phase];
  const nextPhase = state.phase + 1;
  const nextPhaseStart = nextPhase <= GamePhase.FinalCountdown
    ? PHASE_TIMES[nextPhase as GamePhase]
    : GAME_DURATION;

  const duration = nextPhaseStart - currentPhaseStart;
  const elapsed = state.gameTime - currentPhaseStart;
  return Math.min(1, elapsed / duration);
}

/**
 * Get the base event frequency for a phase (events per minute).
 */
export function getEventFrequency(phase: GamePhase): number {
  switch (phase) {
    case GamePhase.StableOperations: return 0.5;
    case GamePhase.AnomaliesDetected: return 1.5;
    case GamePhase.CascadeWarning: return 3;
    case GamePhase.CriticalMeltdown: return 5;
    case GamePhase.FinalCountdown: return 4; // Slightly less but more severe
  }
}

/**
 * Get the base event severity distribution for a phase.
 * Returns weights for [low, medium, high, critical].
 */
export function getSeverityWeights(phase: GamePhase): [number, number, number, number] {
  switch (phase) {
    case GamePhase.StableOperations: return [0.7, 0.3, 0, 0];
    case GamePhase.AnomaliesDetected: return [0.3, 0.5, 0.2, 0];
    case GamePhase.CascadeWarning: return [0.1, 0.3, 0.4, 0.2];
    case GamePhase.CriticalMeltdown: return [0, 0.2, 0.4, 0.4];
    case GamePhase.FinalCountdown: return [0, 0.1, 0.3, 0.6];
  }
}
