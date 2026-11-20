// The base the city's kit and scenes build on (wave 2 and after), so their
// tasks can run in parallel without editing the same lines
// (docs/superpowers/plans/2026-11-19-shanghai-3d.md, "Interfaces for wave
// 2"): the store, one file and one def per place, the loaders, the
// anchors' names, the live counter, and materials only from the kit.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { pageSections } from "../app/sections/registry.ts";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const walk = (dir) =>
  readdirSync(`${root}${dir}`, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));
const noComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const city = "app/components/city3d";
const places = pageSections.filter((s) => s.id !== "home").map((s) => s.district);

test("the store has no park fields, and has the hour and the live counter", async () => {
  const { world } = await import(`../${city}/store.ts`);
  const keys = Object.keys(world.get());
  for (const gone of ["phoneUp", "fountain", "doorOpen", "introReveal", "covered"]) assert.ok(!keys.includes(gone), gone);
  assert.equal(typeof world.get().hour, "number");
  assert.equal(world.get().live, 0);
  assert.ok(!("page" in world.get().sel));
  const src = read(`${city}/store.ts`);
  assert.doesNotMatch(src, /FOUNTAIN_MS|runFountain|brushwork|World3D/);
  // Quality is the tiers' own, not a second definition
  assert.match(src, /import type \{ Quality \} from "\.\/tiers(\.ts)?";/);
  assert.doesNotMatch(src, /type Quality =/);
});

test("the live counter counts up and down, and a release counts once", async () => {
  const { world, holdLive } = await import(`../${city}/store.ts`);
  const a = holdLive();
  const b = holdLive();
  assert.equal(world.get().live, 2);
  a();
  a();
  assert.equal(world.get().live, 1);
  b();
  assert.equal(world.get().live, 0);
  // useLive holds it while on; City3D draws every frame only while live and not still
  assert.match(read(`${city}/common.tsx`), /export function useLive\(on: boolean\): void \{\s*useEffect\(\(\) => \(on \? holdLive\(\) : undefined\), \[on\]\);/);
  const shell = read(`${city}/City3D.tsx`);
  assert.match(shell, /const live = useWorld\(\(s\) => s\.live > 0\);/);
  assert.match(shell, /still \|\| !live \? "demand" : "always"/);
});

test("the hour comes from the same clock as the 2D page, or the preview's", () => {
  const src = read("app/components/weather/SkyDriver.tsx");
  assert.match(src, /localHour\(/);
  assert.match(src, /previewHour\(/);
  assert.match(src, /richmondHill\.timeZone/);
  assert.match(src, /world\.set\(\{ hour \}\)/);
});

test("every section's place has its own def and its own scene file, and the loaders map every section", async () => {
  const { scenes } = await import(`../${city}/scenes.ts`);
  const chunks = read(`${city}/sceneChunks.ts`);
  for (const id of places) {
    assert.ok(existsSync(`${root}${city}/districts/${id}.def.ts`), `${id}.def.ts`);
    const file = `${city}/districts/${id}.tsx`;
    assert.ok(existsSync(`${root}${file}`), file);
    assert.match(read(file), /export default \w+Scene;/, `${file}: a default export named for its section`);
    assert.match(chunks, new RegExp(`"?${id}"?: \\(\\) => import\\("\\./districts/${id}"\\)`), `${id}'s loader`);
    // Its sign on the riverside is in its def, and nowhere else
    assert.ok(scenes[id].sign && Number.isFinite(scenes[id].sign.bearing), `${id}: sign`);
  }
  assert.match(chunks, /lujiazui: Riverside/);
  assert.doesNotMatch(chunks, /placeholder/);
  assert.doesNotMatch(read(`${city}/Riverside.tsx`), /bearing: -?\d/, "the signs' places are the defs'");
});

test("anchors are named <scene id>:<name>; sign: is the riverside's alone", () => {
  for (const f of walk(city).filter((f) => /\.(ts|tsx)$/.test(f))) {
    const src = noComments(read(f));
    for (const m of src.matchAll(/anchors\.set\(\s*([^,]+),/g)) {
      const key = m[1].trim();
      if (f.endsWith("/Riverside.tsx")) assert.match(key, /^`sign:/, `${f}: ${key}`);
      else assert.match(key, /^anchorKey\(/, `${f}: ${key}`);
    }
  }
  const common = read(`${city}/common.tsx`);
  assert.match(common, /export const anchorKey = \(scene: Exclude<SceneId, "lujiazui">, name: string\) => `\$\{scene\}:\$\{name\}`;/);
});

test("no file outside the kit creates a three.js material; the kit's come from one cache with one naming scheme", () => {
  for (const f of walk(city).filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes("/kit/"))) {
    const src = noComments(read(f));
    assert.doesNotMatch(src, /new THREE\.\w*Material\(/, f);
    assert.doesNotMatch(src, /<\w*[mM]aterial[\s/>]/, `${f}: a JSX material`);
    assert.doesNotMatch(src, /import \{[^}]*\b\w+Material\b[^}]*\} from "three"/, f);
  }
  const uniforms = read(`${city}/kit/uniforms.ts`);
  assert.match(uniforms, /export function materialKey\(kind: string, variant: string\): string/);
  assert.match(uniforms, /export const neonUniforms = \{/);
  assert.match(uniforms, /export const windowUniforms = \{/);
  assert.match(uniforms, /export \{ envUniforms \} from "\.\.\/environment";/);
  for (const f of ["surface.ts", "windows.ts", "neon.ts"]) {
    const src = read(`${city}/kit/${f}`);
    assert.match(src, /shared\(materialKey\(/, f);
  }
  assert.match(read(`${city}/City3D.tsx`), /useEffect\(\(\) => \(\) => disposeShared\(\), \[\]\);/);
});

test("a scene's lights are exactly its DISTRICT_LIGHTS spot lights, through SceneLights", () => {
  const common = read(`${city}/common.tsx`);
  assert.match(common, /export function SceneLights\(/);
  assert.match(common, /const count = DISTRICT_LIGHTS\[id\];\s*if \(spots\.length !== count\) throw/);
  // The scene contract
  assert.match(common, /export type SceneProps = \{[^}]*still: boolean;[^}]*\}/);
  assert.match(common, /export type Mover = \{ object: THREE\.Object3D; update\(t: number\): void; park\(\): void; resting\?\(t: number\): boolean \};/);
  assert.match(read(`${city}/City3D.tsx`), /<Scene active=\{active === id\} quality=\{tier\} navigate=\{navigate\} still=\{still\} \/>/);
});

// Wave 4: the shell does what the defs describe, and the scenes share the
// kit's patterns

test("the camera rests on a chosen thing's focus pose, for every district that has them, and home otherwise", async () => {
  const { scenes, restingPose, focusTravel } = await import(`../${city}/scenes.ts`);
  const withFocus = Object.entries(scenes).filter(([, def]) => Object.keys(def.focus).length > 0);
  assert.deepEqual(withFocus.map(([id]) => id).sort(), ["metro", "nanjing-road", "towers"]);
  for (const [id, def] of withFocus) {
    for (const [key, pose] of Object.entries(def.focus)) {
      assert.equal(restingPose(id, key), pose, `${id}: ${key}`);
      // a short gentle arc there from home and back: a lifted middle, 0.6–1.1 s
      for (const [from, to] of [[def.home, pose], [pose, def.home]]) {
        const { mid, dur } = focusTravel(from, to);
        assert.ok(dur >= 0.6 && dur <= 1.1, `${id}: ${key}: ${dur}`);
        assert.ok(mid.pos[1] >= (from.pos[1] + to.pos[1]) / 2 - 1e-9, `${id}: ${key}: the arc is lifted`);
        assert.ok(mid.pos[1] - (from.pos[1] + to.pos[1]) / 2 <= 0.6 + 1e-9);
      }
    }
    // nothing chosen, or a key from another place: home
    assert.equal(restingPose(id, null), def.home);
    assert.equal(restingPose(id, "not-a-focus"), def.home);
  }
  assert.equal(restingPose("longtang", "screen-0"), scenes.longtang.home);
});

test("the Director travels to the focus pose and back, interruptibly, cut in still view, never touching the page's focus", () => {
  const src = noComments(read(`${city}/City3D.tsx`));
  assert.match(src, /const restPose = \(scene: SceneId\) => inWorld\(scene, restingPose\(scene, world\.get\(\)\.focus\)\);/);
  // a focus belongs to its place: cleared on every journey to another
  assert.match(src, /if \(from !== to\) world\.set\(\{ arrived: false, hover: null, focus: null \}\);/);
  // the store's focus is followed; a journey is never cut short by it; still view cuts (the rest takes it at once)
  assert.match(src, /world\.subscribe\(\(\) => \{\s*const key = world\.get\(\)\.focus;/);
  assert.match(src, /if \(!s\.started \|\| holdingStill\(\)\) return;/);
  assert.match(src, /const journey = s\.queue\.length > 0 \|\| \(s\.running && !s\.running\.seg\.focus\);/);
  assert.match(src, /focusTravel\(/);
  assert.match(src, /ease: easeInOut, to: \[[^\]]*\], focus: true \}/);
  assert.doesNotMatch(src, /\.focus\(\{ preventScroll/, "the canvas never moves keyboard focus");
});

test("?frame=plate exists only in development: the painting's pose, lens and shape, the panel hidden", () => {
  const src = read(`${city}/City3D.tsx`);
  assert.match(src, /const plateWanted = \(\) => process\.env\.NODE_ENV === "development" && new URLSearchParams\(location\.search\)\.get\("frame"\) === "plate";/);
  assert.match(src, /if \(process\.env\.NODE_ENV !== "development" \|\| !plate\) return;/);
  assert.match(src, /export const PLATE_ASPECT = 2400 \/ 1032;/);
  assert.match(src, /const pf = def\.plateFrame;[\s\S]*fov = pf\.fov;/);
  assert.match(read("docs/superpowers/plans/2026-11-19-shanghai-3d.md"), /\?frame=plate/);
});

test("a Hitbox says where it was hit; the rain keeps out of a place's shelter; the sun stands where a place's def says", async () => {
  const common = noComments(read(`${city}/common.tsx`));
  assert.match(common, /export type Hit = \{ uv: THREE\.Vector2 \| null; point: THREE\.Vector3 \};/);
  assert.match(common, /onSelect: \(hit: Hit\) => void;/);
  assert.match(common, /onSelect\(\{ uv: e\.uv \? e\.uv\.clone\(\) : null, point:/);
  const { scenes } = await import(`../${city}/scenes.ts`);
  const { METRO } = await import(`../${city}/districts/metro.def.ts`);
  assert.equal(scenes.metro.shelter, METRO.shelter);
  const precip = noComments(read(`${city}/atmosphere/Precipitation.tsx`));
  assert.match(precip, /const shelter = scenes\[active\]\.shelter;/);
  assert.match(noComments(read(`${city}/kit/precip.ts`)), /if \(all\(greaterThan\(p, uShelterMin\)\) && all\(lessThan\(p, uShelterMax\)\)\) vAlpha = 0\.0;/);
  assert.ok(Array.isArray(scenes.longtang.sun) && scenes.longtang.sun[0] > 0, "the lane is lit from the right");
});

test("what a scene builds is let go on its real unmount, never on development's double effect; the kit's dispose never detaches", () => {
  const common = noComments(read(`${city}/common.tsx`));
  assert.match(common, /export function useDisposeOnUnmount\(owner: \{ dispose\(\): void \}\): void/);
  assert.match(common, /window\.clearTimeout\(waiting\);/);
  assert.match(common, /window\.setTimeout\(\(\) => \{\s*pendingDispose\.delete\(owner\);\s*owner\.dispose\(\);\s*\}, 0\)/);
  for (const f of ["Riverside.tsx", ...places.map((id) => `districts/${id}.tsx`)]) {
    const src = noComments(read(`${city}/${f}`));
    assert.match(src, /useDisposeOnUnmount\(built\);/, f);
    assert.doesNotMatch(src, /useEffect\(\(\) => \(\) => built\.dispose\(\), \[built\]\);/, f);
    assert.doesNotMatch(src, /built\.dispose\(\)/, `${f}: disposed only through useDisposeOnUnmount`);
  }
  for (const f of walk(`${city}/kit`)) assert.doesNotMatch(noComments(read(f)), /removeFromParent\(\)/, f);
});

test("every section's scene and the riverside light their surroundings after dark with the kit's pools", () => {
  for (const [f, id] of [["Riverside.tsx", "lujiazui"], ...places.map((p) => [`districts/${p}.tsx`, p])]) {
    assert.match(noComments(read(`${city}/${f}`)), new RegExp(`useGlowPools\\("${id}", POOLS, active\\)`), f);
  }
});
