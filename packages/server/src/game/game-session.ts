import {
  GameState,
  GameAction,
  Role,
  createInitialGameState,
  tickReactor,
  updatePhase,
  tickEvents,
  resetCascadeEngine,
  validateAction,
  applyAction,
  SeededRNG,
  TICK_MS,
  TICK_DELTA,
  KEYFRAME_INTERVAL,
} from '@meltdown/shared';
import { broadcast, sendTo } from '../ws/message-router.js';

export class GameSession {
  readonly sessionId: string;
  readonly roomId: string;
  private state: GameState;
  private rng: SeededRNG;
  private playerRoles: Map<string, Role[]>;
  private playerIds: string[];
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private onGameOver: (session: GameSession) => void;

  constructor(
    roomId: string,
    playerIds: string[],
    roleAssignments: Map<string, Role[]>,
    onGameOver: (session: GameSession) => void
  ) {
    this.sessionId = `session-${Date.now().toString(36)}`;
    this.roomId = roomId;
    this.playerIds = playerIds;
    this.playerRoles = roleAssignments;
    this.onGameOver = onGameOver;

    this.state = createInitialGameState(this.sessionId, playerIds.length);
    this.rng = new SeededRNG(Date.now());

    resetCascadeEngine();
  }

  start(): void {
    // Notify all players of game start with their role assignments
    for (const playerId of this.playerIds) {
      const roles = this.playerRoles.get(playerId) ?? [];
      sendTo(playerId, {
        type: 'game-start',
        assignedRoles: roles,
        sessionId: this.sessionId,
      });
    }

    // Send initial full state
    this.broadcastState(false);

    // Start the simulation loop
    this.tickTimer = setInterval(() => this.tick(), TICK_MS);
  }

  stop(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  handleAction(playerId: string, action: GameAction): void {
    if (this.state.gameOver) return;

    const roles = this.playerRoles.get(playerId);
    if (!roles) return;

    const validation = validateAction(action, roles, this.state);
    if (!validation.valid) {
      sendTo(playerId, {
        type: 'error',
        message: validation.reason ?? 'Invalid action',
      });
      return;
    }

    applyAction(action, this.state);
  }

  handleDisconnect(playerId: string): void {
    const idx = this.playerIds.indexOf(playerId);
    if (idx >= 0) {
      // Player disconnected - for now just note it
      // AI takeover could be implemented here
    }
  }

  private tick(): void {
    if (this.state.gameOver) {
      this.stop();
      this.broadcastGameOver();
      this.onGameOver(this);
      return;
    }

    this.state.gameTime += TICK_DELTA;
    this.state.tickCount++;

    // Update phase
    updatePhase(this.state);

    // Run reactor physics
    tickReactor(this.state);

    // Generate/process events
    tickEvents(this.state, this.rng);

    // Broadcast state
    const isKeyframe = this.state.tickCount % KEYFRAME_INTERVAL === 0;
    this.broadcastState(isKeyframe);
  }

  private broadcastState(isDelta: boolean): void {
    broadcast(this.playerIds, {
      type: 'game-state',
      state: this.state,
      isDelta,
    });
  }

  private broadcastGameOver(): void {
    broadcast(this.playerIds, {
      type: 'game-over',
      won: this.state.won,
      reason: this.state.gameOverReason ?? 'Game over',
      stats: {
        survivalTime: this.state.gameTime,
        eventsResolved: this.state.resolvedEventCount,
        totalEvents: this.state.totalEventCount,
        finalPhase: this.state.phase,
      },
    });
  }

  getState(): GameState {
    return this.state;
  }
}
