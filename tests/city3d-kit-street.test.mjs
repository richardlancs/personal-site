// The city kit's water, reflections, streets, trees and movers
// (app/components/city3d/kit/{water,reflection,street,trees,movers}.ts):
// a Reflector only on the planar path (no multisampling, the custom
// shader, its camera on REFLECT_LAYER alone), surfaces that dispose,
// movers that park, instanced trees, and no light anywhere in the kit.
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
const { REFLECT_LAYER, buildReflection, reflectIn } = await import(`../${kit}/reflection.ts`);
const { buildRiver, wetPaving } = await import(`../${kit}/water.ts`);
const { buildLamp, buildLampRow, buildRailing, buildViaduct } = await import(`../${kit}/street.ts`);
const { buildStreetTrees } = await import(`../${kit}/trees.ts`);
const { aircraftLights, buildBoat, buildTrain } = await import(`../${kit}/movers.ts`);
const { envUniforms } = await import(`../${kit}/uniforms.ts`);

const lights = [
  { x: -10, z: -50, w: 1.2, color: "#4fd8ee", height: 12 },
  { x: 4, z: -55, w: 0.8, color: "#ffb454", height: 20 },
];

test("REFLECT_LAYER is 2, never postprocessing's selection layer 11", () => {
  assert.equal(REFLECT_LAYER, 2);
  assert.notEqual(REFLECT_LAYER, 11);
});

test("reflection.ts creates a Reflector only when mode is planar", () => {
  const src = noComments(read(`${kit}/reflection.ts`));
  assert.equal(src.match(/new Reflector\(/g)?.length, 1, "one place makes a Reflector");
  assert.match(src, /if \(o\.mode !== "planar"\) return null;\s*[\s\S]*new Reflector\(/, "behind the planar check");
  assert.equal(buildReflection({ mode: "fake", kind: "river", w: 10, d: 10 }), null);
  const r = buildReflection({ mode: "planar", kind: "river", w: 10, d: 10, size: 512 });
  assert.ok(r?.isReflector);
  assert.equal(r.getRenderTarget().width, 512);
  r.dispose();
});

test("the Reflector has no multisampling and a custom shader", () => {
  const src = noComments(read(`${kit}/reflection.ts`));
  const call = src.slice(src.indexOf("new Reflector("), src.indexOf("});", src.indexOf("new Reflector(")));
  assert.match(call, /multisample: 0/);
  assert.match(call, /shader: reflectorShader\(/);
  const r = buildReflection({ mode: "planar", kind: "river", w: 10, d: 10 });
  assert.equal(r.getRenderTarget().samples, 0);
  assert.equal(r.material.name, "water:planar:river", "drawn through the kit's shader, not three's ReflectorShader");
  assert.equal(r.material.uniforms.uNight, envUniforms.uNight, "the shared night, by reference");
  r.dispose();
});

test("the reflection camera sees REFLECT_LAYER only", () => {
  const r = buildReflection({ mode: "planar", kind: "river", w: 10, d: 10 });
  const camera = new THREE.PerspectiveCamera();
  camera.layers.enableAll();
  const reflected = r.getReflectionCamera(camera);
  assert.equal(reflected.layers.mask, 1 << REFLECT_LAYER);
  const thing = new THREE.Group().add(new THREE.Mesh());
  reflectIn(thing);
  thing.traverse((o) => assert.ok(o.layers.isEnabled(REFLECT_LAYER) && o.layers.isEnabled(0)));
  r.dispose();
});

test("buildRiver and wetPaving return a mesh and dispose, on both paths", () => {
  for (const mode of ["fake", "planar"]) {
    const river = buildRiver({ w: 200, d: 25, mode, lights, z: -37.5, y: 0.03 });
    assert.ok(river.mesh.isMesh);
    assert.equal(typeof river.dispose, "function");
    assert.equal(!!river.mesh.isReflector, mode === "planar");
    const streaks = river.mesh.getObjectByName("streaks:river");
    assert.equal(streaks.geometry.instanceCount, lights.length, "one draw call for every strip");
    // the streaks' frame is the parent's, lifted to the water
    river.mesh.updateMatrixWorld(true);
    const e = streaks.matrixWorld.elements;
    assert.ok(Math.abs(e[12]) < 1e-9 && Math.abs(e[13] - 0.03) < 1e-9 && Math.abs(e[14]) < 1e-9, `${e.slice(12, 15)}`);
    let freed = 0;
    streaks.geometry.addEventListener("dispose", () => freed++);
    river.dispose();
    assert.equal(freed, 1);

    const paving = wetPaving({ w: 20, d: 6, mode, lights, z: 4 });
    assert.ok(paving.mesh.isMesh);
    assert.equal(!!paving.mesh.children.find((c) => c.isReflector), mode === "planar");
    paving.mesh.geometry.addEventListener("dispose", () => freed++);
    paving.dispose();
    assert.equal(freed, 2);
  }
});

test("every mover has update and park, and parks where it says", () => {
  const train = buildTrain(4);
  train.object.position.set(-50, 2.9, -18);
  const boat = buildBoat(7, { z: -30, x0: -80, x1: 80, period: 60 });
  const air = aircraftLights(3, [new THREE.Vector3(0, 30, -60), new THREE.Vector3(5, 22, -70)]);
  for (const m of [train, boat, air]) {
    assert.equal(typeof m.park, "function");
    assert.equal(typeof m.update, "function");
    assert.ok(m.object.isObject3D);
    m.update(12.3);
    m.park();
  }
  assert.equal(train.object.position.x, -50, "the train's object stays where the scene put it");
  assert.equal(train.object.children[0].position.x, 0, "parked mid-line");
  assert.equal(train.object.children[0].visible, true);
  train.update(25);
  assert.equal(train.object.children[0].visible, false, "between passes the line is empty");
  for (const t of [0, 10, 33, 59, 61, 100, 119]) {
    boat.update(t);
    assert.ok(boat.object.position.x >= -80 - 1e-9 && boat.object.position.x <= 80 + 1e-9);
    assert.equal(boat.object.position.z, -30);
  }
  assert.ok(air.object.isInstancedMesh);
  assert.equal(air.object.count, 2);
});

test("buildStreetTrees returns InstancedMeshes: one tree per spot, at most three draw calls", () => {
  const spots = Array.from({ length: 40 }, (_, i) => ({ x: i * 1.5, z: -48, s: 0.8 + (i % 3) * 0.1 }));
  const meshes = buildStreetTrees(5, spots);
  assert.ok(meshes.length >= 2 && meshes.length <= 3);
  for (const m of meshes) assert.ok(m.isInstancedMesh);
  assert.equal(meshes[0].count, 40, "a trunk each");
  assert.equal(meshes.slice(1).reduce((n, m) => n + m.count, 0), 40, "a crown each");
  const again = buildStreetTrees(5, spots);
  assert.deepEqual(again[1].instanceMatrix.array, meshes[1].instanceMatrix.array, "seeded");
});

test("lamps, railings and the viaduct build", () => {
  const lamp = buildLamp({ light: "spot" });
  assert.ok(lamp.group.isGroup && lamp.head.y > 0.5);
  assert.equal(lamp.group.children.length, 2, "a spot lamp has no pool of its own");
  assert.equal(buildLamp().group.children.length, 3);
  const row = buildLampRow([{ x: 0, z: 0 }, { x: 2, z: 0, ry: Math.PI }]);
  assert.ok(row.meshes.every((m) => m.isInstancedMesh && m.count === 2));
  assert.equal(row.heads.length, 2);
  assert.ok(buildRailing([new THREE.Vector3(0, 0, 0), new THREE.Vector3(5, 0, 0)]).isMesh);
  assert.ok(buildViaduct([new THREE.Vector3(-30, 2.9, -31), new THREE.Vector3(30, 2.9, -31)], { width: 0.9 }).isMesh);
});

test("no kit file creates a light", () => {
  for (const file of readdirSync(`${root}${kit}`)) {
    const src = noComments(read(`${kit}/${file}`));
    assert.doesNotMatch(src, /new THREE\.\w*Light\(/, file);
    assert.doesNotMatch(src, /\b(Spot|Point|Directional|Hemisphere|Ambient|RectArea)Light\b/, file);
  }
});
