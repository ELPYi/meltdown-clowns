const endTimes = new Map<string, number>();
const listeners = new Map<string, Set<() => void>>();

export function startCooldownBus(key: string, durationMs: number): void {
  endTimes.set(key, Date.now() + durationMs);
  listeners.get(key)?.forEach(cb => cb());
}

export function getRemainingMs(key: string): number {
  return Math.max(0, (endTimes.get(key) ?? 0) - Date.now());
}

export function subscribeToKey(key: string, cb: () => void): () => void {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(cb);
  return () => listeners.get(key)?.delete(cb);
}
