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
  assert.match(common, /export type Mover = \{ object: THREE\.Object3D; update\(t: number\): void; park\(\): void \};/);
  assert.match(read(`${city}/City3D.tsx`), /<Scene active=\{active === id\} quality=\{tier\} navigate=\{navigate\} still=\{still\} \/>/);
});
