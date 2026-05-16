import { useState, useEffect, useRef, useCallback } from 'react';
import { subscribeCooldown } from '../util/cooldownBus.js';

export function useCooldown(durationSec: number, actionKey: string) {
  const [remaining, setRemaining] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef(durationSec);
  durationRef.current = durationSec;

  const startCooldown = useCallback((overrideSec?: number) => {
    const sec = overrideSec ?? durationRef.current;
    setRemaining(Math.ceil(sec));
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    const unsub = subscribeCooldown(actionKey, startCooldown);
    return () => {
      unsub();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [actionKey, startCooldown]);

  return { remaining, isOnCooldown: remaining > 0, trigger: () => startCooldown() };
}
