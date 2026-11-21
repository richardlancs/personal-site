// What the 3D city costs to draw, per renderer tier and place, on a
// production build opened with ?perf (the measuring handle, window.__city),
// against the tiers' budgets (app/components/city3d/tiers.ts: TIERS); and
// that the 2D page (`/`) never fetches three.js or makes a WebGL context.
// (From docs/world/scripts/lighting-perf.mjs and lighting-blend.mjs, the
// park's, and the per-scene perf.mjs of the 3D plan's waves.)
//
//   npx next build && npx next start -p 3100
//   PLAYWRIGHT=…/playwright/index.mjs node docs/city/scripts/city3d-perf.mjs http://localhost:3100 [out.json]
//   ONLY=lujiazui,towers TIER=low SKY=rain-night …   a subset
//
// For each place and tier (high and low at 1440×900, mobile at 390×844
// DPR 2 with touch), at the place's resting pose, clear night (the most
// glow), after arrival and the sky's blend: every frame forced for 5 s
// in headless Chrome without vsync or a frame cap. Per frame: draw calls
// and triangles in every pass (the composer's, the reflection's), counted
// by wrapping the WebGL2 draw calls. Then the medians of those, the frame
// interval's p50 and p95, the programs, and the texture memory of what's
// showing (the kit's textureBytes() over every mesh not inside a hidden
// place). Frame times are relative (headless, this machine).
//
// Fails (exit 1) on any draw-call, triangle, texture or p95 figure over its
// tier's budget, a tier that isn't the one asked for, a console error, or,
// on `/`: any response holding WebGLRenderer, or any getContext("webgl"/
// "webgl2"), after loading, scrolling to the foot, and hovering and
// focusing the "3D city" key, wide and on a phone.
import { writeFileSync } from "node:fs";
import { TIERS } from "../../../app/components/city3d/tiers.ts";
import { launch } from "../../audit/scripts/pw.mjs";

const [base = "http://localhost:3100", outFile] = process.argv.slice(2);
const SKY = process.env.SKY || "clear-night";
const SECONDS = 5;
const pages = { lujiazui: "/city", towers: "/city/projects", metro: "/city/experience", "nanjing-road": "/city/interests", longtang: "/city/about", bund: "/city/contact" };
const views = {
  high: { width: 1440, height: 900, mobile: false },
  low: { width: 1440, height: 900, mobile: false },
  mobile: { width: 390, height: 844, mobile: true },
};
const only = process.env.ONLY?.split(",");
const onlyTier = process.env.TIER?.split(",");

// Counts every draw call and triangle the page's WebGL2 contexts make
const probe = () => {
  const w = window;
  w.__gpu = { draws: 0, tris: 0 };
  const TRI = 4;
  const p = WebGL2RenderingContext.prototype;
  const de = p.drawElements, da = p.drawArrays, dei = p.drawElementsInstanced, dai = p.drawArraysInstanced, dre = p.drawRangeElements;
  p.drawElements = function (mode, count, ...r) { w.__gpu.draws++; if (mode === TRI) w.__gpu.tris += count / 3; return de.call(this, mode, count, ...r); };
  p.drawRangeElements = function (mode, start, end, count, ...r) { w.__gpu.draws++; if (mode === TRI) w.__gpu.tris += count / 3; return dre.call(this, mode, start, end, count, ...r); };
  p.drawArrays = function (mode, first, count) { w.__gpu.draws++; if (mode === TRI) w.__gpu.tris += count / 3; return da.call(this, mode, first, count); };
  p.drawElementsInstanced = function (mode, count, type, off, n) { w.__gpu.draws++; if (mode === TRI) w.__gpu.tris += (count / 3) * n; return dei.call(this, mode, count, type, off, n); };
  p.drawArraysInstanced = function (mode, first, count, n) { w.__gpu.draws++; if (mode === TRI) w.__gpu.tris += (count / 3) * n; return dai.call(this, mode, first, count, n); };
  w.__frames = [];
  const tick = (now) => { w.__frames.push([now, w.__gpu.draws, w.__gpu.tris]); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
};

const failures = [];
const fail = (where, what) => {
  failures.push(`${where}: ${what}`);
  console.log(`FAIL ${where}: ${what}`);
};

const browser = await launch({ args: ["--disable-gpu-vsync", "--disable-frame-rate-limit"] });
const results = [];

// ---------- The places, per tier ----------
for (const [id, path] of Object.entries(pages)) {
  if (only && !only.includes(id)) continue;
  for (const [tier, v] of Object.entries(views)) {
    if (onlyTier && !onlyTier.includes(tier)) continue;
    const where = `${id} ${tier}`;
    const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: v.mobile ? 2 : 1, isMobile: v.mobile, hasTouch: v.mobile });
    await ctx.addInitScript(probe);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto(`${base}${path}?perf&tier=${tier}&sky=${SKY}`, { waitUntil: "load" });
    const arrived = await page.waitForSelector(".city3d[data-arrived]", { timeout: 90000 }).then(() => true, () => false);
    if (!arrived) {
      fail(where, "the place never arrived");
      await ctx.close();
      continue;
    }
    await page.evaluate((s) => window.__city.sky(s), SKY);
    // The 3 s blend to the sky, and the idle builds of the other places
    await page.waitForTimeout(v.mobile ? 6000 : 11000);
    const m = await page.evaluate(async (seconds) => {
      const c = window.__city;
      const st = c.scene();
      let go = true;
      const kick = () => {
        if (!go) return;
        st.invalidate();
        requestAnimationFrame(kick);
      };
      kick();
      const from = performance.now();
      await new Promise((res) => setTimeout(res, seconds * 1000));
      go = false;
      const f = window.__frames.filter(([t]) => t >= from);
      const med = (a) => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
      const dts = f.slice(1).map(([t], i) => t - f[i][0]).sort((a, b) => a - b);
      const { gl, scene } = st;
      // What's showing: everything not inside a hidden place
      const showing = (o) => {
        for (let p = o; p; p = p.parent) if (!p.visible && p.name.startsWith("scene:")) return false;
        return true;
      };
      const visibleRoot = { traverse: (cb) => scene.traverse((o) => showing(o) && cb(o)) };
      return {
        frames: f.length,
        p50: +dts[Math.floor(dts.length / 2)].toFixed(2),
        p95: +dts[Math.floor(dts.length * 0.95)].toFixed(2),
        draws: med(f.slice(1).map(([, d], i) => d - f[i][1])),
        tris: Math.round(med(f.slice(1).map(([, , t], i) => t - f[i][2]))),
        programs: gl.info.programs.length,
        texMB: +(c.textureBytes(visibleRoot) / 2 ** 20).toFixed(2),
        texLiveMB: +(c.textureBytes() / 2 ** 20).toFixed(2),
        built: scene.children.filter((o) => o.name.startsWith("scene:")).length,
        tier: c.tier,
        dpr: gl.getPixelRatio(),
      };
    }, SECONDS);
    const b = TIERS[tier];
    const row = { scene: id, tier, ...m, errors: errors.slice(0, 3) };
    results.push(row);
    console.log(
      `${id.padEnd(13)} ${tier.padEnd(7)} draws ${String(m.draws).padStart(4)}/${b.drawCalls}  tris ${String(m.tris).padStart(8)}/${b.triangles}  tex ${String(m.texMB).padStart(6)}/${b.textureMB} MB  programs ${m.programs}  p50 ${m.p50}  p95 ${m.p95}/${b.frameMs} ms  (${m.frames} frames, dpr ${m.dpr})`,
    );
    if (m.tier !== tier) fail(where, `drew at tier ${m.tier}`);
    if (m.draws > b.drawCalls) fail(where, `${m.draws} draw calls, over ${b.drawCalls}`);
    if (m.tris > b.triangles) fail(where, `${m.tris} triangles, over ${b.triangles}`);
    if (m.texMB > b.textureMB) fail(where, `${m.texMB} MB of textures, over ${b.textureMB}`);
    if (m.p95 > b.frameMs) fail(where, `p95 ${m.p95} ms, over ${b.frameMs}`);
    for (const e of errors) fail(where, `console: ${e.slice(0, 200)}`);
    await ctx.close();
  }
}

// ---------- The 2D page: no three.js, no WebGL context ----------
const home = {};
if (!only && !onlyTier) {
  for (const [name, v] of Object.entries({ wide: { width: 1440, height: 900, mobile: false }, phone: { width: 390, height: 844, mobile: true } })) {
    const where = `/ ${name}`;
    const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: v.mobile ? 2 : 1, isMobile: v.mobile, hasTouch: v.mobile });
    await ctx.addInitScript(() => {
      window.__contexts = [];
      for (const C of [HTMLCanvasElement, typeof OffscreenCanvas !== "undefined" ? OffscreenCanvas : null].filter(Boolean)) {
        const get = C.prototype.getContext;
        C.prototype.getContext = function (type, ...r) {
          if (/webgl/i.test(type)) window.__contexts.push(type);
          return get.call(this, type, ...r);
        };
      }
    });
    const page = await ctx.newPage();
    const three = [];
    const pending = [];
    let responses = 0;
    page.on("response", (res) => {
      responses++;
      const type = res.headers()["content-type"] || "";
      if (!/javascript|json|text\/x-component|text\/plain|octet-stream/.test(type) && !/\.js(\?|$)/.test(res.url())) return;
      pending.push(
        res.text().then(
          (body) => body.includes("WebGLRenderer") && three.push(res.url()),
          () => {},
        ),
      );
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto(`${base}/`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    // Down the whole page, a screen at a time, so every band mounts
    for (let i = 0; i < 60; i++) {
      const done = await page.evaluate(() => {
        scrollBy(0, innerHeight * 0.8);
        return innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
      });
      await page.waitForTimeout(120);
      if (done) break;
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(300);
    const key = page.getByRole("link", { name: /3D city/i }).first();
    let keyed = false;
    if (await key.count()) {
      if (!v.mobile) await key.hover().catch(() => {});
      await key.focus().catch(() => {});
      keyed = true;
    }
    // Idle prefetches and anything the hover or focus starts
    await page.waitForTimeout(4000);
    await Promise.all(pending);
    const contexts = await page.evaluate(() => window.__contexts);
    home[name] = { responses, three, contexts, keyed, errors: errors.slice(0, 3) };
    console.log(`/ ${name.padEnd(5)} ${responses} responses, ${three.length} with WebGLRenderer, ${contexts.length} WebGL contexts${keyed ? "" : " (no \"3D city\" key found)"}`);
    if (!keyed) fail(where, 'no "3D city" key to hover and focus');
    for (const u of three) fail(where, `a response holds WebGLRenderer: ${u}`);
    if (contexts.length) fail(where, `getContext(${contexts.join(", ")})`);
    for (const e of errors) fail(where, `console: ${e.slice(0, 200)}`);
    await ctx.close();
  }
}

await browser.close();
if (outFile) writeFileSync(outFile, JSON.stringify({ base, sky: SKY, date: new Date().toISOString(), results, home, failures }, null, 2));
console.log(failures.length ? `\n${failures.length} failure(s)` : "\nall inside budget");
process.exit(failures.length ? 1 : 0);
