// Tracks work that an app reload would destroy (typing, generating, downloading).
const reasons = new Set<string>();
const idleListeners = new Set<() => void>();

export function setBusy(reason: string, busy: boolean): void {
  if (busy) {
    reasons.add(reason);
    return;
  }
  if (!reasons.delete(reason) || reasons.size > 0) return;
  [...idleListeners].forEach((l) => l());
}

export function isAppBusy(): boolean {
  return reasons.size > 0;
}

/** Calls `listener` each time the app goes from busy to idle. Returns an unsubscribe function. */
export function onAppIdle(listener: () => void): () => void {
  idleListeners.add(listener);
  return () => idleListeners.delete(listener);
}
