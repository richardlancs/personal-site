// Frame timing and main-thread work of the world, on a running production
// build: the first load of the park, the walk-in, the park at rest, and a
// journey from the park to the workshop. Separate from Lighthouse, which
// measures loading, not animation.
//
//   PLAYWRIGHT=/path/to/playwright/index.mjs \
//     node docs/audit/scripts/trace.mjs <baseUrl> <out.json> [runs=3] [cpu=1,4]
//
// Each run is a fresh browser context (empty cache). For every view
// (1440x1000 desktop, 390x844 touch phone) and CPU slowdown (CDP
// Emulation.setCPUThrottlingRate) it records:
// - the world's own marks (world:first-frame, world:<scene>, park:<stage>,
//   tex:<name>) from the performance timeline
// - long tasks and long animation frames (with the scripts behind them)
// - requestAnimationFrame deltas, so dropped frames show as long deltas
import { writeFileSync } from "node:fs";
import { launch } from "./pw.mjs";

const [base, out, runsArg = "3", cpuArg = "1,4"] = process.argv.slice(2);
if (!base || !out) {
  console.error("usage: node trace.mjs <baseUrl> <out.json> [runs] [cpu]");
  process.exit(2);
}
const runs = Number(runsArg);
const rates = cpuArg.split(",").map(Number);
const views = [
  { name: "desktop", width: 1440, height: 1000, mobile: false },
  { name: "mobile", width: 390, height: 844, mobile: true },
];

// Runs in the page before anything else
const probe = () => {
  const w = window;
  w.__frames = [];
  w.__long = [];
  w.__loaf = [];
  let last = performance.now();
  const tick = (now) => {
    w.__frames.push([now, now - last]);
    last = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) w.__long.push([e.startTime, e.duration]);
    }).observe({ type: "longtask", buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries())
        w.__loaf.push({
          start: e.startTime,
          duration: e.duration,
          blocking: e.blockingDuration,
          scripts: e.scripts.map((s) => ({ invoker: s.invoker, src: (s.sourceURL || "").split("/").pop(), fn: s.sourceFunctionName, duration: s.duration })),
        });
    }).observe({ type: "long-animation-frame", buffered: true });
  } catch {}
};

const pct = (xs, p) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

function frameStats(frames, from, to) {
  const d = frames.filter(([t]) => t >= from && t < to).map(([, dt]) => dt);
  if (!d.length) return null;
  const span = (to - from) / 1000;
  return {
    frames: d.length,
    fps: r1(d.length / span),
    p50: r1(pct(d, 50)),
    p95: r1(pct(d, 95)),
    max: r1(Math.max(...d)),
    over50: d.filter((x) => x > 50).length,
    over100: d.filter((x) => x > 100).length,
  };
}
function longStats(long, from, to) {
  const l = long.filter(([t]) => t >= from && t < to);
  return { count: l.length, total: Math.round(l.reduce((a, [, d]) => a + d, 0)), max: Math.round(Math.max(0, ...l.map(([, d]) => d))), blocking: Math.round(l.reduce((a, [, d]) => a + Math.max(0, d - 50), 0)) };
}
function topScripts(loaf, from, to) {
  const by = new Map();
  for (const f of loaf.filter((f) => f.start >= from && f.start < to))
    for (const s of f.scripts) {
      const key = `${s.invoker} ${s.src}`;
      by.set(key, (by.get(key) || 0) + s.duration);
    }
  return [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => [k, Math.round(v)]);
}

const browser = await launch();
const results = [];
for (const view of views)
  for (const rate of rates)
    for (let run = 1; run <= runs; run++) {
      const ctx = await browser.newContext({ viewport: { width: view.width, height: view.height }, deviceScaleFactor: view.mobile ? 2 : 1, isMobile: view.mobile, hasTouch: view.mobile });
      await ctx.addInitScript(probe);
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      const cdp = await ctx.newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate });
      await page.goto(base + "/", { waitUntil: "load" });
      await page.waitForTimeout(9000);
      const load = await page.evaluate(() => {
        const entries = performance.getEntries().filter((e) => /^(world|park|tex):/.test(e.name));
        const nav = performance.getEntriesByType("navigation")[0];
        const fcp = performance.getEntriesByName("first-contentful-paint")[0];
        return {
          entries: entries.map((e) => [e.name, e.startTime, e.duration]),
          domContentLoaded: nav?.domContentLoadedEventEnd,
          fcp: fcp?.startTime,
          frames: window.__frames,
          long: window.__long,
          loaf: window.__loaf,
          scene: document.querySelector(".world3d")?.getAttribute("data-scene"),
          heap: performance.memory?.usedJSHeapSize,
        };
      });
      const firstFrame = load.entries.find(([n]) => n === "world:first-frame")?.[1] ?? null;
      const measures = Object.fromEntries(load.entries.filter(([n]) => n !== "world:first-frame" && !n.startsWith("tex:")).map(([n, , d]) => [n, Math.round(d)]));
      const tex = Math.round(load.entries.filter(([n]) => n.startsWith("tex:")).reduce((a, [, , d]) => a + d, 0));
      const end = load.frames.at(-1)?.[0] ?? 9000;
      const ff = firstFrame ?? 0;

      // A journey: the park to the workshop, by its link in the Places menu
      const t0 = await page.evaluate(() => {
        const a = document.querySelector('#places-menu a[href="/projects"]');
        const now = performance.now();
        a?.click();
        return now;
      });
      await page.waitForTimeout(4000);
      const journey = await page.evaluate((t0) => ({
        frames: window.__frames.filter(([t]) => t >= t0),
        long: window.__long.filter(([t]) => t >= t0),
        loaf: window.__loaf.filter((f) => f.start >= t0),
        scene: document.querySelector(".world3d")?.getAttribute("data-scene"),
        built: performance.getEntriesByName("world:workshop").map((e) => [e.startTime, e.duration]),
      }), t0);

      const result = {
        view: view.name,
        cpu: rate,
        run,
        fcp: r1(load.fcp),
        firstFrame: r1(firstFrame),
        measures,
        texturesMs: tex,
        heapMB: load.heap ? r1(load.heap / 1e6) : null,
        longTasks: { beforeFirstFrame: longStats(load.long, 0, ff), walkIn: longStats(load.long, ff, ff + 3000), rest: longStats(load.long, ff + 5000, end) },
        frames: { walkIn: frameStats(load.frames, ff, ff + 3000), rest: frameStats(load.frames, ff + 5000, end) },
        scriptsBeforeFirstFrame: topScripts(load.loaf, 0, ff + 1),
        journey: {
          scene: journey.scene,
          frames: frameStats(journey.frames, t0, t0 + 3000),
          long: longStats(journey.long, t0, t0 + 3000),
          workshopBuiltDuringJourney: journey.built.filter(([t]) => t >= t0).map(([, d]) => Math.round(d)),
          scripts: topScripts(journey.loaf, t0, t0 + 3000),
        },
        errors,
      };
      results.push(result);
      console.log(JSON.stringify(result));
      await ctx.close();
    }
await browser.close();
writeFileSync(out, JSON.stringify({ base, date: new Date().toISOString(), results }, null, 1));
