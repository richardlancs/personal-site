// The city kit's surfaces, towers, windows and sky (app/components/city3d/kit/
// {surface,towers,windows,sky,geometry}.ts): instanced towers at most one
// draw call per style, a seeded layout that keeps out of what it's told, the
// window shader's hash the twin of the tested one in app/lib/cityWindows.ts,
// one program per variant, and no lights.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";

// The kit imports its neighbours without an extension (as Next resolves
// them); Node needs one, so this file lets it try ".ts"
registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (/^\.{1,2}\//.test(specifier) && !/\.[cm]?[jt]sx?$/.test(specifier)) return next(`${specifier}.ts`, context);
      throw error;
    }
  },
});

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const kit = "app/components/city3d/kit";
const noComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

const THREE = await import("three");
const { buildTowers, layoutTowers } = await import(`../${kit}/towers.ts`);
const { buildSkyDome } = await import(`../${kit}/sky.ts`);
const { surface } = await import(`../${kit}/surface.ts`);
const { windowMaterial } = await import(`../${kit}/windows.ts`);
const { disposeShared, sharedCount } = await import(`../${kit}/materials.ts`);

const sixty = () => Array.from({ length: 60 }, (_, i) => ({ x: (i % 10) * 6, z: Math.floor(i / 10) * 6, w: 3, d: 2.5, h: 8 + (i % 7) * 3, ry: 0.1 * (i % 3), style: i % 4, seed: 1000 + i }));

test("towers.ts creates InstancedMeshes and sets aSeed and aSize as InstancedBufferAttributes", () => {
  const src = noComments(read(`${kit}/towers.ts`));
  assert.match(src, /new THREE\.InstancedMesh\(/);
  assert.match(src, /setAttribute\("aSize", new THREE\.InstancedBufferAttribute\(/);
  assert.match(src, /setAttribute\("aSeed", new THREE\.InstancedBufferAttribute\(/);
});

test("sixty towers of four styles are at most four meshes, sixty instances in all", () => {
  for (const far of [false, true]) {
    const meshes = buildTowers(sixty(), { far });
    assert.ok(meshes.length <= 4, `${meshes.length} meshes`);
    assert.equal(meshes.reduce((n, m) => n + m.count, 0), 60);
    for (const m of meshes) {
      assert.ok(m.isInstancedMesh);
      assert.ok(m.geometry.getAttribute("aSize").isInstancedBufferAttribute);
      assert.equal(m.geometry.getAttribute("aSize").itemSize, 3);
      assert.ok(m.geometry.getAttribute("aSeed").isInstancedBufferAttribute);
      assert.equal(m.geometry.getAttribute("aSeed").count, m.count);
      assert.ok(m.geometry.getAttribute("aFace"), "faces for the window grid");
      assert.ok(m.boundingSphere && m.boundingSphere.radius > 0, "bounds over every instance");
      assert.equal(m.castShadow, !far);
    }
    for (const m of meshes) m.geometry.dispose();
  }
});

test("each instance stands where its spec says, as tall as its spec", () => {
  const specs = sixty();
  const meshes = buildTowers(specs, { far: false });
  const m4 = new THREE.Matrix4();
  for (const mesh of meshes) {
    const mine = specs.filter((s) => s.style === Number(mesh.name.split(":")[1]));
    mine.forEach((s, i) => {
      mesh.getMatrixAt(i, m4);
      const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
      m4.decompose(p, q, sc);
      assert.ok(Math.abs(p.x - s.x) < 1e-6 && Math.abs(p.z - s.z) < 1e-6 && Math.abs(sc.y - s.h) < 1e-5);
      assert.equal(mesh.geometry.getAttribute("aSeed").getX(i), s.seed);
    });
  }
});

test("a tower's geometry is small: under 40 triangles a style", () => {
  for (const mesh of buildTowers(sixty(), { far: false })) assert.ok(mesh.geometry.getAttribute("position").count / 3 <= 40, mesh.name);
});

test("layoutTowers keeps out of every keep-out circle, inside its area, with no overlaps", () => {
  const area = { x0: -60, x1: 60, z0: -40, z1: -10 };
  const keepOut = [
    { x: 0, z: -25, r: 10 },
    { x: 30, z: -20, r: 6 },
  ];
  const specs = layoutTowers(11, area, 60, [6, 30], keepOut);
  assert.ok(specs.length >= 40, `${specs.length} towers`);
  for (const s of specs) {
    const rad = 0.5 * Math.hypot(s.w, s.d);
    for (const k of keepOut) assert.ok(Math.hypot(s.x - k.x, s.z - k.z) >= k.r + rad - 1e-9, JSON.stringify(s));
    assert.ok(s.x >= area.x0 && s.x <= area.x1 && s.z >= area.z0 && s.z <= area.z1);
    assert.ok(s.h >= 6 && s.h <= 30);
    assert.ok([0, 1, 2, 3].includes(s.style));
    assert.ok(Number.isInteger(s.seed));
  }
  for (let i = 0; i < specs.length; i++)
    for (let j = i + 1; j < specs.length; j++) {
      const a = specs[i], b = specs[j];
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 0.9 * 0.5 * (Math.hypot(a.w, a.d) + Math.hypot(b.w, b.d)), `${i} and ${j} overlap`);
    }
});

test("layoutTowers is the same for the same seed, and not for another", () => {
  const area = { x0: 0, x1: 100, z0: 0, z1: 40 };
  assert.deepEqual(layoutTowers(5, area, 30, [5, 20]), layoutTowers(5, area, 30, [5, 20]));
  assert.notDeepEqual(layoutTowers(5, area, 30, [5, 20]), layoutTowers(6, area, 30, [5, 20]));
});

test("the window shader's hash is lib/cityWindows.ts's, constant for constant", () => {
  const src = read(`${kit}/windows.ts`);
  // windows.ts takes the GLSL twin from the tested module rather than retyping it
  assert.match(src, /import \{ WINDOW_HASH_GLSL \} from "\.\.\/\.\.\/\.\.\/lib\/cityWindows(\.ts)?";/);
  assert.match(src, /\$\{WINDOW_HASH_GLSL\}/);
  assert.doesNotMatch(noComments(src), /float windowHash\(/, "no second hash in windows.ts");
  const lib = read("app/lib/cityWindows.ts");
  const js = lib.slice(lib.indexOf("export function windowHash"), lib.indexOf("export const WINDOW_HASH_GLSL"));
  const glsl = lib.slice(lib.indexOf("export const WINDOW_HASH_GLSL"), lib.indexOf("export function windowLit"));
  const hex = (s) => [...s.matchAll(/0x[0-9a-f]+/gi)].map((m) => m[0].toLowerCase());
  const shifts = (s) => [...s.matchAll(/>>>? ?(\d+)u?/g)].map((m) => Number(m[1]));
  assert.ok(hex(js).length >= 5);
  assert.deepEqual(hex(glsl), hex(js));
  assert.deepEqual(shifts(glsl), shifts(js));
  // ...and the lit test is the tested one: hash < share
  assert.match(src, /windowHash\(fl, bay, seed\) < uLitShare/);
});

test("surface.ts and windows.ts set customProgramCacheKey through materialKey; windows has a near and a far program", () => {
  for (const f of ["surface", "windows"]) assert.match(read(`${kit}/${f}.ts`), /customProgramCacheKey = \(\) => materialKey\(/, f);
  const near = windowMaterial({ base: "#24364f", glass: "#5d8fc4" });
  const far = windowMaterial({ base: "#24364f", glass: "#5d8fc4", far: true });
  assert.equal(near.customProgramCacheKey(), "win:near");
  assert.equal(far.customProgramCacheKey(), "win:far");
  // other colours, the same program
  assert.equal(windowMaterial({ base: "#cdbb9c", glass: "#33506f" }).customProgramCacheKey(), "win:near");
  assert.equal(surface({ color: "#445566" }).customProgramCacheKey(), surface({ color: "#ffeedd", wet: 0.5, snow: true, grime: 1 }).customProgramCacheKey());
});

test("equal options give the same shared material; the cache is emptied on dispose", () => {
  disposeShared();
  assert.equal(surface({ color: "#445566" }), surface({ color: "#445566" }));
  assert.notEqual(surface({ color: "#445566" }), surface({ color: "#445566", snow: true }));
  assert.equal(windowMaterial({ base: "#111111", glass: "#222222" }), windowMaterial({ base: "#111111", glass: "#222222" }));
  assert.ok(sharedCount() >= 3);
  disposeShared();
  assert.equal(sharedCount(), 0);
});

test("windows.ts imports windowUniforms from ./uniforms, and reads uNight; surface reads the weather", () => {
  const win = read(`${kit}/windows.ts`);
  assert.match(win, /import \{[^}]*\bwindowUniforms\b[^}]*\} from "\.\/uniforms(\.ts)?";/);
  assert.match(win, /Object\.assign\(shader\.uniforms, [^)]*windowUniforms[^)]*envUniforms\)/);
  assert.match(win, /uNight/);
  // the world position, instancing included, from surface.ts's shared chunk
  assert.match(win, /\$\{WORLD_VARYINGS_VERTEX\}/);
  const surf = read(`${kit}/surface.ts`);
  assert.match(surf, /kitWorld = instanceMatrix \* kitWorld;[\s\S]*kitWorld = modelMatrix \* kitWorld;/);
  assert.match(surf, /Object\.assign\(shader\.uniforms, [^)]*envUniforms\)/);
  assert.match(surf, /#include <fog_fragment>", FOG_FRAGMENT/);
  // the shader compiles nothing new at runtime: no #define keyed on an option but `far`
  assert.doesNotMatch(noComments(surf), /#define/);
});

test("the sky dome is the atmosphere's: tagged, first, no depth, no fog, one material per seed", () => {
  disposeShared();
  const a = buildSkyDome({ seed: 3, radius: 400 });
  const b = buildSkyDome({ seed: 3, radius: 300 });
  const c = buildSkyDome({ seed: 4, radius: 400 });
  assert.equal(a.userData.atmos, "sky");
  assert.ok(a.userData.sunDir.isVector3);
  assert.equal(a.renderOrder, -1);
  assert.equal(a.frustumCulled, false);
  assert.equal(a.material.depthWrite, false);
  assert.equal(a.material.fog, false);
  assert.equal(a.material.side, THREE.BackSide);
  assert.equal(a.material, b.material);
  assert.notEqual(a.material, c.material);
  assert.equal(a.material.customProgramCacheKey(), c.material.customProgramCacheKey());
  for (const u of ["uTop", "uHorizon", "uSun", "uSunDir", "uCloudLit", "uCloudShade", "uCover", "uSunDisc", "uMoon", "uStars", "uHaze", "uHazeAmt", "uCityGlow", "uCityGlowColor"])
    assert.ok(u in a.material.uniforms, u);
  // it follows the camera that draws it
  const cam = new THREE.PerspectiveCamera();
  cam.position.set(5, 6, 7);
  cam.updateMatrixWorld();
  a.onBeforeRender(null, null, cam);
  assert.deepEqual(a.position.toArray(), [5, 6, 7]);
  for (const s of [a, b, c]) s.geometry.dispose();
  disposeShared();
});

test("no kit file creates a light, and nothing in Task 6's files uses Math.random", () => {
  for (const f of readdirSync(`${root}${kit}`).filter((n) => /\.tsx?$/.test(n))) {
    const src = noComments(read(`${kit}/${f}`));
    assert.doesNotMatch(src, /new THREE\.(Point|Spot|Directional|Hemisphere|RectArea|Ambient)Light\b/, f);
  }
  for (const f of ["surface", "towers", "windows", "sky", "geometry"]) assert.doesNotMatch(noComments(read(`${kit}/${f}.ts`)), /Math\.random/, f);
});
