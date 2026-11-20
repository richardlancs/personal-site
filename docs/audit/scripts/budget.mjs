// Performance budgets for a production build (run `npm run build` first).
// Fails (exit 1) when the built site grows past them, so growth is a
// decision rather than an accident. The numbers are bytes, gzip -9; the
// baseline they were set from is in docs/audit/performance.md.
//
//   node docs/audit/scripts/budget.mjs [.next]
//
// The site is one page, `/` (the Shanghai city: six stations, painted
// bands, no 3D). What's checked:
// - no three.js in anything `/` loads: its HTML's scripts, the chunks its
//   client components need (the route's client reference manifest), and
//   every chunk those name for loading later (followed until there are no
//   more). three.js is found by its renderer's name, `WebGLRenderer`.
// - initial JS of `/`: the scripts its HTML loads before anything else
// - all JS in the build, except the résumé viewer's
// - the CSS `/` links (totalCss: every visit's stylesheet); and the CSS
//   only the 3D city's pages (/city/*) load, on a budget of its own
//   (cityCss), so the city's styles never hide in, or grow, the 2D page's
// - the résumé viewer's JS (pdf.js, its worker and the viewer) and CSS,
//   loaded only when the résumé is opened: on its own budget, so it can't
//   hide growth in what every visit downloads
// - the 3D city (/city/*, opt-in): what its pages load that `/` never can
//   (city3dJs: the canvas, three.js, the scenes), taken out of totalJs so
//   totalJs keeps meaning the 2D site; within it the chunks that hold the
//   renderer (city3dChunk: three.js, R3F, the composer, City3D and the
//   riverside) and the largest section's scene (districtChunk); and
//   /city's own first load (cityInitialJs: the scripts its HTML loads)
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";

const dir = process.argv[2] || ".next";

// ---------- The limits ----------

// The home page's initial JS may be no larger than the park site's home
// was (the plan's rule): 200,848, measured 19 November 2026 by building
// 63d31e1 (the last park commit) with the same dependencies and this
// file's predecessor (initial JS of index.html). The city's `/` measured
// 198,092 then (finish pass), so this is about 1.4% headroom: growth past
// the old home is a decision, not an accident.
const HOME_JS_LIMIT = 200_848;
// About 5% over the city's measurement after round 2 (10,247, round 2's
// finish pass, 20 November 2026), set only after its dead CSS was gone:
// the unused interest-card rules, and the utilities Tailwind made for the
// unloaded park code, docs and tests (city.css, @source not). Round 2 had
// grown it from 9,646 to 10,653 (the four rebuilt sections, the progress
// line, figures, the list marker).
// Since the 3D city's pages (Task 2 of the 3D plan, 20 November 2026) this
// is the CSS `/` links, which then was every CSS file but the résumé's;
// the city's own stylesheet (app/city/city-pages.css) has CITY_CSS_LIMIT.
const TOTAL_CSS_LIMIT = 10_760;
// The /city pages' own layout (564 measured, Task 2); the canvas's panels
// and tags come later
const CITY_CSS_LIMIT = 2_000;
// About 5% over the city's measurement (203,727, the whole build's JS
// except the résumé viewer's, finish pass, 19 November 2026)
const TOTAL_JS_LIMIT = 214_000;

// The 3D city's (docs/superpowers/plans/2026-11-19-shanghai-3d.md,
// "Bundle budgets"), first measured on 20 November 2026 (wave 1 fix
// report: .superpowers/sdd/2026-11-19-shanghai-3d/wave1-fix-report.md)
// with the grey stand-ins, so the room above each reading is what the
// kit and the five scenes may add:
// - /city's first load, no more than the home page's
const CITY_INITIAL_JS_LIMIT = 200_848;
// - the renderer's chunks: the park's world chunk was 304,203 with three
//   and R3F; the plan's cap
const CITY3D_CHUNK_LIMIT = 330_000;
// - one section's scene, the largest
const DISTRICT_CHUNK_LIMIT = 32_000;
// - everything only /city loads
const CITY3D_JS_LIMIT = 480_000;

const budgets = {
  homeInitialJs: HOME_JS_LIMIT,
  cityInitialJs: CITY_INITIAL_JS_LIMIT,
  city3dChunk: CITY3D_CHUNK_LIMIT,
  districtChunk: DISTRICT_CHUNK_LIMIT,
  city3dJs: CITY3D_JS_LIMIT,
  totalJs: TOTAL_JS_LIMIT,
  totalCss: TOTAL_CSS_LIMIT,
  cityCss: CITY_CSS_LIMIT,
  // feature/baby-blue-glass-resume: pdfjs-dist 5.4.624's legacy build
  // (141,641), its worker (301,558) and the viewer (4,726)
  resumeJs: 470_000, // 447,925
  resumeCss: 2_500, // 1,915
};

// ---------- The build ----------

const die = (message) => {
  console.error(`budget: ${message}`);
  process.exit(2);
};
if (!existsSync(`${dir}/static`)) die(`no ${dir}/static: run \`npm run build\` first (or pass the build folder)`);
const homeHtml = `${dir}/server/app/index.html`;
if (!existsSync(homeHtml)) die(`no prerendered home page at ${homeHtml}: is \`/\` still static, and was the build a production build?`);

const gz = (file) => gzipSync(readFileSync(file), { level: 9 }).length;
const walk = (d, out = []) => {
  for (const name of readdirSync(d)) {
    const p = `${d}/${name}`;
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

const files = walk(`${dir}/static`);
// pdf.js and its worker name these; so does the viewer that drives them
const isResume = (f) => /WorkerMessageHandler|PDFWorker/.test(readFileSync(f, "utf8"));
const allJs = files.filter((f) => f.endsWith(".js")).map((f) => ({ f, gz: gz(f), resume: isResume(f) }));
const js = allJs.filter((c) => !c.resume);
const allCss = files.filter((f) => f.endsWith(".css")).map((f) => ({ f, gz: gz(f), resume: readFileSync(f, "utf8").includes(".resume-lock") }));
const css = allCss.filter((c) => !c.resume);

// ---------- What `/` loads ----------

// A chunk's path under the build folder, from however it's written
// ("/_next/static/chunks/a.js", "static/chunks/a.js")
const chunkPath = (ref) => `${dir}/${ref.replace(/^\/?_next\//, "").replace(/^\//, "")}`;
const html = readFileSync(homeHtml, "utf8");
// The stylesheets `/` links
const homeCss = new Set([...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="\/_next\/(static\/[^"]+\.css)"/g)].map((m) => `${dir}/${m[1]}`));
if (!homeCss.size) die(`${homeHtml} links no /_next/static stylesheet: has the HTML's form changed?`);
const initial = [...new Set([...html.matchAll(/<script[^>]*\ssrc="\/_next\/(static\/[^"]+\.js)"/g)].map((m) => m[1]))];
if (!initial.length) die(`${homeHtml} loads no /_next/static scripts: has the HTML's form changed? (this script reads <script src="/_next/static/…">)`);
const preloaded = [...html.matchAll(/<link[^>]*rel="preload"[^>]*as="script"[^>]*href="\/_next\/(static\/[^"]+\.js)"/g)].map((m) => m[1]);
const manifest = `${dir}/server/app/page_client-reference-manifest.js`;
const fromManifest = existsSync(manifest) ? [...readFileSync(manifest, "utf8").matchAll(/"\/?(?:_next\/)?(static\/chunks\/[^"]+\.js)"/g)].map((m) => m[1]) : [];
if (!existsSync(manifest)) console.log(`note: no ${manifest}; checking only the HTML's scripts and what they name`);

// Follow every chunk a loaded chunk names, until there are no new ones
function reach(initialRefs, pageRefs) {
  const out = new Map(); // path -> how it's reached
  const queue = [];
  const add = (ref, how) => {
    const p = chunkPath(ref);
    if (out.has(p) || !existsSync(p)) return;
    out.set(p, how);
    queue.push(p);
  };
  for (const ref of initialRefs) add(ref, "initial");
  for (const ref of pageRefs) add(ref, "page");
  while (queue.length) {
    const p = queue.shift();
    for (const m of readFileSync(p, "utf8").matchAll(/static\/chunks\/[\w.-]+\.js/g)) add(m[0], "on demand");
  }
  return out;
}
const scriptsOf = (page) => [...new Set([...page.matchAll(/<script[^>]*\ssrc="\/_next\/(static\/[^"]+\.js)"/g)].map((m) => m[1]))];
const preloadsOf = (page) => [...page.matchAll(/<link[^>]*rel="preload"[^>]*as="script"[^>]*href="\/_next\/(static\/[^"]+\.js)"/g)].map((m) => m[1]);
const manifestChunks = (file) => (existsSync(file) ? [...readFileSync(file, "utf8").matchAll(/"\/?(?:_next\/)?(static\/chunks\/[^"]+\.js)"/g)].map((m) => m[1]) : []);
const reached = reach(initial, [...preloaded, ...fromManifest]);

// ---------- What the 3D city's pages load ----------

const cityPages = ["city", ...(existsSync(`${dir}/server/app/city`) ? readdirSync(`${dir}/server/app/city`).filter((f) => f.endsWith(".html")).map((f) => `city/${f.slice(0, -5)}`) : [])];
if (!existsSync(`${dir}/server/app/city.html`)) die(`no prerendered ${dir}/server/app/city.html: is /city still static?`);
const cityHtml = readFileSync(`${dir}/server/app/city.html`, "utf8");
const cityInitial = scriptsOf(cityHtml);
const cityReached = new Map();
for (const page of cityPages) {
  const h = readFileSync(`${dir}/server/app/${page}.html`, "utf8");
  for (const [p, how] of reach(scriptsOf(h), [...preloadsOf(h), ...manifestChunks(`${dir}/server/app/${page}/page_client-reference-manifest.js`)])) if (!cityReached.has(p)) cityReached.set(p, how);
}
// Only the city's: what no 2D page can load
const cityOnly = [...cityReached.keys()].filter((p) => !reached.has(p) && !isResume(p));
const cityOnlySet = new Set(cityOnly);
const holdsRenderer = (p) => /WebGLRenderer/.test(readFileSync(p, "utf8"));
const rendererChunks = cityOnly.filter(holdsRenderer);
// A section's scene: a chunk that the canvas's own chunks (the ones loaded
// together with the renderer's, by the same import()) load on demand
// (sceneChunks.ts: one import() per place)
const names = (p) => new Set([...readFileSync(p, "utf8").matchAll(/static\/chunks\/[\w.-]+\.js/g)].map((m) => chunkPath(m[0])));
const canvasGroup = new Set(cityOnly.filter((p) => [...names(p)].some((n) => rendererChunks.includes(n))).flatMap((p) => [...names(p)]));
const districtChunks = cityOnly.filter((p) => !canvasGroup.has(p) && [...canvasGroup].some((g) => names(g).has(p)));

const THREE = /WebGLRenderer/; // also isWebGLRenderer, which minifying keeps
const withThree = [...reached].filter(([p]) => THREE.test(readFileSync(p, "utf8")));

const sumGz = (paths) => paths.reduce((sum, p) => sum + gz(p), 0);
const measured = {
  homeInitialJs: initial.reduce((sum, src) => sum + gz(`${dir}/${src}`), 0),
  cityInitialJs: cityInitial.reduce((sum, src) => sum + gz(`${dir}/${src}`), 0),
  city3dChunk: sumGz(rendererChunks),
  districtChunk: Math.max(0, ...districtChunks.map(gz)),
  city3dJs: sumGz(cityOnly),
  totalJs: js.filter((c) => !cityOnlySet.has(c.f)).reduce((a, b) => a + b.gz, 0),
  totalCss: css.filter((c) => homeCss.has(c.f)).reduce((a, b) => a + b.gz, 0),
  cityCss: css.filter((c) => !homeCss.has(c.f)).reduce((a, b) => a + b.gz, 0),
  resumeJs: allJs.filter((c) => c.resume).reduce((a, b) => a + b.gz, 0),
  resumeCss: allCss.filter((c) => c.resume).reduce((a, b) => a + b.gz, 0),
};

// ---------- The table ----------

let failed = false;
console.log(`${"".padEnd(4)} ${"budget".padEnd(18)} ${"gzip bytes".padStart(10)}   limit`);
for (const [key, limit] of Object.entries(budgets)) {
  const value = measured[key];
  const ok = value <= limit;
  failed ||= !ok;
  console.log(`${ok ? "ok  " : "OVER"} ${key.padEnd(18)} ${String(value).padStart(10)} / ${limit}`);
}
const noThree = withThree.length === 0;
failed ||= !noThree;
console.log(`${noThree ? "ok  " : "FAIL"} ${"no three.js on /".padEnd(18)} ${String(withThree.length).padStart(10)} chunk(s) with WebGLRenderer, of ${reached.size} that / can load`);
for (const [p, how] of withThree) console.log(`       ${p.slice(dir.length + 1)} (${how})`);
console.log(`/ loads ${initial.length} scripts at first, ${reached.size - initial.length} more with its components or on demand`);
console.log(`/city loads ${cityInitial.length} scripts at first; only the city loads ${cityOnly.length} chunks (${measured.city3dJs} B): the renderer's ${rendererChunks.length} (${rendererChunks.map((p) => `${p.slice(dir.length + 1)} ${gz(p)}`).join(", ")}), ${districtChunks.length} loaded by it (the scenes': ${districtChunks.map((p) => gz(p)).join(", ")})`);
process.exit(failed ? 1 : 0);
