import React from 'react';
import { GameEvent, Role } from '@meltdown/shared';
import { useGameStore } from '../../stores/game-store.js';
import { playClick } from '../../audio/sound-manager.js';

interface Props {
  events: GameEvent[];
  gameTime: number;
  filterRole?: Role;
}

export function EventQueue({ events, gameTime, filterRole }: Props) {
  const sendAction = useGameStore(s => s.sendAction);

  const activeEvents = events
    .filter(e => !e.resolved && !e.consequenceApplied)
    .filter(e => !filterRole || e.targetRole === filterRole)
    .sort((a, b) => a.deadline - b.deadline);

  if (activeEvents.length === 0) {
    return (
      <div className="event-queue">
        <div style={{ padding: 16, color: 'var(--text-dim)', fontSize: '0.8rem', textAlign: 'center' }}>
          All systems nominal
        </div>
      </div>
    );
  }

  return (
    <div className="event-queue">
      {activeEvents.map(event => {
        const timeLeft = Math.max(0, event.deadline - gameTime);
        const urgent = timeLeft < 5;

        return (
          <div
            key={event.id}
            className={`event-item severity-${event.severity}`}
            style={urgent ? { animation: 'blink 0.5s infinite' } : undefined}
          >
            <div>
              <div className="event-title">{event.title}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                {event.description}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="event-timer" style={{ color: urgent ? 'var(--danger)' : 'var(--warning)' }}>
                {timeLeft.toFixed(0)}s
              </span>
              <button
                className="btn btn-small"
                onClick={() => { playClick(); sendAction({ kind: 'resolve-event', eventId: event.id }); }}
              >
                Fix
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
