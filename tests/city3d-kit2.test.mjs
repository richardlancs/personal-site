// The second kit pass (after the gate 3 review), what's left of it now
// the places are painted (windows, towers, trees, the train and paving
// went with the code-built scenes): line pools, floodlight falloff, a day
// fill, a plain panel, a lattice day shade. Pure parts run
// here; what needs a canvas or a GPU is checked in the source, as the
// other kit tests do. Every option is a uniform: no new program.
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
const { poolUniforms, shadeUniforms, bounceUniforms, POOLS } = await import(`../${kit}/uniforms.ts`);
const { surface } = await import(`../${kit}/surface.ts`);
const { disposeShared } = await import(`../${kit}/materials.ts`);

const lambertShader = () => ({ uniforms: {}, vertexShader: THREE.ShaderLib.lambert.vertexShader, fragmentShader: THREE.ShaderLib.lambert.fragmentShader });

test("line pools: a segment's far end in uPoolEnds (w 1), a point pool's w 0; the lit surface finds the nearest point", () => {
  const owner = {};
  setPools(
    owner,
    [
      { pos: [1, 0.2, 0], reach: 0.6, color: "#ffffff", strength: 1 },
      { from: [0, 0.2, 1], to: [0, 0.2, -9], reach: 0.8, color: "#ffffff", strength: 1 },
    ],
    [500, 0, 0],
  );
  assert.deepEqual(poolUniforms.uPoolEnds.value[0].toArray(), [0, 0, 0, 0]);
  assert.deepEqual(poolUniforms.uPools.value[1].toArray(), [500, 0.2, 1, 0.8]);
  assert.deepEqual(poolUniforms.uPoolEnds.value[1].toArray(), [500, 0.2, -9, 1]);
  for (let i = 2; i < POOLS; i++) assert.equal(poolUniforms.uPoolEnds.value[i].w, 0);
  clearPools(owner);
  const src = noComments(read(`${kit}/surface.ts`));
  assert.match(src, /uniform vec4 uPoolEnds\[\$\{POOLS\}\];/);
  assert.match(src, /if \(e\.w > 0\.5\)[\s\S]*clamp\(dot\(vKitWorld - p\.xyz, ab\)/);
});

test("floodlight falloff and the day fill: uniforms of the one lit program", () => {
  disposeShared();
  const flat = surface({ color: "#888888", glow: { tone: "#ffb454", strength: 0.3 } });
  const foot = surface({ color: "#888888", glow: { tone: "#ffb454", strength: 0.3, base: 0.1, fade: 2 } });
  assert.notEqual(flat, foot);
  assert.deepEqual(foot.userData.surface.uLitFall.value.toArray(), [0.1, 2]);
  assert.deepEqual(flat.userData.surface.uLitFall.value.toArray(), [0, 0]);
  assert.equal(foot.customProgramCacheKey(), flat.customProgramCacheKey());
  const shader = lambertShader();
  foot.onBeforeCompile(shader);
  assert.equal(shader.uniforms.uBounce, bounceUniforms.uBounce);
  assert.equal(shader.uniforms.uBounceDir, bounceUniforms.uBounceDir);
  assert.match(shader.fragmentShader, /mix\(1\.0, 0\.2, smoothstep\(0\.0, 1\.0, \(vKitWorld\.y - uLitFall\.x\) \/ uLitFall\.y\)\)/);
  const atmos = noComments(read("app/components/city3d/atmosphere/Atmosphere.tsx"));
  assert.match(atmos, /if \(def\.bounce\) bounceUniforms\.uBounce\.value\.set\(def\.bounce\.color\)\.multiplyScalar\(def\.bounce\.strength \* sunShare\);/);
  assert.match(atmos, /else bounceUniforms\.uBounce\.value\.setRGB\(0, 0, 0\);/);
  assert.match(atmos, /setNumber\(u, "uMoon", def\.moon === false \? 0 : step01\(0\.6, 1, night\)\)/);
  disposeShared();
});

test("lattice day shade: two periods and a warm sunlit share; cleared by its owner", () => {
  const owner = {};
  setShade(owner, { kind: "lattice", box: [0, -2, 1, 2], dir: [0, 1], period: 0.4, period2: 0.25, duty: 0.6, depth: 0.5, top: 1, warm: "#ffffff" }, [0, 0, 0]);
  assert.equal(shadeUniforms.uShade.value.x, 4);
  assert.equal(shadeUniforms.uShade.value.z, 0.4);
  assert.deepEqual(shadeUniforms.uShadeMore.value.toArray(), [0.25, 1, 1, 1]);
  setShade(owner, { kind: "stripes", box: [0, -2, 1, 2], period: 0.4, depth: 0.5, top: 1 }, [0, 0, 0]);
  assert.deepEqual(shadeUniforms.uShadeMore.value.toArray(), [0.4, 1, 1, 1], "no warmth unless asked");
  clearShade(owner);
  assert.equal(shadeUniforms.uShade.value.x, 0);
  assert.match(noComments(read(`${kit}/surface.ts`)), /sh = max\(a1, a2\);/);
});

test("the plain panel: the neon itself (no picture, no bars), both faces, no edge, pale by day", () => {
  const src = noComments(read(`${kit}/signs.ts`));
  assert.match(src, /export type MarkKind = SignKind \| "panel";/);
  assert.match(src, /if \(o\.kind === "panel"\) \{\s*const face = neonMaterial\([^;]*\{ dayColor: PANEL_DAY \}\);/);
  assert.match(src, /if \(kind !== "panel"\) group\.add\(edge\);/);
});

