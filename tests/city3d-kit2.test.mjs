// The second kit pass (after the gate 3 review): polished paving, window
// light per material, tree kinds and greens, line pools, tower palettes,
// a train with named parts, floodlight falloff, a day fill, a plain
// panel, a lattice day shade and a place without a moon. Pure parts run
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
const { poolUniforms, shadeUniforms, bounceUniforms, windowUniforms, materialKey, POOLS } = await import(`../${kit}/uniforms.ts`);
const { surface } = await import(`../${kit}/surface.ts`);
const { windowMaterial } = await import(`../${kit}/windows.ts`);
const { buildTowers, TOWER_STYLES } = await import(`../${kit}/towers.ts`);
const { buildStreetTrees } = await import(`../${kit}/trees.ts`);
const { buildTrain, trainLength } = await import(`../${kit}/movers.ts`);
const { buildStreaks } = await import(`../${kit}/reflection.ts`);
const { wetPaving } = await import(`../${kit}/water.ts`);
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

test("windows: lit, warm, cool and coolShare per material as uniforms; one near and one far program; the shared tones by reference otherwise", () => {
  disposeShared();
  const plain = windowMaterial({ base: "#334455", glass: "#556677" });
  const cool = windowMaterial({ base: "#334455", glass: "#556677", lit: 0.6, cool: "#8fd8ff", coolShare: 0.8 });
  assert.notEqual(plain, cool);
  assert.equal(cool, windowMaterial({ base: "#334455", glass: "#556677", lit: 0.6, cool: "#8fd8ff", coolShare: 0.8 }));
  assert.equal(plain.customProgramCacheKey(), materialKey("win", "near"));
  assert.equal(cool.customProgramCacheKey(), materialKey("win", "near"));
  assert.equal(windowMaterial({ base: "#334455", glass: "#556677", far: true, lit: 0.4 }).customProgramCacheKey(), materialKey("win", "far"));
  const a = lambertShader();
  plain.onBeforeCompile(a);
  assert.equal(a.uniforms.uWarm, windowUniforms.uWarm);
  assert.equal(a.uniforms.uCool, windowUniforms.uCool);
  assert.equal(a.uniforms.uLitFloor.value, 0);
  assert.equal(a.uniforms.uCoolShare.value, 0.07);
  const b = lambertShader();
  cool.onBeforeCompile(b);
  assert.notEqual(b.uniforms.uCool, windowUniforms.uCool);
  assert.equal(b.uniforms.uWarm, windowUniforms.uWarm);
  assert.equal(b.uniforms.uLitFloor.value, 0.6);
  assert.equal(b.uniforms.uCoolShare.value, 0.8);
  assert.equal(b.uniforms.uLitShare, windowUniforms.uLitShare);
  assert.doesNotMatch(b.fragmentShader, /#define WIN_FAR/);
  disposeShared();
});

const spec = (x, style, seed) => ({ x, z: 0, w: 3, d: 3, h: 10, ry: 0, style, seed });

test("towers: a palette dresses each tower, one mesh per style and facade; without one, a mesh per style as before", () => {
  disposeShared();
  const specs = [spec(0, 0, 1), spec(10, 0, 2), spec(20, 1, 3), spec(30, 0, 4)];
  const plain = buildTowers(specs, { far: false });
  assert.deepEqual(plain.map((m) => m.name), ["towers:0", "towers:1"]);
  assert.equal(plain[0].material, windowMaterial({ ...TOWER_STYLES[0], far: false }));
  const palettes = [{ base: "#111111", glass: "#222222" }, { base: "#333333", glass: "#444444", coolShare: 0.9 }];
  const dressed = buildTowers(specs, { far: true, palette: (t) => palettes[t.seed % 2] });
  // style 0: seeds 1 (odd), 2 (even), 4 (even): two facades; style 1: one
  assert.deepEqual(dressed.map((m) => m.name), ["towers:0:far", "towers:0:far:1", "towers:1:far"]);
  assert.deepEqual(dressed.map((m) => m.count), [1, 2, 1]);
  assert.equal(dressed[1].material, windowMaterial({ ...palettes[0], far: true }));
  assert.equal(dressed[0].material.customProgramCacheKey(), materialKey("win", "far"));
  for (const m of [...plain, ...dressed]) m.geometry.dispose();
  disposeShared();
});

test("trees: kinds by spot (a spot's kind never moves the trees round it), greens, an under-glow and leaves as uniforms", () => {
  disposeShared();
  const spots = Array.from({ length: 10 }, (_, i) => ({ x: i, z: 0, s: 1 }));
  const before = buildStreetTrees(9, spots);
  const again = buildStreetTrees(9, spots);
  assert.deepEqual(before.map((m) => m.name), again.map((m) => m.name));
  assert.ok(before.length <= 3);
  // one spot a plane tree, one a leafy clump: the others keep their shape, place and turn
  const mixed = buildStreetTrees(9, spots.map((p, i) => (i === 3 ? { ...p, kind: "plane" } : i === 6 ? { ...p, kind: "leafy" } : p)));
  const names = mixed.map((m) => m.name);
  assert.ok(names.includes("trees:plane") && names.includes("trees:plane-trunks") && names.includes("trees:leafy"));
  const trunks = mixed.find((m) => m.name === "trees:trunks");
  assert.equal(trunks.count, 8, "neither the plane nor the leafy clump on the plain trunks");
  const round = (list) => list.find((m) => m.name === "trees:round");
  const xs = (mesh) => Array.from({ length: mesh.count }, (_, i) => {
    const m = new THREE.Matrix4();
    mesh.getMatrixAt(i, m);
    return new THREE.Vector3().setFromMatrixPosition(m).x;
  });
  assert.deepEqual(xs(round(mixed)), xs(round(before)).filter((x) => x !== 3 && x !== 6));
  // the canopy's options: their own material, the same program
  const lit = buildStreetTrees(9, spots, { greens: ["#a4c34a"], underGlow: { tone: "#ffc070", strength: 0.9 }, leaves: 0.7 });
  const canopy = round(lit).material;
  assert.notEqual(canopy, round(before).material);
  assert.equal(canopy.customProgramCacheKey(), round(before).material.customProgramCacheKey());
  assert.equal(canopy.userData.canopy.uUnderStrength.value, 0.9);
  assert.equal(canopy.userData.canopy.uLeaves.value, 0.7);
  const c = new THREE.Color();
  round(lit).getColorAt(0, c);
  const g = new THREE.Color("#a4c34a");
  assert.ok(Math.abs(c.g / c.r - g.g / g.r) < 1e-4, "the green asked for, a little lighter or darker");
  for (const m of [...before, ...again, ...mixed, ...lit]) m.geometry.dispose();
  disposeShared();
});

test("train: named parts; a round nose, framed windows, its own shell and stripe; the default as before", () => {
  disposeShared();
  const plain = buildTrain(3);
  assert.deepEqual(plain.parts.cars.children.map((c) => c.name), ["train:shell", "train:windows", "train:stripe"]);
  assert.equal(plain.parts.nose, null);
  const t = buildTrain(6, { nose: "round", snout: 0.11, windows: "framed", shell: { color: "#bcc5cf", grime: 0.1 }, stripe: { day: "#2f8fb0", night: "#2f8c9c" } });
  assert.deepEqual(t.parts.cars.children.map((c) => c.name), ["train:shell", "train:windows", "train:stripe", "train:nose", "train:screen", "train:lamps", "train:coupler"]);
  assert.equal(t.parts.nose.material, t.parts.shell.material);
  assert.equal(t.parts.shell.material, surface({ color: "#bcc5cf", grime: 0.1 }));
  t.park();
  const box = new THREE.Box3().setFromObject(t.object);
  assert.ok(Math.abs(box.max.x - (trainLength(6) / 2 + 0.11 + 0.025)) < 0.01, "the nose and coupler ahead of the cars");
  t.object.userData.dispose();
  plain.object.userData.dispose();
  disposeShared();
});

test("polished paving: dry shine at night only, as long fine strokes, never doubled in rain; near lights still streak", () => {
  disposeShared();
  const lights = [{ x: 0, z: -2, w: 0.2, color: "#ffd9a8", height: 0.3 }];
  const box = { x: 0, z: 0, w: 4, d: 8 };
  const river = buildStreaks(lights, { kind: "river", mode: "fake", ...box, polish: 0.8 });
  const wet = buildStreaks(lights, { kind: "paving", mode: "fake", ...box });
  const polished = buildStreaks(lights, { kind: "paving", mode: "fake", ...box, polish: 0.8 });
  assert.equal(river.material.uniforms.uPolish.value, 0, "the river ignores polish");
  assert.equal(wet.material.uniforms.uPolish.value, 0);
  assert.equal(polished.material.uniforms.uPolish.value, 0.8);
  assert.equal(polished.material.uniforms.uFine.value, 1);
  assert.equal(polished.material.vertexShader, wet.material.vertexShader);
  assert.equal(polished.material.fragmentShader, wet.material.fragmentShader, "one program");
  const frag = polished.material.fragmentShader;
  assert.match(frag, /max\(uStrength \* mix\(0\.35, 1\.0, uNight\) \* mix\(1\.0, uWet, uGate\), uPolish \* uNight\)/);
  assert.match(polished.material.vertexShader, /max\(D - mix\(1\.0, 0\.35, uFine\), 0\.25 \* D\)/);
  const paving = wetPaving({ w: 4, d: 8, mode: "fake", lights, polish: 0.8, glow: { tone: "#ffc98a", strength: 0.1 }, snow: true });
  assert.equal(paving.mesh.material, surface({ color: "#4b4f57", wet: 1, grime: 0.3, glow: { tone: "#ffc98a", strength: 0.1 }, snow: true }));
  const streaks = paving.mesh.children.find((c) => c.name === "streaks:paving");
  assert.equal(streaks.material.uniforms.uPolish.value, 0.8);
  // left out: as before
  const before = wetPaving({ w: 4, d: 8, mode: "fake", lights });
  assert.equal(before.mesh.children.find((c) => c.name === "streaks:paving").material.uniforms.uPolish.value, 0);
  for (const g of [river, wet, polished]) g.geometry.dispose();
  paving.dispose();
  before.dispose();
  disposeShared();
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
