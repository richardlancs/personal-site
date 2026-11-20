import * as THREE from "three";
import type { Mover } from "../common";
import { rng } from "../rng";
import { box, merge } from "./geometry";
import { shared } from "./materials";
import { glowMaterial } from "./street";
import { surface } from "./surface";
import { envUniforms, materialKey } from "./uniforms";

// The few things that move on their own: a metro train, river boats, the
// red lights blinking on the towers' tops. Each is a Mover (common.tsx),
// run by useMovers: update(t) each frame while its place shows and still
// view is off, park() otherwise (a train at rest, a boat moored mid-lane,
// the lights on and steady). Each is small and stands alone, so any one can
// be left out (the plan's cut list: river traffic and aircraft lights
// second, the moving train third).
//
// A mover's object is placed by the scene; it moves in its own frame
// (along +x). Nothing here allocates per frame. Its geometry is freed by
// `dispose` (userData.dispose), its materials are the kit's, shared.

export type { Mover };

const disposer = (object: THREE.Object3D) => {
  object.userData.dispose = () =>
    object.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose();
    });
};

// ---------------------------------------------------------------------
// The metro train

const CAR = 2; // a car's length, 20 m
const GAP = 0.06;

/**
 * A metro train of `cars` cars running along +x in its object's frame,
 * from -span/2 to +span/2 (its ends out of sight: the scene places it so),
 * one pass every `period` seconds, then gone until the next. Parked, it
 * stands at x = 0. Its floor is at y = 0: stand the object on the deck.
 */
export function buildTrain(cars: number, o: { span?: number; period?: number } = {}): Mover {
  const span = o.span ?? 70;
  const period = o.period ?? 26;
  const length = cars * (CAR + GAP) - GAP;
  const body: THREE.BufferGeometry[] = [];
  const windows: THREE.BufferGeometry[] = [];
  const stripe: THREE.BufferGeometry[] = [];
  for (let i = 0; i < cars; i++) {
    const x = -length / 2 + CAR / 2 + i * (CAR + GAP);
    body.push(box(CAR, 0.3, 0.28).translate(x, 0.17, 0));
    // a rounded roof, slightly narrower
    body.push(box(CAR * 0.97, 0.04, 0.22).translate(x, 0.34, 0));
    for (const side of [-1, 1]) {
      windows.push(box(CAR * 0.86, 0.08, 0.01).translate(x, 0.22, side * 0.142));
      stripe.push(box(CAR * 0.98, 0.025, 0.008).translate(x, 0.12, side * 0.143));
    }
  }
  // the cab's glass at each end
  for (const end of [-1, 1]) windows.push(box(0.01, 0.1, 0.2).translate(end * (length / 2 + 0.005), 0.23, 0));
  // the object stays where the scene puts it; the cars move inside it
  const object = new THREE.Group();
  object.name = "train";
  const group = new THREE.Group();
  object.add(group);
  const shell = new THREE.Mesh(merge(body), surface({ color: "#c7ccd3" }));
  shell.castShadow = true;
  group.add(shell);
  group.add(new THREE.Mesh(merge(windows), glowMaterial({ day: "#3c4a58", night: "#ffe0b0" })));
  group.add(new THREE.Mesh(merge(stripe), glowMaterial({ day: "#2f8fb0", night: "#4fd8ee" })));
  disposer(object);
  const travel = span + length;
  return {
    object,
    update(t) {
      const f = (t % period) / period;
      // a pass takes 70% of the period; the rest, the line is empty
      const k = f / 0.7;
      group.visible = k <= 1;
      group.position.x = -travel / 2 + Math.min(k, 1) * travel;
    },
    park() {
      group.visible = true;
      group.position.x = 0;
    },
  };
}

// ---------------------------------------------------------------------
// Boats on the river

/**
 * A river boat (a ferry or a tour boat, seeded) going back and forth along
 * a lane at z between x0 and x1, one way every `period` seconds, turning
 * out of sight at the ends (the scene makes the lane longer than the
 * view). Its waterline is at the object's y. Parked, it rests partway
 * along the lane, heading +x.
 */
export function buildBoat(seed: number, lane: { z: number; x0: number; x1: number; period: number }): Mover {
  const r = rng(seed);
  const L = r.range(2.6, 3.6);
  const B = L * 0.26;
  const decks = r() < 0.5 ? 1 : 2;
  // the hull: a box whose bow (+x) narrows to a point
  const hull = box(L, 0.16, B);
  const p = hull.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) if (p.getX(i) > 0) p.setZ(i, p.getZ(i) * (1 - (p.getX(i) / (L / 2)) * 0.75));
  hull.computeVertexNormals();
  hull.translate(0, 0.04, 0);
  const cabin: THREE.BufferGeometry[] = [];
  const windows: THREE.BufferGeometry[] = [];
  for (let d = 0; d < decks; d++) {
    const w = L * (0.62 - d * 0.14);
    const y = 0.12 + d * 0.13;
    const x = -L * 0.06 - d * 0.1;
    cabin.push(box(w, 0.13, B * 0.82).translate(x, y + 0.065, 0));
    for (const side of [-1, 1]) windows.push(box(w * 0.9, 0.055, 0.01).translate(x, y + 0.07, side * (B * 0.41 + 0.003)));
  }
  cabin.push(box(L * 0.5, 0.012, B * 0.86).translate(-L * 0.06 - (decks - 1) * 0.1, 0.12 + decks * 0.13 + 0.006, 0));
  // the wake: a long pale wedge behind
  const wake = new THREE.PlaneGeometry(L * 1.6, B * 0.9).rotateX(-Math.PI / 2).translate(-L * 1.25, 0.003, 0);
  const wp = wake.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < wp.count; i++) if (wp.getX(i) < -L) wp.setZ(i, wp.getZ(i) * 0.25);
  const group = new THREE.Group();
  group.name = "boat";
  const hullMesh = new THREE.Mesh(hull, surface({ color: r() < 0.5 ? "#3d3029" : "#2e3a4a" }));
  const cabinMesh = new THREE.Mesh(merge(cabin), surface({ color: "#e8dfc9" }));
  hullMesh.castShadow = cabinMesh.castShadow = true;
  group.add(hullMesh, cabinMesh, new THREE.Mesh(merge(windows), glowMaterial({ day: "#4a5866", night: "#ffcf8a" })));
  group.add(new THREE.Mesh(wake, glowMaterial({ day: "#b9c9d6", night: "#1d2b44" })));
  group.position.z = lane.z;
  disposer(group);
  const phase = r() * lane.period * 2;
  const rest = 0.3 + r() * 0.4;
  return {
    object: group,
    update(t) {
      const f = ((t + phase) % (lane.period * 2)) / lane.period;
      const out = f < 1;
      const k = out ? f : 2 - f;
      group.position.x = lane.x0 + (lane.x1 - lane.x0) * k;
      group.rotation.y = out === lane.x1 > lane.x0 ? 0 : Math.PI;
    },
    park() {
      group.position.x = lane.x0 + (lane.x1 - lane.x0) * rest;
      group.rotation.y = lane.x1 > lane.x0 ? 0 : Math.PI;
    },
  };
}

// ---------------------------------------------------------------------
// Aircraft warning lights

// Red, blinking together every 1.2 s, each a little out of step; dim by
// day, full at night; on and steady while parked. Under 1.0: no bloom.
const airUniforms = { uTime: { value: 0 }, uSteady: { value: 1 } };

function airMaterial() {
  return shared(materialKey("air", "lights"), () => {
    const m = new THREE.MeshBasicMaterial({ color: "#ff2f24" });
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, airUniforms, { uNight: envUniforms.uNight });
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float aPhase;\nvarying float vPhase;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvPhase = aPhase;");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uTime;\nuniform float uSteady;\nuniform float uNight;\nvarying float vPhase;")
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
float f = fract((uTime + vPhase) / 1.2);
float on = smoothstep(0.0, 0.05, f) * (1.0 - smoothstep(0.35, 0.45, f));
diffuseColor.rgb *= mix(mix(0.12, 1.0, on), 1.0, uSteady) * mix(0.3, 0.95, uNight);`,
        );
    };
    m.customProgramCacheKey = () => materialKey("air", "lights");
    return m;
  });
}

/** Red warning lights at `points` (rooftops, masts): one InstancedMesh, one draw call */
export function aircraftLights(seed: number, points: THREE.Vector3[]): Mover {
  const r = rng(seed);
  const geometry = new THREE.OctahedronGeometry(0.06, 0);
  geometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(new Float32Array(points.map(() => r() * 0.15)), 1));
  const mesh = new THREE.InstancedMesh(geometry, airMaterial(), points.length);
  const m = new THREE.Matrix4();
  points.forEach((p, i) => mesh.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z)));
  mesh.computeBoundingSphere();
  mesh.name = "aircraft-lights";
  disposer(mesh);
  return {
    object: mesh,
    update(t) {
      airUniforms.uSteady.value = 0;
      airUniforms.uTime.value = t;
    },
    park() {
      airUniforms.uSteady.value = 1;
    },
  };
}
