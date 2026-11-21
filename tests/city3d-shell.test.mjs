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
  // Client-only: lazy() rendered only once an effect has set the mode (never
  // on the server), so next/dynamic's server machinery stays out of /city's
  // first load
  assert.match(shell, /const City3D = lazy\(\(\) => import\("\.\/City3D"\)\);/);
  assert.match(shell, /useState<Mode \| null>\(null\)/);
  assert.match(shell, /<Suspense fallback=\{null\}>\s*<City3D tier=\{tier\} \/>/);
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

test("still view cuts and holds still; the mouse never moves the camera", () => {
  // The plan's flight becomes one swap when still (flight.def.ts: travelKind)
  assert.match(city, /const kind = travelKind\(from, to, holdingStill\(\)\);\s*if \(kind === "cut"\) \{\s*\/\/ Still view: a cut, no travel\s*s\.queue = \[\{ kind: "swap"/);
  // Turned on mid-journey: cut, the rest drift stopped
  assert.match(city, /if \(!still \|\| !s\.started\) return;[\s\S]*?s\.drift = 0;/);
  // No drift while still (the painted places' plan: tests/city3d-plate.test.mjs)
  assert.match(city, /const resting = !r && !s\.queue\.length && !reduce && !plate;/);
});

test("the mobile tier tone-maps on the renderer; the desktop tiers through Post", () => {
  assert.match(city, /gl\.toneMapping = THREE\.NeutralToneMapping;\s*gl\.toneMappingExposure = 1\.12;/);
  assert.match(city, /dpr=\{t\.dpr\}/);
  assert.match(city, /antialias: t\.canvasAntialias/);
});

test("Post: nothing on mobile; only a composer, bloom and neutral tone mapping, from postprocessing itself", () => {
  assert.match(post, /if \(tier === "mobile"[^)]*\) return null;/);
  const imported = post.match(/import \{([^}]*)\} from "postprocessing"/)[1].split(",").map((s) => s.trim()).sort();
  assert.deepEqual(imported, ["BloomEffect", "EffectComposer", "EffectPass", "RenderPass", "ToneMappingEffect", "ToneMappingMode"]);
  // Not the React wrapper: it brings n8ao and maath into the 3D chunk
  for (const f of walk("app/components/city3d")) assert.doesNotMatch(noComments(read(f)), /@react-three\/postprocessing|from "n8ao"|from "maath"/, f);
  assert.match(post, /ToneMappingMode\.NEUTRAL/);
  assert.match(post, /prefers-contrast: more/);
  assert.match(post, /HalfFloatType/);
  assert.match(post, /gl\.toneMapping = NoToneMapping;/);
  assert.match(post, /\}, 1\);\s*return null;/, "draws in a priority-1 frame callback");
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

test("six painted places, each with a plate frame, framed beside the panel; no place mounts a light of its own", async () => {
  const { scenes, DISTRICT_LIGHTS, isPlace } = await import("../app/components/city3d/scenes.ts");
  assert.deepEqual(Object.keys(scenes).sort(), ["bund", "longtang", "lujiazui", "metro", "nanjing-road", "towers"]);
  for (const [id, def] of Object.entries(scenes)) {
    assert.ok(isPlace(def), `${id} is painted`);
    assert.ok(def.plateFrame && def.plateFrame.pos.length === 3 && def.plateFrame.target.length === 3 && def.plateFrame.fov > 0, id);
    // the panel takes the left half; a place is framed in the right half,
    // or (Experience, whose board runs the painting's width) centred
    assert.ok(["right", "center"].includes(def.frame), `${id}: ${def.frame}`);
    assert.ok(def.fov > 0, id);
    // the riverside's signs and routes went with the code-built Home
    assert.ok(!("sign" in def), `${id}: no riverside sign`);
    assert.equal(DISTRICT_LIGHTS[id], 0, `${id}: unlit`);
  }
  assert.deepEqual(Object.values(scenes).filter((d) => d.frame === "center").length, 1);
  // a painted place's light is its paintings' and its shader's: no file
  // under the places mounts a light, and nothing uses the old SceneLights
  for (const f of walk("app/components/city3d")) {
    const src = noComments(read(f));
    assert.doesNotMatch(src, /SceneLights|<(spot|point|rectArea)Light\b|new THREE\.(Spot|Point|RectArea)Light\(/, f);
  }
  // Places far apart, past each other's fog
  const offsets = Object.values(scenes).map((d) => d.offset[0]).sort((a, b) => a - b);
  for (let i = 1; i < offsets.length; i++) assert.ok(offsets[i] - offsets[i - 1] >= 400);
});

test("the signs and tags say each section's title from the registry, never retyped", () => {
  const titles = pageSections.map((s) => s.title);
  const literals = [...noComments(riverside).matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g)].map((m) => m[1] ?? m[2] ?? m[3]);
  for (const t of titles) assert.ok(!literals.includes(t), `Riverside.tsx retypes "${t}"`);
  assert.match(riverside, /const title = section\(id\)\.title;/);
  // One link per board, to its section's /city page, named by its title
  // (visually the board's painted word: the link is its hit area)
  assert.match(city, /<Link key=\{s\.id\} className="city-tag" href=\{cityPath\(s\.id\)\} data-anchor=\{`sign:\$\{s\.id\}`\}>\s*<span className="city-tag-name">\{section\(s\.id\)\.title\}<\/span>/);
  // The anchors the visibility script and the links use: each spot's
  // middle and its four edges' middles
  assert.match(riverside, /anchors\.set\(`sign:\$\{s\.id\}\$\{k\}`, v\)/);
  // Each sign's Hitbox goes through cityPath, and answers only while the
  // links stand over the spots
  assert.match(riverside, /onSpot=\{\(key\) => navigate\(cityPath\(key as SectionId\)\)\} spotEnabled=\{boardsLive\}/);
});

test("Home's links take Tab left to right as their spots stand in the painting: Contact, About, Experience, Projects, Interests", async () => {
  const { HOME_SIGNS } = await import("../app/components/city3d/districts/lujiazui.def.ts");
  const middle = (id) => HOME_SIGNS[id].spot.reduce((a, c) => a + c[0], 0) / 4;
  const ids = Object.keys(HOME_SIGNS).sort((a, b) => middle(a) - middle(b));
  assert.deepEqual(ids, ["contact", "about", "experience", "projects", "interests"]);
  assert.match(riverside, /const SIGNED[^=]*= \["contact", "about", "experience", "projects", "interests"\]/);
  // the links' order (City3D.tsx: tagged) is the same measure
  assert.match(city, /const middle = \(id: keyof typeof HOME_SIGNS\) => HOME_SIGNS\[id\]\.spot\.reduce\(\(a, c\) => a \+ c\[0\], 0\) \/ 4;/);
  assert.match(city, /const tagged = listed\.filter\(\(s\) => s\.id !== "home"\)\.sort\(\(a, b\) => middle\(a\.id as keyof typeof HOME_SIGNS\) - middle\(b\.id as keyof typeof HOME_SIGNS\)\);/);
  assert.doesNotMatch(city, /\.sign!?\.bearing|routesFromRiverside/);
});

test("every /city page passes where=\"3d\" to its section, so the outline runs on", () => {
  const page = read("app/components/city3d/CityPage.tsx");
  for (const name of ["Hero", "About", "Projects", "Experience", "Interests", "Contact"]) assert.match(page, new RegExp(`<${name} where="3d" />`), name);
});

test("arrival never touches what React hasn't hydrated, never relies on React's internals, and can't leave anything hidden", () => {
  const arrive = read("app/components/ui/arrive.ts");
  assert.doesNotMatch(arrive, /__react|requestAnimationFrame|MutationObserver/);
  // Only items below the fold wait; the bound shows anything the observer
  // never reported on; the cleanup unmarks what's still waiting
  assert.match(arrive, /if \(el\.getBoundingClientRect\(\)\.top < innerHeight\) \{\s*el\.setAttribute\("data-arrived", ""\);/);
  assert.match(arrive, /setTimeout\(\(\) => \{\s*for \(const el of \[\.\.\.waiting\]\) if \(!reported\.has\(el\)\) show\(el, ""\);\s*\}, LAST_MS\)/);
  assert.match(arrive, /return \(\) => \{\s*io\.disconnect\(\);\s*window\.clearTimeout\(last\);\s*for \(const el of waiting\) el\.removeAttribute\(WAIT\);/);
  assert.match(arrive, /const LAST_MS = \d+;/);
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
