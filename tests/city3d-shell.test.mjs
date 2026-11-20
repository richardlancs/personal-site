// The 3D city's shell, canvas, Director, post-processing and grey riverside
// (docs/superpowers/plans/2026-11-19-shanghai-3d.md, Task 5), at the source
// level; the outline of every /city page against a running server
// (SMOKE_URL, as tests/smoke.test.mjs); and the arrival re-run on every
// route (components/ui/arrive.ts, GlassPress.tsx).
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { FLAT_QUERY } from "../app/components/city3d/flat.ts";
import { pageSections } from "../app/sections/registry.ts";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const walk = (dir) =>
  readdirSync(`${root}${dir}`, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));
const noComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

const shell = read("app/components/city3d/CityShell.tsx");
const city = read("app/components/city3d/City3D.tsx");
const post = read("app/components/city3d/Post.tsx");
const riverside = read("app/components/city3d/Riverside.tsx");

test("the shell probes WebGL2, handles a lost context, waits for Save-Data, and loads the canvas client-only", () => {
  assert.match(shell, /getContext\("webgl2"\)/);
  assert.match(shell, /webglcontextlost/);
  assert.match(shell, /preventDefault\(\)/);
  assert.match(shell, /webglcontextrestored/);
  assert.match(shell, /saveData/);
  assert.match(shell, /Load the 3D city/);
  assert.match(shell, /dynamic\(\s*\(\)\s*=>\s*import\("\.\/City3D"\),\s*\{[^}]*ssr:\s*false/);
  // The modes the CSS keys on
  for (const mode of ["on", "fallback", "saving", "lost"]) assert.match(shell, new RegExp(`"${mode}"`));
  assert.match(shell, /data-city3d/);
  // The tier from tiers.ts, read off the probe's context
  assert.match(shell, /pickTier\(/);
  assert.match(shell, /readTierInput\(/);
  // Nothing 3D in the shell's own chunk: three and the canvas come with City3D
  assert.doesNotMatch(shell, /from "(three|@react-three\/[^"]+|postprocessing|\.\/City3D)"/);
  assert.doesNotMatch(read("app/city/layout.tsx"), /from "[^"]*(three|City3D|postprocessing)[^"]*"/);
});

test("the frame loop stops when hidden, before the shaders are warm and under the résumé, and draws on demand", () => {
  const loop = city.match(/frameloop=\{([^}]*)\}/)[1];
  assert.match(loop, /"never"/);
  assert.match(loop, /"demand"/);
  assert.match(loop, /covered/);
  assert.match(loop, /visible/);
  assert.match(loop, /warm/);
  // covered: html.resume-lock, watched
  assert.match(city, /classList\.contains\("resume-lock"\)/);
  assert.match(city, /new MutationObserver/);
  assert.match(city, /visibilitychange/);
});

test("still view cuts and holds still; drag-to-look only on fine pointers off the mobile tier", () => {
  // The plan's journey becomes one swap when still
  assert.match(city, /if \(holdingStill\(\)\) \{\s*\/\/ Still view: a cut, no travel\s*s\.queue = \[\{ kind: "swap"/);
  // Turned on mid-journey: cut, parallax zeroed
  assert.match(city, /if \(!still \|\| !s\.started\) return;[\s\S]*?s\.parallax\.set\(0, 0\)/);
  // No parallax or drag while still
  assert.match(city, /const resting = !r && !s\.queue\.length && !reduce;/);
  assert.match(city, /if \(tier === "mobile" \|\| matchMedia\("\(pointer: coarse\)"\)\.matches\) return;/);
});

test("the mobile tier tone-maps on the renderer; the desktop tiers through Post", () => {
  assert.match(city, /gl\.toneMapping = THREE\.NeutralToneMapping;\s*gl\.toneMappingExposure = 1\.12;/);
  assert.match(city, /dpr=\{t\.dpr\}/);
  assert.match(city, /antialias: t\.canvasAntialias/);
});

test("Post: nothing on mobile, only EffectComposer, Bloom and ToneMapping, neutral", () => {
  assert.match(post, /if \(tier === "mobile"[^)]*\) return null;/);
  const imported = post.match(/import \{([^}]*)\} from "@react-three\/postprocessing"/)[1].split(",").map((s) => s.trim()).sort();
  assert.deepEqual(imported, ["Bloom", "EffectComposer", "ToneMapping"]);
  assert.equal((post.match(/from "@react-three\/postprocessing"/g) ?? []).length, 1);
  assert.match(post, /ToneMappingMode\.NEUTRAL/);
  assert.match(post, /prefers-contrast: more/);
  assert.match(post, /HalfFloatType/);
});

test("nothing under city3d imports drei or names magenta or amber", () => {
  for (const f of walk("app/components/city3d")) {
    const src = read(f);
    assert.doesNotMatch(src, /@react-three\/drei/, f);
    assert.doesNotMatch(src, /\b(magenta|amber)\b/i, f);
  }
});

test("the narrow layout's media query in the city's CSS is FLAT_QUERY", () => {
  const css = read("app/city/city-pages.css");
  const m = css.match(/@media ([^{]*?)\s*\/\* FLAT_QUERY \*\/\s*\{/);
  assert.ok(m, "a media query marked FLAT_QUERY");
  assert.equal(m[1].trim(), FLAT_QUERY);
});

test("six places, each with a plate frame, framed on the right; the riverside has no spot lights", async () => {
  const { scenes, DISTRICT_LIGHTS, routesFromRiverside } = await import("../app/components/city3d/scenes.ts");
  assert.deepEqual(Object.keys(scenes).sort(), ["bund", "longtang", "lujiazui", "metro", "nanjing-road", "towers"]);
  for (const [id, def] of Object.entries(scenes)) {
    assert.ok(def.plateFrame && def.plateFrame.pos.length === 3 && def.plateFrame.target.length === 3 && def.plateFrame.fov > 0, id);
    assert.equal(def.frame, "right", id);
    assert.ok(def.fov > 0, id);
  }
  assert.equal(DISTRICT_LIGHTS.lujiazui, 0);
  assert.deepEqual(Object.keys(routesFromRiverside).sort(), ["bund", "longtang", "metro", "nanjing-road", "towers"]);
  // Places far apart, past each other's fog
  const offsets = Object.values(scenes).map((d) => d.offset[0]).sort((a, b) => a - b);
  for (let i = 1; i < offsets.length; i++) assert.ok(offsets[i] - offsets[i - 1] >= 400);
});

test("the signs and tags say each section's title from the registry, never retyped", () => {
  const titles = pageSections.map((s) => s.title);
  const literals = [...noComments(riverside).matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g)].map((m) => m[1] ?? m[2] ?? m[3]);
  for (const t of titles) assert.ok(!literals.includes(t), `Riverside.tsx retypes "${t}"`);
  assert.match(riverside, /section\(s\.id\)\.title/);
  // The tags: links to each section's /city page, named by its title
  assert.match(city, /<Link key=\{s\.id\} className="glass city-tag" href=\{cityPath\(s\.id\)\}[^>]*>\s*\{section\(s\.id\)\.title\}/);
  // The anchors the visibility script and the tags use
  assert.match(riverside, /anchors\.set\(`sign:\$\{s\.id\}`/);
  // Each sign's Hitbox goes through cityPath
  assert.match(riverside, /onSelect=\{\(\) => navigate\(cityPath\(s\.id\)\)\}/);
});

test("the signs stand left to right About, Experience, Projects, Interests, Contact", async () => {
  // The bearings, read from the table in the source
  const order = [...riverside.matchAll(/\{ id: "(\w+)", bearing: (-?[\d.]+)/g)].map((m) => [m[1], Number(m[2])]);
  assert.deepEqual(order.map((o) => o[0]), ["about", "experience", "projects", "interests", "contact"]);
  for (let i = 1; i < order.length; i++) assert.ok(order[i][1] > order[i - 1][1]);
});

test("every /city page passes where=\"3d\" to its section, so the outline runs on", () => {
  const page = read("app/components/city3d/CityPage.tsx");
  for (const name of ["Hero", "About", "Projects", "Experience", "Interests", "Contact"]) assert.match(page, new RegExp(`<${name} where="3d" />`), name);
});

test("arrival is set up again on every route, the previous observer let go, with a safety net", () => {
  const press = read("app/components/ui/GlassPress.tsx");
  assert.match(press, /const pathname = usePathname\(\);\s*useEffect\(\(\) => watchArrivals\(\), \[pathname\]\);/);
  const arrive = read("app/components/ui/arrive.ts");
  // The cleanup lets go of everything it started
  assert.match(arrive, /return \(\) => \{\s*io\.disconnect\(\);\s*mo\.disconnect\(\);\s*window\.clearTimeout\(safety\);\s*window\.clearTimeout\(last\);\s*cancelAnimationFrame\(frame\);/);
  // Late content is taken in; anything on screen still waiting is shown
  assert.match(arrive, /new MutationObserver/);
  assert.match(arrive, /if \(\(all \|\| hydrated\(el\)\) && el\.getBoundingClientRect\(\)\.top < innerHeight\) el\.setAttribute\("data-arrived", ""\);/);
  assert.match(arrive, /setTimeout\(\(\) => sweep\(false\), SAFETY_MS\)/);
  assert.match(arrive, /setTimeout\(\(\) => sweep\(true\), LAST_MS\)/);
});

// Against a running server: each /city page's headings, one h1 and no
// level skipped
const base = process.env.SMOKE_URL?.replace(/\/$/, "");
test("every /city page's outline: one h1, nothing skipped", { skip: base ? false : "set SMOKE_URL to a running server" }, async () => {
  for (const s of pageSections) {
    const html = await (await fetch(`${base}${s.city}`)).text();
    const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));
    const levels = [...main.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
    assert.equal(levels.filter((l) => l === 1).length, 1, `${s.city}: one h1 (${levels})`);
    assert.equal(levels[0], 1, `${s.city} starts with h1`);
    for (let i = 1; i < levels.length; i++) assert.ok(levels[i] <= levels[i - 1] + 1, `${s.city}: h${levels[i - 1]} then h${levels[i]}`);
  }
});
