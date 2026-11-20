import * as THREE from "three";
import type { Mover } from "../common";
import { rng } from "../rng";
import { box, merge } from "./geometry";
import { shared } from "./materials";
import { glowMaterial } from "./street";
import { neonMaterial } from "./neon";
import { surface, type SurfaceOptions } from "./surface";
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

/** A train's length, buffer to buffer (its nose not counted) */
export const trainLength = (cars: number) => cars * (CAR + GAP) - GAP;

// A rounded nose: the car's section (a rounded box, 0.28 wide, 0.02 to
// 0.34 high) carried `snout` forward of its front at `front`, narrowing a
// little and sloping back above the windscreen's foot, closed at the tip
const noseTop = (t: number) => 0.345 - 0.19 * t ** 1.6;
const noseX = (front: number, snout: number, t: number) => front + snout * Math.sin((t * Math.PI) / 2);
function noseGeometry(front: number, snout: number): THREE.BufferGeometry {
  const RING = 16;
  const STEPS = 6;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const x = noseX(front, snout, t);
    const hw = 0.14 * (1 - 0.14 * t * t);
    const top = noseTop(t);
    const bottom = 0.02 + 0.015 * t;
    const cy = (top + bottom) / 2;
    const hh = (top - bottom) / 2;
    for (let j = 0; j < RING; j++) {
      const a = (j / RING) * Math.PI * 2;
      // a superellipse: square-ish with rounded corners
      const c = Math.cos(a);
      const sn = Math.sin(a);
      pos.push(x, cy + hh * Math.sign(sn) * Math.abs(sn) ** 0.4, hw * Math.sign(c) * Math.abs(c) ** 0.4);
    }
  }
  for (let i = 0; i < STEPS; i++)
    for (let j = 0; j < RING; j++) {
      const a = i * RING + j;
      const b = i * RING + ((j + 1) % RING);
      idx.push(a, a + RING, b, b, a + RING, b + RING);
    }
  // the tip's face
  const centre = pos.length / 3;
  const last = STEPS * RING;
  pos.push(front + snout, (noseTop(1) + 0.035) / 2, 0);
  for (let j = 0; j < RING; j++) idx.push(last + j, centre, last + ((j + 1) % RING));
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// the windscreen: dark panes laid on the nose's slope, a hair proud of it,
// and the cab's side windows
function windscreen(front: number, snout: number): THREE.BufferGeometry[] {
  const parts: THREE.BufferGeometry[] = [];
  const ts = [0.3, 0.5, 0.68, 0.84, 0.97];
  for (let i = 0; i < ts.length - 1; i++) {
    const ax = noseX(front, snout, ts[i]);
    const ay = noseTop(ts[i]);
    const bx = noseX(front, snout, ts[i + 1]);
    const by = noseTop(ts[i + 1]);
    const l = Math.hypot(bx - ax, by - ay);
    const angle = Math.atan2(by - ay, bx - ax);
    const hw = 0.14 * (1 - 0.14 * ts[i + 1] ** 2) * 0.82;
    parts.push(box(l * 1.05, 0.004, hw * 2).rotateZ(angle).translate((ax + bx) / 2 - Math.sin(angle) * 0.003, (ay + by) / 2 + Math.cos(angle) * 0.003, 0));
  }
  for (const side of [-1, 1]) parts.push(box(0.05, 0.08, 0.004).translate(front + 0.03, 0.22, side * 0.128));
  return parts;
}

export type TrainOptions = {
  span?: number;
  period?: number;
  // the leading (+x) end: "flat" (the cab's glass, as before) or "round" (a
  // tapered nose `snout` long, 0.11 by default, with a dark windscreen,
  // headlamps lit after dark and a coupler)
  nose?: "flat" | "round";
  snout?: number;
  shell?: SurfaceOptions; // the cars' body (pale grey by default)
  stripe?: { day: string; night: string }; // the stripe along each side
  windows?: "band" | "framed"; // one lit band down each side, or the band with posts between the windows
};

export type TrainParts = { cars: THREE.Group; shell: THREE.Mesh; windows: THREE.Mesh; stripe: THREE.Mesh; nose: THREE.Mesh | null; screen: THREE.Mesh | null; lamps: THREE.Mesh | null; coupler: THREE.Mesh | null };

/**
 * A metro train of `cars` cars running along +x in its object's frame,
 * from -span/2 to +span/2 (its ends out of sight: the scene places it so),
 * one pass every `period` seconds, then gone until the next. Parked, it
 * stands at x = 0. Its floor is at y = 0: stand the object on the deck.
 * Its parts are named and returned (`parts`), for a scene that hangs
 * something of its own on the cars; 3 draw calls, 7 with a round nose.
 */
export function buildTrain(cars: number, o: TrainOptions = {}): Mover & { parts: TrainParts } {
  const span = o.span ?? 70;
  const period = o.period ?? 26;
  const length = trainLength(cars);
  const front = length / 2;
  const round = o.nose === "round";
  const snout = o.snout ?? 0.11;
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
  // posts between the windows, in the body's colour, a hair proud of the band
  if (o.windows === "framed") for (const side of [-1, 1]) for (let x = -front + 0.08; x < front - 0.04; x += 0.21) body.push(box(0.035, 0.09, 0.006).translate(x, 0.22, side * 0.147));
  // the cab's glass at each flat end
  for (const end of round ? [-1] : [-1, 1]) windows.push(box(0.01, 0.1, 0.2).translate(end * (length / 2 + 0.005), 0.23, 0));
  // the object stays where the scene puts it; the cars move inside it
  const object = new THREE.Group();
  object.name = "train";
  const group = new THREE.Group();
  group.name = "train:cars";
  object.add(group);
  const shellMaterial = surface(o.shell ?? { color: "#c7ccd3" });
  const shell = new THREE.Mesh(merge(body), shellMaterial);
  shell.name = "train:shell";
  shell.castShadow = true;
  const band = new THREE.Mesh(merge(windows), glowMaterial({ day: "#3c4a58", night: "#ffe0b0" }));
  band.name = "train:windows";
  const side = new THREE.Mesh(merge(stripe), glowMaterial(o.stripe ?? { day: "#2f8fb0", night: "#4fd8ee" }));
  side.name = "train:stripe";
  group.add(shell, band, side);
  const parts: TrainParts = { cars: group, shell, windows: band, stripe: side, nose: null, screen: null, lamps: null, coupler: null };
  if (round) {
    const tip = front + snout;
    parts.nose = new THREE.Mesh(noseGeometry(front, snout), shellMaterial);
    parts.nose.castShadow = true;
    parts.screen = new THREE.Mesh(merge(windscreen(front, snout)), glowMaterial({ day: "#1c2530", night: "#0b0c10" }));
    parts.lamps = new THREE.Mesh(merge([-1, 1].map((k) => box(0.006, 0.02, 0.04).translate(tip + 0.001, 0.085, k * 0.08))), neonMaterial(HEADLAMP, { dayColor: "#5a6068" }));
    parts.coupler = new THREE.Mesh(box(0.03, 0.035, 0.06).translate(tip + 0.01, 0.04, 0), surface({ color: "#3a3e44" }));
    for (const [m, name] of [
      [parts.nose, "train:nose"],
      [parts.screen, "train:screen"],
      [parts.lamps, "train:lamps"],
      [parts.coupler, "train:coupler"],
    ] as const) {
      m.name = name;
      group.add(m);
    }
  }
  disposer(object);
  const travel = span + length;
  return {
    object,
    parts,
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

// the headlamps' warm white, at 0.55 of the neon's full (just over the bloom)
const HEADLAMP = `#${new THREE.Color("#fff1d6").multiplyScalar(0.55).getHexString()}`;

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
