// Runs `fn` when the browser is idle (or after `timeout` ms at the latest;
// Safari has no requestIdleCallback, so there it's a short timer).
// Returns a function that cancels it.
export function onIdle(fn: () => void, timeout = 2000): () => void {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
  if (typeof w.requestIdleCallback === "function") {
    const id = w.requestIdleCallback(fn, { timeout });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(fn, 200);
  return () => window.clearTimeout(id);
}
