import { useState, useEffect, useRef, useCallback } from 'react';
import { startCooldownBus, getRemainingMs, subscribeToKey } from '../util/cooldownBus.js';

export function useCooldown(durationSec: number, actionKey: string) {
  const [remaining, setRemaining] = useState(() => Math.ceil(getRemainingMs(actionKey) / 1000));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const actionKeyRef = useRef(actionKey);
  actionKeyRef.current = actionKey;

  const startTick = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const r = Math.ceil(getRemainingMs(actionKeyRef.current) / 1000);
      setRemaining(r);
      if (r <= 0) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
      }
    }, 200);
  }, []);

  useEffect(() => {
    if (getRemainingMs(actionKey) > 0) {
      setRemaining(Math.ceil(getRemainingMs(actionKey) / 1000));
      startTick();
    }

    const unsub = subscribeToKey(actionKey, () => {
      setRemaining(Math.ceil(getRemainingMs(actionKey) / 1000));
      startTick();
    });

    return () => {
      unsub();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [actionKey, startTick]);

  const trigger = useCallback(() => {
    startCooldownBus(actionKey, durationSec * 1000);
    setRemaining(durationSec);
    startTick();
  }, [actionKey, durationSec, startTick]);

  return { remaining, isOnCooldown: remaining > 0, trigger };
}
