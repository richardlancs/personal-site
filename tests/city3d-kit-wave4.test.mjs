// What the kit gained when the five district scenes were fitted together
// (wave 4): light pools and day shade on the lit surface, relief and a
// floodlit glow on it, glass, paving, a clock that tells the time,
// planters, richer trees, and screens that let go of their pictures.
// Pure parts run here; what needs a canvas or a GPU is checked in the
// source, as the other kit tests do.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";

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
const { setPools, clearPools, setShade, clearShade } = await import(`../${kit}/glow.ts`);
const { poolUniforms, shadeUniforms, POOLS, materialKey, envUniforms, glowOn, neonUniforms } = await import(`../${kit}/uniforms.ts`);
const { surface } = await import(`../${kit}/surface.ts`);
const { disposeShared } = await import(`../${kit}/materials.ts`);

// A shader as onBeforeCompile sees it, from three's own Lambert chunks
const lambertShader = () => ({
  uniforms: {},
  vertexShader: THREE.ShaderLib.lambert.vertexShader,
  fragmentShader: THREE.ShaderLib.lambert.fragmentShader,
});

test("light pools: set in the world (the place's offset added), colour × strength, the strongest kept past POOLS, cleared only by their owner", () => {
  assert.equal(POOLS, 12);
  assert.equal(poolUniforms.uPools.value.length, POOLS);
  const owner = {};
  setPools(owner, [{ pos: [1, 2, 3], reach: 0.8, color: "#ff0000", strength: 2 }], [1000, 0, 0]);
  const v = poolUniforms.uPools.value[0];
  assert.deepEqual([v.x, v.y, v.z, v.w], [1001, 2, 3, 0.8]);
  const c = poolUniforms.uPoolTones.value[0];
  assert.ok(Math.abs(c.r - 2) < 1e-6 && c.g === 0 && c.b === 0);
  // the rest are empty (reach 0: the shader skips them)
  for (let i = 1; i < POOLS; i++) assert.equal(poolUniforms.uPools.value[i].w, 0);
  // too many: the strongest (strength × reach) are kept
  const many = Array.from({ length: 20 }, (_, i) => ({ pos: [i, 0, 0], reach: 1, color: "#ffffff", strength: i }));
  setPools(owner, many, [0, 0, 0]);
  const kept = poolUniforms.uPools.value.map((p) => p.x).sort((a, b) => a - b);
  assert.deepEqual(kept, [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  // another place's cleanup doesn't take this one's down
  clearPools({});
  assert.ok(poolUniforms.uPools.value.every((p) => p.w > 0));
  clearPools(owner);
  assert.ok(poolUniforms.uPools.value.every((p) => p.w === 0));
});

test("day shade: the box in the world, the direction normalised, an edge measured from the box's corner, cleared only by its owner", () => {
  const owner = {};
  setShade(owner, { kind: "stripes", box: [2, -3, 0, 4], dir: [0, 2], period: 0.35, duty: 0.6, depth: 0.3, top: 1.2 }, [1500, 0, 0]);
  const s = shadeUniforms;
  assert.deepEqual(s.uShade.value.toArray(), [1, 0.3, 0.35, 0.6]);
  assert.deepEqual(s.uShadeBox.value.toArray(), [1500, -3, 1502, 4]);
  assert.deepEqual(s.uShadeDir.value.toArray(), [0, 1, 1.2, 0]);
  setShade(owner, { kind: "edge", box: [-1, -5, 1, 5], dir: [1, 0], at: 0.5, depth: 0.4, top: 0.05 }, [500, 0, 0]);
  assert.equal(s.uShade.value.x, 3);
  // the line is at the box's x0 (499) plus 0.5, in the world
  assert.equal(s.uShade.value.z, 499.5);
  clearShade({});
  assert.equal(s.uShade.value.x, 3);
  clearShade(owner);
  assert.equal(s.uShade.value.x, 0);
});

test("the lit surface takes the pools, the shade, relief and a floodlit glow as uniforms: one program, shared by reference", () => {
  disposeShared();
  const plain = surface({ color: "#888888" });
  const stone = surface({ color: "#888888", relief: { kind: "stone", bay: 0.4, floor: 0.36 } });
  const brick = surface({ color: "#888888", relief: { kind: "brick", course: 0.0135, length: 0.04, strength: 0.85 } });
  const lit = surface({ color: "#888888", glow: { tone: "#ffb454", strength: 0.34 } });
  assert.notEqual(plain, stone);
  assert.equal(stone, surface({ color: "#888888", relief: { kind: "stone", bay: 0.4, floor: 0.36 } }));
  for (const m of [plain, stone, brick, lit]) assert.equal(m.customProgramCacheKey(), materialKey("surface", "lit"));
  assert.deepEqual(stone.userData.surface.uRelief.value.toArray(), [1, 0.4, 0.36, 0.6]);
  assert.deepEqual(brick.userData.surface.uRelief.value.toArray(), [2, 0.04, 0.0135, 0.85]);
  assert.equal(plain.userData.surface.uRelief.value.x, 0);
  assert.equal(lit.userData.surface.uLitStrength.value, 0.34);
  const shader = lambertShader();
  stone.onBeforeCompile(shader);
  // shared state by reference: the atmosphere's and the place's writes reach every surface
  assert.equal(shader.uniforms.uPools, poolUniforms.uPools);
  assert.equal(shader.uniforms.uPoolsOn, poolUniforms.uPoolsOn);
  assert.equal(shader.uniforms.uShadeOn, shadeUniforms.uShadeOn);
  assert.equal(shader.uniforms.uNight, envUniforms.uNight);
  assert.equal(shader.uniforms.uGlowOn, glowOn);
  assert.equal(shader.uniforms.uNeon, neonUniforms.uNeon);
  assert.match(shader.fragmentShader, new RegExp(`uniform vec4 uPools\\[${POOLS}\\];`));
  assert.match(shader.fragmentShader, /for \(int i = 0; i < 12; i\+\+\)/);
  assert.match(shader.fragmentShader, /fwidth\(/, "relief fades out where it would be finer than a pixel");
  assert.doesNotMatch(shader.fragmentShader, /#include <color_fragment>\n?$/);
  const src = noComments(read(`${kit}/surface.ts`));
  assert.doesNotMatch(src, /#define/);
});

test("the clock and the screens' release, in the source: seeded, cached, no randomness", () => {
  const tex = noComments(read(`${kit}/textures.ts`));
  assert.match(tex, /export function clockFace\(hour = 12\): THREE\.CanvasTexture/);
  assert.match(tex, /export function setClockHour\(hour: number\): boolean/);
  assert.match(tex, /if \(!t \|\| !clockPaint \|\| minute === clockAt\) return false;/);
  // the clock's hands: the hour hand turns once in twelve hours, the minute hand once an hour
  assert.match(tex, /hand\(h \/ 12, 58, 9\);/);
  assert.match(tex, /hand\(Math\.floor\(minutes\) \/ 60, 92, 5\);/);
  // clones share one upload, counted once
  assert.match(tex, /if \(sources\.has\(t\.source\)\) continue;/);
  for (const f of ["textures.ts", "glow.ts", "surface.ts", "neon.ts", "plate.ts", "flight.ts"]) assert.doesNotMatch(noComments(read(`${kit}/${f}`)), /Math\.random/, f);
  const neon = noComments(read(`${kit}/neon.ts`));
  assert.match(neon, /export function clockMaterial\(hour = 12\): THREE\.MeshBasicMaterial/);
  assert.match(neon, /shared\(materialKey\("screen", "clock"\)/);
  // (a disc on a clear canvas: the kit's to say, not the place's)
  assert.match(neon, /new THREE\.MeshBasicMaterial\(\{ map: clockFace\(hour\), transparent: true, depthWrite: false \}\)/);
  assert.doesNotMatch(noComments(read("app/components/city3d/districts/bund.tsx")), /material\.transparent =/);
  assert.match(neon, /m\.userData\.release = \(\) => \{[\s\S]*canvas\.width = canvas\.height = 1;\s*texture\.dispose\(\);/);
  assert.match(neon, /m\.userData\.restore = \(\) => \{[\s\S]*track\(texture\);\s*paint\(\);/);
});

test("the atmosphere drives the pools with the lamps and the shade with the sun", () => {
  const src = noComments(read("app/components/city3d/atmosphere/Atmosphere.tsx"));
  assert.match(src, /poolUniforms\.uPoolsOn\.value = lampsOn \* \(1 \+ 0\.25 \* w\.wet\);/);
  assert.match(src, /const sunShare = \(1 - step01\(0\.2, 0\.7, night\)\)[^;]*;\s*shadeUniforms\.uShadeOn\.value = sunShare;/);
});
