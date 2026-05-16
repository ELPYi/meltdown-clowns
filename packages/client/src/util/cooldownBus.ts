type Callback = (remainingSec: number) => void;
const listeners = new Map<string, Set<Callback>>();

export function subscribeCooldown(key: string, cb: Callback): () => void {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(cb);
  return () => listeners.get(key)?.delete(cb);
}

export function emitCooldown(key: string, remainingSec: number): void {
  listeners.get(key)?.forEach(cb => cb(remainingSec));
}
