import {
  GameState,
  GameAction,
  Role,
  PHASE_NAMES,
  DiagnosticRisk,
  ScoreBreakdown,
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
  STATE_BROADCAST_INTERVAL,
  AI_TAKEOVER_DELAY_S,
  CALLOUT_COOLDOWN_S,
  Difficulty,
  DIFFICULTY_CONFIG,
  GAME_DURATION_S,
  SCORE_PER_EVENT,
  SCORE_PER_PLAYER,
  SCORE_MAX_POWER,
  SCORE_PER_MINUTE,
  SCORE_SURVIVAL_BONUS,
  SCORE_EMERGENCY_PENALTY,
  SCRAM_PROTECTION_S,
  MAX_PLAYERS,
} from '@meltdown/shared';
import { broadcast, sendTo } from '../ws/message-router.js';

/** Actions that consume a shared emergency pool charge. */
const EMERGENCY_ACTION_KEYS = new Set([
  'emergency-coolant',
  'vent-pressure',
  'scram',
  'authorize-protocol:containment-restore',
  'authorize-protocol:radiation-flush',
  'authorize-protocol:power-reroute',
]);

/** Minimum seconds between uses of each action, per player. */
const ACTION_COOLDOWNS: Partial<Record<string, number>> = {
  'refill-coolant': 15,
  'emergency-coolant': 45,
  'authorize-protocol:containment-restore': 30,
  'authorize-protocol:radiation-flush': 30,
  'authorize-protocol:power-reroute': 30,
  'seal-containment': 60,
  'repair-subsystem': 8,
  'vent-pressure': 8,
  'toggle-fire-suppression': 5,
  'scram': 10,
  'callout': CALLOUT_COOLDOWN_S,
};

function cooldownKey(action: GameAction): string {
  if (action.kind === 'authorize-protocol') {
    return `authorize-protocol:${action.protocolId}`;
  }
  return action.kind;
}

export class GameSession {
  readonly sessionId: string;
  readonly roomId: string;
  private state: GameState;
  private rng: SeededRNG;
  private playerRoles: Map<string, Role[]>;
  private playerIds: string[];
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private onGameOver: (session: GameSession) => void;

  /** gameTime of last use per player per cooldown-key, for cooldown enforcement. */
  private playerCooldowns = new Map<string, Map<string, number>>();
  /** gameTime of last use per player per action kind, for event resolution gating. */
  private playerLastAction = new Map<string, Map<string, number>>();

  /** Players who have disconnected (playerId → wall-clock disconnect time). */
  private disconnectedAt = new Map<string, number>();
  /** Roles currently managed by AI (player disconnected > AI_TAKEOVER_DELAY_S ago). */
  private aiControlledRoles = new Set<Role>();
  /** setTimeout handles for scheduled AI takeovers. */
  private aiTakeoverTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    roomId: string,
    playerIds: string[],
    roleAssignments: Map<string, Role[]>,
    difficulty: Difficulty,
    onGameOver: (session: GameSession) => void
  ) {
    this.sessionId = `session-${Date.now().toString(36)}`;
    this.roomId = roomId;
    this.playerIds = playerIds;
    this.playerRoles = roleAssignments;
    this.onGameOver = onGameOver;

    this.state = createInitialGameState(this.sessionId, playerIds.length, difficulty);
    this.rng = new SeededRNG(Date.now());

    resetCascadeEngine();
  }

  start(): void {
    for (const playerId of this.playerIds) {
      const roles = this.playerRoles.get(playerId) ?? [];
      sendTo(playerId, {
        type: 'game-start',
        assignedRoles: roles,
        sessionId: this.sessionId,
      });
    }

    this.broadcastState(true);
    this.tickTimer = setInterval(() => this.tick(), TICK_MS);
  }

  stop(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    for (const t of this.aiTakeoverTimers.values()) clearTimeout(t);
    this.aiTakeoverTimers.clear();
  }

  handleAction(playerId: string, action: GameAction): void {
    if (this.state.gameOver) return;

    const roles = this.playerRoles.get(playerId);
    if (!roles) return;

    const cdKey = cooldownKey(action);
    const cooldownSec = ACTION_COOLDOWNS[cdKey];

    // --- Emergency pool check ---
    if (EMERGENCY_ACTION_KEYS.has(cdKey) && this.state.emergencyActionsLeft <= 0) {
      sendTo(playerId, {
        type: 'error',
        message: 'No emergency actions remaining!',
      });
      return;
    }

    // --- Cooldown check ---
    if (cooldownSec !== undefined) {
      const cds = this.playerCooldowns.get(playerId) ?? new Map<string, number>();
      const lastUsed = cds.get(cdKey) ?? -Infinity;
      const remaining = cooldownSec - (this.state.gameTime - lastUsed);
      if (remaining > 0) {
        sendTo(playerId, {
          type: 'error',
          message: `${action.kind} on cooldown — ${remaining.toFixed(1)}s remaining`,
        });
        return;
      }
    }

    // --- Event resolution gate: required action must have been performed since event started ---
    if (action.kind === 'resolve-event') {
      const event = this.state.activeEvents.find(e => e.id === action.eventId);
      if (event && !event.resolved) {
        const lastActions = this.playerLastAction.get(playerId) ?? new Map<string, number>();
        // ContainmentBreach can be satisfied by either authorize-protocol or seal-containment
        const acceptedActions = event.requiredAction === 'authorize-protocol'
          ? ['authorize-protocol', 'seal-containment']
          : [event.requiredAction];
        const satisfied = acceptedActions.some(
          a => (lastActions.get(a) ?? -1) >= event.startTime
        );
        if (!satisfied) {
          sendTo(playerId, {
            type: 'error',
            message: `Perform ${event.requiredAction} first to resolve this event`,
          });
          return;
        }
      }
    }

    // --- Diagnostic special handling: send result before state mutation ---
    if (action.kind === 'run-diagnostic') {
      this.sendDiagnosticResult(playerId);
    }

    // --- Callout: broadcast to team and skip state mutation ---
    if (action.kind === 'callout') {
      const validation = validateAction(action, roles, this.state);
      if (!validation.valid) {
        sendTo(playerId, { type: 'error', message: validation.reason ?? 'Invalid action' });
        return;
      }
      const fromRole = roles[0];
      broadcast(this.playerIds, { type: 'callout', fromRole, text: action.text });
      this.recordCooldown(playerId, cdKey, cooldownSec);
      return;
    }

    const validation = validateAction(action, roles, this.state);
    if (!validation.valid) {
      sendTo(playerId, {
        type: 'error',
        message: validation.reason ?? 'Invalid action',
      });
      return;
    }

    applyAction(action, this.state);

    // Consume emergency pool charge
    if (EMERGENCY_ACTION_KEYS.has(cdKey)) {
      this.state.emergencyActionsLeft = Math.max(0, this.state.emergencyActionsLeft - 1);
      this.state.emergencyActionsUsed++;
    }

    // SCRAM protection: exempt power drops from low-power penalty for a while
    if (action.kind === 'scram') {
      this.state.scramProtectionTimer = SCRAM_PROTECTION_S;
    }

    // Track last-action time for event resolution gating
    if (action.kind !== 'resolve-event') {
      if (!this.playerLastAction.has(playerId)) {
        this.playerLastAction.set(playerId, new Map());
      }
      this.playerLastAction.get(playerId)!.set(action.kind, this.state.gameTime);
    }

    this.recordCooldown(playerId, cdKey, cooldownSec);

    // Broadcast immediately so all players see the action's effect without waiting for next tick
    this.broadcastState(false);
  }

  handleDisconnect(playerId: string): void {
    const roles = this.playerRoles.get(playerId);
    if (!roles || roles.length === 0) return;

    this.disconnectedAt.set(playerId, Date.now());

    // Update shared state so clients can show the disconnect banner
    for (const role of roles) {
      if (!this.state.disconnectedRoles.includes(role)) {
        this.state.disconnectedRoles.push(role);
      }
    }

    broadcast(this.playerIds, {
      type: 'player-disconnected',
      roles,
      aiControlled: false,
    });

    // Schedule AI takeover if they don't reconnect in time
    const timer = setTimeout(() => {
      if (!this.disconnectedAt.has(playerId)) return; // reconnected
      for (const role of roles) this.aiControlledRoles.add(role);
      broadcast(this.playerIds, {
        type: 'player-disconnected',
        roles,
        aiControlled: true,
      });
    }, AI_TAKEOVER_DELAY_S * 1000);

    this.aiTakeoverTimers.set(playerId, timer);
  }

  handleReconnect(playerId: string): void {
    const roles = this.playerRoles.get(playerId);
    if (!roles) return;

    this.disconnectedAt.delete(playerId);

    // Cancel pending AI takeover
    const timer = this.aiTakeoverTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.aiTakeoverTimers.delete(playerId);
    }

    // Remove from AI control and disconnected list
    for (const role of roles) this.aiControlledRoles.delete(role);
    this.state.disconnectedRoles = this.state.disconnectedRoles.filter(r => !roles.includes(r));
  }

  private recordCooldown(playerId: string, key: string, cooldownSec: number | undefined): void {
    if (cooldownSec === undefined) return;
    if (!this.playerCooldowns.has(playerId)) {
      this.playerCooldowns.set(playerId, new Map());
    }
    this.playerCooldowns.get(playerId)!.set(key, this.state.gameTime);
  }

  private sendDiagnosticResult(playerId: string): void {
    const r = this.state.reactor;
    const risks: DiagnosticRisk[] = [];

    if (r.temperature > 800) risks.push({ metric: 'Core Temperature', value: r.temperature, status: 'critical' });
    else if (r.temperature > 600) risks.push({ metric: 'Core Temperature', value: r.temperature, status: 'warning' });

    if (r.coolantLevel < 20) risks.push({ metric: 'Coolant Level', value: r.coolantLevel, status: 'critical' });
    else if (r.coolantLevel < 40) risks.push({ metric: 'Coolant Level', value: r.coolantLevel, status: 'warning' });

    if (r.containment < 25) risks.push({ metric: 'Containment', value: r.containment, status: 'critical' });
    else if (r.containment < 50) risks.push({ metric: 'Containment', value: r.containment, status: 'warning' });

    if (r.radiation > 70) risks.push({ metric: 'Radiation', value: r.radiation, status: 'critical' });
    else if (r.radiation > 40) risks.push({ metric: 'Radiation', value: r.radiation, status: 'warning' });

    if (r.pressure > 80) risks.push({ metric: 'Pressure', value: r.pressure, status: 'critical' });
    else if (r.pressure > 60) risks.push({ metric: 'Pressure', value: r.pressure, status: 'warning' });

    if (r.stability < 25) risks.push({ metric: 'Stability', value: r.stability, status: 'critical' });
    else if (r.stability < 50) risks.push({ metric: 'Stability', value: r.stability, status: 'warning' });

    const mostAtRisk = [...this.state.subsystems]
      .filter(s => s.operational && s.health < 80)
      .sort((a, b) => a.health - b.health)[0] ?? null;

    sendTo(playerId, {
      type: 'diagnostic-result',
      risks,
      mostAtRiskSubsystem: mostAtRisk?.name ?? null,
    });
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

    // Update phase and notify if it changed
    const phaseChanged = updatePhase(this.state);
    if (phaseChanged) {
      broadcast(this.playerIds, {
        type: 'phase-change',
        phase: this.state.phase,
        phaseName: PHASE_NAMES[this.state.phase],
      });
    }

    // Run AI for disconnected roles
    this.tickAI();

    // Run reactor physics
    tickReactor(this.state);

    // Generate/process events
    tickEvents(this.state, this.rng);

    // Broadcast at reduced rate (5 Hz); keyframe every 3 s
    if (this.state.tickCount % STATE_BROADCAST_INTERVAL === 0) {
      const isKeyframe = this.state.tickCount % KEYFRAME_INTERVAL === 0;
      this.broadcastState(isKeyframe);
    }
  }

  private tickAI(): void {
    if (this.aiControlledRoles.size === 0) return;
    const r = this.state.reactor;

    if (this.aiControlledRoles.has(Role.ReactorOperator)) {
      // Nudge rods to keep temperature in a safe band
      if (r.temperature > 700) {
        r.controlRodPosition = Math.min(100, r.controlRodPosition + 5 * TICK_DELTA);
      } else if (r.temperature < 450 && r.powerOutput < 30) {
        r.controlRodPosition = Math.max(40, r.controlRodPosition - 2 * TICK_DELTA);
      }
    }

    if (this.aiControlledRoles.has(Role.Engineer)) {
      // Maintain safe coolant flow; trickle-refill if critically low
      if (r.coolantFlow < 55) {
        r.coolantFlow = Math.min(60, r.coolantFlow + 5 * TICK_DELTA);
      }
      if (r.coolantLevel < 15) {
        r.coolantLevel = Math.min(100, r.coolantLevel + 20 * TICK_DELTA);
      }
    }

    if (this.aiControlledRoles.has(Role.SafetyOfficer)) {
      // Keep shields at minimum safe level
      if (r.shieldStrength < 40) {
        r.shieldStrength = Math.min(60, r.shieldStrength + 2 * TICK_DELTA);
      }
      // Bleed off critical pressure
      if (r.pressure > 88) {
        r.pressure = Math.max(0, r.pressure - 5 * TICK_DELTA);
        r.containment = Math.max(0, r.containment - 0.5 * TICK_DELTA);
      }
    }
    // Technician AI: nothing safety-critical to automate
  }

  private broadcastState(isKeyframe: boolean): void {
    broadcast(this.playerIds, {
      type: 'game-state',
      state: this.state,
      isDelta: !isKeyframe,
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
        score: this.calculateScore(),
      },
    });
  }

  private calculateScore(): ScoreBreakdown {
    const config = DIFFICULTY_CONFIG[this.state.difficulty];
    const minutesSurvived = this.state.gameTime / 60;
    const avgPower = this.state.powerOutputTicks > 0
      ? this.state.powerOutputSum / this.state.powerOutputTicks
      : 0;
    const survived10Min = this.state.gameTime >= GAME_DURATION_S;

    const eventsScore = this.state.resolvedEventCount * SCORE_PER_EVENT;
    const playerScore = Math.round((MAX_PLAYERS / this.state.playerCount) * SCORE_PER_PLAYER);
    const powerScore = Math.round((avgPower / 100) * SCORE_MAX_POWER);
    const timeScore = Math.round(minutesSurvived * SCORE_PER_MINUTE);
    const survivalBonus = survived10Min ? SCORE_SURVIVAL_BONUS : 0;
    const emergencyPenalty = this.state.emergencyActionsUsed * SCORE_EMERGENCY_PENALTY;
    const lowPowerPenalty = Math.round(this.state.lowPowerPenalty);

    const subtotal = eventsScore + playerScore + powerScore + timeScore + survivalBonus
      - emergencyPenalty - lowPowerPenalty;
    const total = Math.max(0, Math.round(subtotal * config.multiplier));

    return {
      eventsScore,
      playerScore,
      powerScore,
      timeScore,
      survivalBonus,
      emergencyPenalty,
      lowPowerPenalty,
      subtotal,
      multiplier: config.multiplier,
      total,
      difficulty: this.state.difficulty,
    };
  }

  getState(): GameState {
    return this.state;
  }
}
