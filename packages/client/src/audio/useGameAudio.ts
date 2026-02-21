import { useEffect, useRef } from 'react';
import { GameState, GamePhase } from '@meltdown/shared';
import {
  resumeAudio,
  startAmbient,
  stopAmbient,
  updateAmbient,
  playAlarm,
  playPhaseTransition,
  playVictory,
  playMeltdown,
  playResolve,
  startKlaxon,
  stopKlaxon,
} from './sound-manager.js';

/**
 * Hook that drives all reactive audio based on game state changes.
 * Attach to the GameScreen component.
 */
export function useGameAudio(gameState: GameState | null, gameOver: boolean, won: boolean) {
  const prevPhaseRef = useRef<GamePhase | null>(null);
  const prevEventIdsRef = useRef<Set<string>>(new Set());
  const resolvedIdsRef = useRef<Set<string>>(new Set());
  const ambientStartedRef = useRef(false);
  const ambientUpdateRef = useRef(0);
  const klaxonActiveRef = useRef(false);

  // Start ambient on first game state
  useEffect(() => {
    if (gameState && !ambientStartedRef.current) {
      resumeAudio();
      startAmbient();
      ambientStartedRef.current = true;
    }
  }, [gameState]);

  // Clean up on unmount or game over
  useEffect(() => {
    return () => {
      stopAmbient();
      stopKlaxon();
      ambientStartedRef.current = false;
      klaxonActiveRef.current = false;
      prevPhaseRef.current = null;
      prevEventIdsRef.current = new Set();
      resolvedIdsRef.current = new Set();
    };
  }, []);

  // Game over sounds
  useEffect(() => {
    if (gameOver) {
      stopKlaxon();
      klaxonActiveRef.current = false;
      stopAmbient();
      ambientStartedRef.current = false;
      if (won) {
        playVictory();
      } else {
        playMeltdown();
      }
    }
  }, [gameOver, won]);

  // React to state changes each tick
  useEffect(() => {
    if (!gameState || gameOver) return;

    // Phase transition sound
    if (prevPhaseRef.current !== null && gameState.phase !== prevPhaseRef.current) {
      playPhaseTransition(gameState.phase);
    }
    prevPhaseRef.current = gameState.phase;

    // New event alarm sounds
    const currentEventIds = new Set(
      gameState.activeEvents
        .filter(e => !e.resolved && !e.consequenceApplied)
        .map(e => e.id)
    );
    for (const id of currentEventIds) {
      if (!prevEventIdsRef.current.has(id)) {
        const event = gameState.activeEvents.find(e => e.id === id);
        if (event) {
          playAlarm(event.severity);
        }
      }
    }

    // Resolved event sounds
    for (const event of gameState.activeEvents) {
      if (event.resolved && !resolvedIdsRef.current.has(event.id)) {
        resolvedIdsRef.current.add(event.id);
        playResolve();
      }
    }

    prevEventIdsRef.current = currentEventIds;

    // Update ambient (~every 10 ticks / 500ms to avoid thrashing)
    if (gameState.tickCount - ambientUpdateRef.current >= 10) {
      ambientUpdateRef.current = gameState.tickCount;

      const r = gameState.reactor;
      // Compute danger level 0-1
      const tempDanger = Math.max(0, (r.temperature - 500) / 500);
      const pressureDanger = Math.max(0, (r.pressure - 50) / 50);
      const containDanger = Math.max(0, (50 - r.containment) / 50);
      const stabilityDanger = Math.max(0, (50 - r.stability) / 50);
      const danger = Math.min(1, Math.max(tempDanger, pressureDanger, containDanger, stabilityDanger));

      updateAmbient(danger, r.radiation);

      // Klaxon for critical conditions
      const isCritical = r.temperature >= 850 || r.containment <= 15 || r.stability <= 15;
      if (isCritical && !klaxonActiveRef.current) {
        startKlaxon();
        klaxonActiveRef.current = true;
      } else if (!isCritical && klaxonActiveRef.current) {
        stopKlaxon();
        klaxonActiveRef.current = false;
      }
    }
  }, [gameState, gameOver]);
}
