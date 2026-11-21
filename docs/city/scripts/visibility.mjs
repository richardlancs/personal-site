// How well each section's sign reads from Home (/city, the rooftop painting:
// each section a spot with a small board, districts/lujiazui.def.ts): for every
// sign, at each screen size and sky, how much of it is on screen (below the
// top bar, above a phone's sheet), not covered by the page (the panel,
// another sign's link), not behind anything in the world, how much fog is
// on it, how wide it is; whether anything stands directly behind its word
// (its clear zone: the board's own mount, the ground and the water aside);
// and its link: laid over the board (its hit area, covering the board's
// middle), at least 44×44, 8px or more from the nearest other link. Where
// the links can't stand over the boards (html[data-city-tags="row"]), the
// row of keys in the panel is measured instead; where the boards gave way
// to the dock altogether (none drawn: a 1024 or 1280 × 720 window, a phone
// on its side), that is said and nothing is measured.
// (From docs/world/scripts/visibility.mjs, the park's.)
//
// Against `next dev` (the scene handle, window.__city, is development-only,
// or a build opened with ?perf):
//   PLAYWRIGHT=…/playwright/index.mjs node docs/city/scripts/visibility.mjs http://localhost:3101 [outFile.json]
//   VIEWS=w390,w1440 SKIES=neutral-day …   a subset
//   SHOTS=dir …   also saves a screenshot of each view and sky
//
// Exits 1 if a sign is under 85% on screen and clear, carries more than
// MAX_FOG of fog, is under 48 CSS px wide, has anything behind its word,
// or its link is under 44×44, closer than 8px to another, or (over the
// scene) not over its board.
import { mkdirSync, writeFileSync } from "node:fs";
import { launch } from "../../audit/scripts/pw.mjs";

const [base = "http://localhost:3101", outFile] = process.argv.slice(2);
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
const ids = ["about", "experience", "projects", "interests", "contact"];

async function measure(page) {
  return page.evaluate((ids) => {
    const { THREE, scene: get } = window.__city;
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
      // (the movers are small additive lights, not solids)
      if (!o.isMesh || o.userData.hitbox || o.name.startsWith("sign:") || o.name === "plate-movers") return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (!m || m.visible === false || (m.transparent && m.opacity < 0.5)) return;
      solids.push(o);
    });
    const canvas = document.querySelector(".city3d canvas");
    const cr = canvas.getBoundingClientRect();
    const shown = (el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.visibility !== "hidden" && Number(cs.opacity) > 0.4 && r.width > 0 && r.height > 0 && !el.closest("[data-hidden]");
    };
    const bar = document.querySelector(".top-bar").getBoundingClientRect();
    const panelEl = document.querySelector(".city-panel");
    const panel = panelEl.getBoundingClientRect();
    const narrow = matchMedia("(orientation: portrait), (max-width: 767px), (max-height: 480px)").matches;
    const ceiling = Math.max(cr.top, bar.bottom);
    const floor = Math.min(cr.bottom, window.innerHeight, narrow ? panel.top : Infinity);
    const idOf = (el) => (el.dataset.anchor ? el.dataset.anchor.slice(5) : el.getAttribute("href").split("/").pop());
    const tags = [...document.querySelectorAll(".city-tag, .city-key, .place-dock-key")].filter(shown).map((el) => ({ id: idOf(el), over: el.classList.contains("city-tag"), r: el.getBoundingClientRect() }));
    const layers = [...(narrow ? [] : [{ name: "panel", r: panel }]), ...tags.map((t) => ({ id: t.id, name: `tag:${t.id}`, r: t.r }))];
    // What may stand behind a board's word: its own mount, and the painting
    // it stands on (Home is painted: kit/plate.ts, the mesh "plate"; its
    // movers' lights)
    const behindOk = (o, id) => o.name === `mount:${id}` || o.name === "plate" || o.name === "plate-movers";
    const gap = (a, b) => {
      const dx = Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right));
      const dy = Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom));
      return Math.hypot(dx, dy);
    };

    const out = [];
    for (const id of ids) {
      const board = scene.getObjectByName(`sign:${id}`);
      if (!board) {
        out.push({ id, missing: true });
        continue;
      }
      board.updateMatrixWorld();
      const { width, height } = board.geometry.parameters;
      const pts = [];
      const word = [];
      const N = [7, 4];
      for (let i = 0; i < N[0]; i++)
        for (let j = 0; j < N[1]; j++)
          pts.push(new THREE.Vector3((i / (N[0] - 1) - 0.5) * width * 0.9, (j / (N[1] - 1) - 0.5) * height * 0.85, 0.02).applyMatrix4(board.matrixWorld));
      // The word: the middle 84% × 60% of the board
      for (let i = 0; i < 9; i++)
        for (let j = 0; j < 3; j++)
          word.push(new THREE.Vector3((i / 8 - 0.5) * width * 0.84, (j / 2 - 0.5) * height * 0.6, -0.3).applyMatrix4(board.matrixWorld));
      let onScreen = 0, blocked = 0, covered = 0, fogSum = 0, behind = 0;
      const behinders = {};
      const blockers = {}, coverers = {};
      for (const p of word) {
        const dir = p.clone().sub(camera.position).normalize();
        ray.set(p, dir);
        ray.far = fog ? fog.far : 1000;
        const hit = ray.intersectObjects(solids, false).find((h) => !behindOk(h.object, id));
        if (hit) {
          behind++;
          const name = hit.object.name || hit.object.material.type;
          behinders[name] = (behinders[name] || 0) + 1;
        }
      }
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
        const over = layers.find((l) => l.id !== id && x >= l.r.left && x <= l.r.right && y >= l.r.top && y <= l.r.bottom);
        if (over) {
          covered++;
          coverers[over.name] = (coverers[over.name] || 0) + 1;
          continue;
        }
        const dir = p.clone().sub(camera.position);
        const dist = dir.length();
        ray.set(camera.position, dir.normalize());
        ray.far = dist - 0.2;
        const hit = ray.intersectObjects(solids, false)[0];
        if (hit) {
          blocked++;
          const name = hit.object.name || hit.object.material.type;
          blockers[name] = (blockers[name] || 0) + 1;
        }
      }
      const n = pts.length;
      const tag = tags.find((t) => t.id === id);
      const others = tags.filter((t) => t.id !== id);
      // Over the scene, the link is the board's hit area: it holds the
      // board's middle
      const mid = new THREE.Vector3(0, 0, 0.02).applyMatrix4(board.matrixWorld).project(camera);
      const mx = cr.left + ((mid.x + 1) / 2) * size.width;
      const my = cr.top + ((1 - mid.y) / 2) * size.height;
      out.push({
        id,
        screen: onScreen / n,
        clear: (onScreen - blocked - covered) / n,
        fog: fogSum / n,
        px: Math.round(Math.max(0, maxX - minX) / 0.9),
        tag: tag ? { over: tag.over, onBoard: !tag.over || (mx >= tag.r.left && mx <= tag.r.right && my >= tag.r.top && my <= tag.r.bottom), w: Math.round(tag.r.width), h: Math.round(tag.r.height), nearest: others.length ? Math.round(Math.min(...others.map((o) => gap(tag.r, o.r)))) : null } : null,
        behind: behind / word.length,
        behinders,
        blockers,
        coverers,
      });
    }
    // (where the boards gave way to the dock, none drawn: Riverside.tsx)
    const given = window.__city.scene().scene.getObjectByName("home-signs")?.visible === false;
    return { fog: fog && { near: +fog.near.toFixed(1), far: +fog.far.toFixed(1) }, row: document.documentElement.dataset.cityTags === "row", given, targets: out };
  }, ids);
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
    await page.goto(`${base}/city?sky=${sky}`, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelector(".city3d")?.hasAttribute("data-arrived") && window.__city, null, { timeout: 60000 });
    await page.waitForTimeout(1200);
    const m = await measure(page);
    report.push({ view, sky, ...m });
    if (m.given) {
      // The boards gave way to the dock (a 1024 or 1280 × 720 window, a
      // phone on its side): nothing drawn to measure; the dock lists them
      console.log(`${view} ${sky}: the boards give way to the dock (none drawn)`);
      if (shots) await page.screenshot({ path: `${shots}/${view}-${sky}.jpg`, type: "jpeg", quality: 75 });
      continue;
    }
    const line = m.targets
      .map((t) => {
        if (t.missing) {
          failures++;
          return `  ✗ ${t.id} missing`;
        }
        const bad = t.clear < 0.85 || t.fog > MAX_FOG || t.px < 48 || t.behind > 0 || !t.tag || !t.tag.onBoard || t.tag.w < 44 || t.tag.h < 44 || (t.tag.nearest !== null && t.tag.nearest < 8);
        if (bad) failures++;
        const why = [...Object.entries(t.blockers), ...Object.entries(t.coverers), ...Object.entries(t.behinders).map(([k, c]) => [`behind:${k}`, c])].map(([k, c]) => `${k}×${c}`).join(" ");
        const tag = t.tag ? `${t.tag.over ? "link" : "key"} ${t.tag.w}×${t.tag.h} gap ${t.tag.nearest}${t.tag.onBoard ? "" : " NOT ON BOARD"}` : "no link";
        return `  ${bad ? "✗" : " "} ${t.id.padEnd(11)} screen ${pct(t.screen)} clear ${pct(t.clear)} fog ${pct(t.fog)} behind ${pct(t.behind)} ${String(t.px).padStart(4)}px  ${tag} ${why}`;
      })
      .join("\n");
    console.log(`${view} ${sky} (fog ${m.fog?.near}–${m.fog?.far}${m.row ? ", keys in a row" : ", links over the boards"})\n${line}`);
    if (shots) await page.screenshot({ path: `${shots}/${view}-${sky}.jpg`, type: "jpeg", quality: 75 });
  }
  await ctx.close();
}
await browser.close();
function pct(x) {
  return `${Math.round(x * 100)}%`.padStart(4);
}
if (outFile) writeFileSync(outFile, JSON.stringify({ report, errors }, null, 1));
console.log(`${failures} sign problems; ${errors.length} page errors`, errors);
process.exit(failures ? 1 : 0);
