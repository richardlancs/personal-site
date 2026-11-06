// Builds something and leaves a mark on the performance timeline
// ("world:park" and so on), so the cost of each place shows in the
// browser's profiler and can be read back by a script
export function timed<T>(name: string, build: () => T): T {
  const start = performance.now();
  const result = build();
  performance.measure(`world:${name}`, { start, end: performance.now() });
  return result;
}

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
