// What the world costs to draw at rest, uncapped: Chrome without vsync or
// a frame-rate limit, so the frame rate shows the frame's real cost. Also
// counts, from the WebGL calls themselves (so it works on a production
// build): draw calls per frame, shader compiles, and the light counts the
// shaders were built with. Run it on a production build:
//   PLAYWRIGHT=…/playwright/index.mjs node docs/world/scripts/lighting-perf.mjs http://localhost:3302 <out.json> [runs=3] [routes=/,/contact]
import { writeFileSync } from "node:fs";
import { launch } from "../../audit/scripts/pw.mjs";

const [base, out, runsArg = "3", routesArg = "/,/contact"] = process.argv.slice(2);
const runs = Number(runsArg);
const routes = routesArg.split(",");
const views = [
  { name: "desktop", width: 1440, height: 900, mobile: false },
  { name: "phone", width: 390, height: 844, mobile: true },
];

// Runs in the page before anything else: counts draws, compiles and lights
const probe = () => {
  const w = window;
  w.__gpu = { draws: 0, compiles: 0, lights: {} };
  const wrap = (proto, name, fn) => {
    const orig = proto[name];
    if (!orig) return;
    proto[name] = function (...args) {
      fn(...args);
      return orig.apply(this, args);
    };
  };
  for (const C of [WebGL2RenderingContext, WebGLRenderingContext]) {
    for (const n of ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced"]) wrap(C.prototype, n, () => w.__gpu.draws++);
    wrap(C.prototype, "compileShader", () => w.__gpu.compiles++);
    // three writes the light counts into the arrays' sizes
    wrap(C.prototype, "shaderSource", (_, src) => {
      for (const k of ["directionalLights", "pointLights", "spotLights", "hemisphereLights", "directionalShadowMap", "spotShadowMap", "pointShadowMap"]) {
        const m = src.match(new RegExp(`uniform \\w+ ${k}\\[ *(\\d+) *\\]`));
        if (m) w.__gpu.lights[k] = Math.max(w.__gpu.lights[k] ?? 0, Number(m[1]));
      }
    });
  }
  w.__frames = [];
  const tick = (now) => {
    w.__frames.push([now, w.__gpu.draws]);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const browser = await launch({ args: ["--disable-gpu-vsync", "--disable-frame-rate-limit"] });
const results = [];
for (const view of views)
  for (const route of routes)
    for (let run = 1; run <= runs; run++) {
      const ctx = await browser.newContext({ viewport: { width: view.width, height: view.height }, deviceScaleFactor: view.mobile ? 2 : 1, isMobile: view.mobile, hasTouch: view.mobile });
      await ctx.addInitScript(probe);
      const page = await ctx.newPage();
      await page.goto(base + route, { waitUntil: "load" });
      await page.waitForFunction(() => document.querySelector(".world3d")?.getAttribute("data-arrived") === "true", null, { timeout: 40000 }).catch(() => {});
      // On desktop the other places are built in idle time after arriving
      // (World3D.tsx): wait until that's done, so rest is rest
      await page.waitForTimeout(view.mobile ? 6000 : 32000);
      const r = await page.evaluate(async () => {
        const from = performance.now();
        const c0 = window.__gpu.compiles;
        await new Promise((res) => setTimeout(res, 5000));
        const f = window.__frames.filter(([t]) => t >= from);
        const dts = f.slice(1).map(([t], i) => t - f[i][0]).sort((a, b) => a - b);
        const draws = f.slice(1).map(([, d], i) => d - f[i][1]).sort((a, b) => a - b);
        return {
          fps: Math.round((f.length / ((f.at(-1)[0] - f[0][0]) / 1000)) * 10) / 10,
          p50ms: Math.round(dts[Math.floor(dts.length / 2)] * 100) / 100,
          p95ms: Math.round(dts[Math.floor(dts.length * 0.95)] * 100) / 100,
          drawsPerFrame: draws[Math.floor(draws.length / 2)],
          compilesAtRest: window.__gpu.compiles - c0,
          compilesTotal: window.__gpu.compiles,
          lights: window.__gpu.lights,
          sky: [document.querySelector(".world3d")?.dataset.skyPreset, document.querySelector(".world3d")?.dataset.skyDaylight],
        };
      });
      const result = { view: view.name, route, run, ...r };
      results.push(result);
      console.log(JSON.stringify(result));
      await ctx.close();
    }
await browser.close();
writeFileSync(out, JSON.stringify({ base, date: new Date().toISOString(), results }, null, 1));
