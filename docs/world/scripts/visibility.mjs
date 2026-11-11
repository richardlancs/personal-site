// How well each place in the park reads from the home view: for every
// sign (and the front of the places without one), at each screen size and
// sky, how much of it is on screen, in front of the page's own layers, not
// behind anything in the world, and how much fog is on it.
//
// Against `next dev` (the ?sky= preview and the scene handle are
// development-only):
//   npx next dev -p 3120
//   PLAYWRIGHT=…/playwright/index.mjs node docs/world/scripts/visibility.mjs http://localhost:3120 [outFile.json]
//   VIEWS=w390,w1440 SKIES=neutral-day,cloudy-day …   a subset
//   SHOTS=dir …   also saves a screenshot of each view and sky
//   DRIFT=1 …   also screenshots the home view with the clouds at several
//               points along their drift (desktop sizes)
//
// For each target it prints:
// - screen: the share of the sign inside the visible part of the world
//   (the viewport, below the corner controls, above a phone's sheet)
// - blocked: the share of points on it with something in the world in
//   front (raycast from the camera; leaf cards count whole, so trees read
//   a little worse than they look), and what that is
// - covered: the share under the page's own layers (the introduction, the
//   controls, the weather display, another place's tag), and which
// - fog: how much of the fog's colour is on it (three.js's linear fog:
//   smoothstep(near, far, depth))
// - px: how wide it is on screen, in CSS pixels
// Exits 1 if a primary sign (arcade, station, workshop) is under 85% on
// screen and clear, or carries more than MAX_FOG of fog.
import { mkdirSync, writeFileSync } from "node:fs";
import { launch } from "../../audit/scripts/pw.mjs";

const [base = "http://localhost:3120", outFile] = process.argv.slice(2);
const MAX_FOG = Number(process.env.MAX_FOG || 0.35);
const phone = { isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const allViews = {
  w320: { viewport: { width: 320, height: 640 }, ...phone },
  w390: { viewport: { width: 390, height: 844 }, ...phone },
  w430: { viewport: { width: 430, height: 932 }, ...phone },
  land: { viewport: { width: 844, height: 390 }, ...phone },
  land667: { viewport: { width: 667, height: 375 }, ...phone },
  w768: { viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 },
  w1024: { viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 },
  w1366: { viewport: { width: 1366, height: 768 } },
  w1440: { viewport: { width: 1440, height: 900 } },
  w1920: { viewport: { width: 1920, height: 1080 } },
};
const pick = (list, all) => (list ? Object.fromEntries(list.split(",").map((k) => [k, all[k]])) : all);
const views = pick(process.env.VIEWS, allViews);
const skies = (process.env.SKIES || "neutral-day,cloudy-day,rain-day,snow-day,clear-dusk,neutral-night").split(",");
const shots = process.env.SHOTS;
if (shots) mkdirSync(shots, { recursive: true });

// Each target in its place's own coordinates (buildings.ts, props.ts), and
// the place's spot in the park (Park.tsx: parkPlaces). Primary: the three
// places whose signs carry their name.
const targets = [
  { id: "arcade sign", place: { pos: [-10, 0, -33], ry: 0.37 }, at: [0, 5.2, 4.1], size: [7, 1.6], primary: true },
  { id: "station sign", place: { pos: [4, 0, -50], ry: 0 }, at: [0, 4.45, 3.69], size: [5.8, 1.4], primary: true },
  { id: "station tower", place: { pos: [4, 0, -48], ry: 0 }, at: [0, 13, 1.95], size: [2.4, 8] },
  { id: "workshop sign", place: { pos: [17.5, 0, -29], ry: -0.6 }, at: [0, 4.0, 4.09], size: [4.5, 1.12], primary: true },
  { id: "pavilion front", place: { pos: [-11, 0, -9], ry: 0.75 }, at: [0, 1.9, 2.45], size: [5.6, 2.4] },
  { id: "booth", place: { pos: [9.5, 0, 1.5], ry: -0.5 }, at: [0, 1.4, 0.65], size: [1.1, 2.2] },
  { id: "notice board", place: { pos: [4.25, 0, -1.6], ry: -0.18 }, at: [0, 1.54, 0.06], size: [2.0, 1.3] },
];

async function measure(page) {
  return page.evaluate((targets) => {
    const { THREE, get } = window.__world3d;
    const { scene, camera, size } = get();
    const fog = scene.fog;
    const ray = new THREE.Raycaster();
    const smooth = (a, b, x) => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    // What the world draws that could stand in front: visible, solid
    const solids = [];
    scene.traverseVisible((o) => {
      if (!o.isMesh || o.userData.atmos === "sky" || o.userData.hitbox) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m || m.visible === false || m.blending === THREE.AdditiveBlending || (m.transparent && m.opacity < 0.5)) return;
      solids.push(o);
    });
    const canvas = document.querySelector(".world3d-canvas canvas") || document.querySelector("canvas");
    const cr = canvas.getBoundingClientRect();
    // The page's layers over the world
    const shown = (el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.visibility !== "hidden" && Number(cs.opacity) > 0.4 && r.width > 0 && r.height > 0 && !el.closest("[data-hidden]");
    };
    const layers = [];
    for (const el of document.querySelectorAll(".world-controls > *")) if (shown(el)) layers.push({ name: "controls", el });
    for (const el of document.querySelectorAll(".park-intro :is(h1, p, a, button)")) if (shown(el)) layers.push({ name: "intro", el });
    for (const el of document.querySelectorAll(".world-label")) if (shown(el)) layers.push({ name: `tag:${el.dataset.anchor}`, el });
    const rects = layers.map((l) => ({ name: l.name, r: l.el.getBoundingClientRect() }));
    let ceiling = cr.top;
    for (const l of rects) if (l.name === "controls") ceiling = Math.max(ceiling, l.r.bottom);
    const sheet = [...document.querySelectorAll(".park-sheet")].find((el) => el.offsetParent !== null);
    const floor = Math.min(cr.bottom, window.innerHeight, sheet ? sheet.getBoundingClientRect().top + window.scrollY - window.scrollY : Infinity);

    const out = [];
    for (const t of targets) {
      const g = new THREE.Object3D();
      g.position.set(...t.place.pos);
      g.rotation.y = t.place.ry;
      g.updateMatrixWorld();
      const pts = [];
      const N = [7, 4];
      for (let i = 0; i < N[0]; i++)
        for (let j = 0; j < N[1]; j++) {
          const lx = t.at[0] + (i / (N[0] - 1) - 0.5) * t.size[0] * 0.9;
          const ly = t.at[1] + (j / (N[1] - 1) - 0.5) * t.size[1] * 0.85;
          pts.push(new THREE.Vector3(lx, ly, t.at[2] + 0.06).applyMatrix4(g.matrixWorld));
        }
      let onScreen = 0, blocked = 0, covered = 0, fogSum = 0;
      const blockers = {}, coverers = {};
      let minX = Infinity, maxX = -Infinity;
      for (const p of pts) {
        const ndc = p.clone().project(camera);
        const x = cr.left + ((ndc.x + 1) / 2) * size.width;
        const y = cr.top + ((1 - ndc.y) / 2) * size.height;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        const depth = -p.clone().applyMatrix4(camera.matrixWorldInverse).z;
        fogSum += fog ? smooth(fog.near, fog.far, depth) : 0;
        if (ndc.z > 1 || x < 0 || x > window.innerWidth || y < ceiling || y > floor) continue;
        onScreen++;
        const over = rects.find((l) => l.name !== "controls" && x >= l.r.left && x <= l.r.right && y >= l.r.top && y <= l.r.bottom);
        if (over) {
          covered++;
          coverers[over.name] = (coverers[over.name] || 0) + 1;
          continue;
        }
        const dir = p.clone().sub(camera.position);
        const dist = dir.length();
        ray.set(camera.position, dir.normalize());
        ray.far = dist - 0.25;
        const hit = ray.intersectObjects(solids, false)[0];
        if (hit) {
          blocked++;
          const m = Array.isArray(hit.object.material) ? hit.object.material[0] : hit.object.material;
          const name = hit.object.name || m.name || m.type;
          blockers[name] = (blockers[name] || 0) + 1;
        }
      }
      const n = pts.length;
      out.push({
        id: t.id,
        primary: !!t.primary,
        screen: onScreen / n,
        clear: (onScreen - blocked - covered) / n,
        blocked: blocked / n,
        covered: covered / n,
        fog: fogSum / n,
        px: Math.round(Math.max(0, maxX - minX) / 0.9),
        blockers,
        coverers,
      });
    }
    return { fog: fog && { near: +fog.near.toFixed(1), far: +fog.far.toFixed(1) }, targets: out };
  }, targets);
}

const browser = await launch();
const report = [];
const errors = [];
let failures = 0;
for (const [view, opts] of Object.entries(views)) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${view}: ${e}`));
  for (const sky of skies) {
    await page.goto(`${base}/?sky=${sky}`, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelector(".world3d")?.getAttribute("data-arrived") === "true" && window.__world3d, null, { timeout: 60000 });
    // The camera settles and the sky blends in
    await page.waitForTimeout(3500);
    const m = await measure(page);
    report.push({ view, sky, ...m });
    const line = m.targets
      .map((t) => {
        const bad = t.primary && (t.clear < 0.85 || t.fog > MAX_FOG);
        if (bad) failures++;
        const why = [...Object.entries(t.blockers), ...Object.entries(t.coverers)].map(([k, c]) => `${k}×${c}`).join(" ");
        return `  ${bad ? "✗" : " "} ${t.id.padEnd(15)} screen ${pct(t.screen)} clear ${pct(t.clear)} fog ${pct(t.fog)} ${String(t.px).padStart(4)}px ${why}`;
      })
      .join("\n");
    console.log(`${view} ${sky} (fog ${m.fog?.near}–${m.fog?.far})\n${line}`);
    if (shots) await page.screenshot({ path: `${shots}/${view}-${sky}.jpg`, type: "jpeg", quality: 75 });
  }
  if (process.env.DRIFT && !opts.isMobile) {
    // The clouds drift with the world's clock: step it along and look
    await page.goto(`${base}/?sky=neutral-day`, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelector(".world3d")?.getAttribute("data-arrived") === "true" && window.__wind, null, { timeout: 60000 });
    await page.waitForTimeout(3000);
    for (const t of [0, 400, 900, 1600, 2500, 4000, 6000, 9000]) {
      await page.evaluate((t) => (window.__wind.uTime.value = t), t);
      await page.waitForTimeout(300);
      if (shots) await page.screenshot({ path: `${shots}/drift-${view}-${t}.jpg`, type: "jpeg", quality: 70 });
    }
  }
  await ctx.close();
}
await browser.close();
function pct(x) {
  return `${Math.round(x * 100)}%`.padStart(4);
}
if (outFile) writeFileSync(outFile, JSON.stringify({ report, errors }, null, 1));
console.log(`${failures} primary sign problems; ${errors.length} page errors`, errors);
process.exit(failures ? 1 : 0);
