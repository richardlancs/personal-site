import * as THREE from "three";
import { at, blob, box, buildVine, merge, tube, wire } from "./geometry";
import { tuftsAt } from "./vegetation/grass";
import { mesh, paint, windUniforms, type PaintOptions } from "./paint";
import { rng } from "./rng";
import { waterUniforms } from "./atmosphere/state";
import { envUniforms } from "./environment";
import { BEAM, NEON, glowUniforms, lampBeam, neon, neonSign, neonTube } from "./glow";
import { world } from "./store";
import { enamel, flagstones, notice, planks, plaster, singleLeaves, softDot, textPanel } from "./textures";

// Props: the things people left behind, modelled from parts. Each builder
// returns a group, plus handles for anything that moves.

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const mats = new Map<string, THREE.MeshLambertMaterial>();
export function mat(key: string, make: () => THREE.MeshLambertMaterial) {
  let m = mats.get(key);
  if (!m) {
    m = make();
    m.name = key; // for the visibility check (docs/world/scripts/visibility.mjs)
    mats.set(key, m);
  }
  return m;
}

// (also the far city's roofs, with its own fog: buildings.ts, buildCity)
export const CONCRETE: PaintOptions = { color: "#a8a293", brush: 0.35, brushScale: 1.2, moss: 0.35, grime: 0.7, grimeHeight: 2 };

export const M = {
  wood: () => mat("wood", () => paint({ map: planks("light"), brush: 0.25, brushScale: 2, moss: 0.25, grime: 0.4 })),
  darkWood: () => mat("darkWood", () => paint({ map: planks("dark"), brush: 0.25, brushScale: 2, moss: 0.3, grime: 0.4 })),
  redWood: () => mat("redWood", () => paint({ map: planks("red"), brush: 0.25, brushScale: 2, moss: 0.2, grime: 0.3 })),
  iron: () => mat("iron", () => paint({ color: "#3d3f38", brush: 0.3, brushScale: 3, rust: 0.6 })),
  rust: () => mat("rust", () => paint({ color: "#8a4b2c", brush: 0.4, brushScale: 3, rust: 0.8 })),
  green: () => mat("green", () => paint({ map: enamel(140, 28, 34), brush: 0.2, brushScale: 2, rust: 0.1, grime: 0.5, moss: 0.2 })),
  stone: () => mat("stone", () => paint({ color: "#b4ab96", brush: 0.35, brushScale: 1.5, moss: 0.55, grime: 0.6, grimeHeight: 0.8 })),
  concrete: () => mat("concrete", () => paint(CONCRETE)),
  paving: () => mat("paving", () => paint({ map: flagstones(), brush: 0.18, brushScale: 0.6, side: THREE.DoubleSide })),
  plaster: () => mat("plaster", () => paint({ map: plaster("cream"), brush: 0.15, grime: 0.6, grimeHeight: 1.5, moss: 0.15 })),
  glass: () =>
    mat("glass", () =>
      paint({ color: "#c9d8cf", transparent: true, opacity: 0.22, brush: 0.4, brushScale: 3, grime: 0.8, side: THREE.DoubleSide, depthWrite: false }),
    ),
  lampGlow: () => mat("lampGlow", () => paint({ color: "#fff1c9", emissive: "#ffd99a", emissiveIntensity: 1.4, brush: 0, glow: { night: 1.6 } })),
  // A lamp that only comes on when it's dark
  lampNight: () => mat("lampNight", () => paint({ color: "#d8d4c2", emissive: "#ffd99a", emissiveIntensity: 2.2, brush: 0, glow: { day: 0, night: 1 } })),
  // Inside a lamp's shade: pale enamel, lit by the bulb after dark
  lampShade: () => mat("lampShade", () => paint({ color: "#e8e2cf", emissive: "#ffcf8a", emissiveIntensity: 0.55, brush: 0.1, side: THREE.BackSide, glow: { day: 0, night: 1 } })),
  paper: () => mat("paper", () => paint({ color: "#efe6cf", brush: 0.15, brushScale: 4 })),
};

const card = (w: number, h: number) => new THREE.PlaneGeometry(w, h);

// ---------------------------------------------------------------------

export function buildBench({ bag = false } = {}) {
  const g = new THREE.Group();
  const slats: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) slats.push(at(box(1.7, 0.04, 0.09, 1), 0, 0.46, -0.16 + i * 0.11));
  for (let i = 0; i < 3; i++) slats.push(at(box(1.7, 0.09, 0.035, 1), 0, 0.62 + i * 0.12, -0.25, 0, -0.18));
  g.add(mesh(merge(slats), M.wood()));
  const legs: THREE.BufferGeometry[] = [];
  for (const x of [-0.72, 0.72]) {
    legs.push(at(box(0.05, 0.46, 0.05), x, 0.23, 0.15), at(box(0.05, 0.9, 0.05), x, 0.45, -0.24, 0, -0.18), at(box(0.05, 0.05, 0.45), x, 0.44, -0.04));
  }
  g.add(mesh(merge(legs), M.iron()));
  if (bag) {
    // A school bag, left as if someone meant to come back for it
    const r = rng(3);
    const bagMat = mat("bag", () => paint({ color: "#2e4a6b", brush: 0.3, brushScale: 4, grime: 0.4 }));
    const b = mesh(blob(r, 0.2, 1, 0.08, 2).scale(1.1, 1.2, 0.6), bagMat);
    b.position.set(0.35, 0.68, -0.05);
    b.rotation.set(-0.1, 0.2, 0.05);
    g.add(b);
    const strap = mesh(tube([v(0.2, 0.75, 0.04), v(0.25, 0.55, 0.12), v(0.45, 0.55, 0.12), v(0.5, 0.75, 0.04)], () => 0.015, 10, 4), bagMat);
    g.add(strap);
  }
  return g;
}

// A street lamp: an enamel shade on an iron arm, the bulb up inside it
// behind a frosted lens. The one left on glows by day; at night they all
// come on (atmosphere/Atmosphere.tsx), each a spotlight at the bulb aimed
// straight down, with its beam in the air under it (glow.ts: lampBeam).
// `light`: "shadow" for a lamp near the main view (its light is stopped
// by what stands in it, on the desktop tiers), "plain" for one without
// shadows, "none" for no light of its own.
export const LAMP = { x: 0.55, lens: 3.7, bulb: 3.77, night: 11 };
export function buildLamp({ lit = false, light = "plain" as "shadow" | "plain" | "none" } = {}) {
  const g = new THREE.Group();
  const { x, lens, bulb } = LAMP;
  g.add(mesh(merge([tube([v(0, 0, 0), v(0, 2, 0), v(0, 3.4, 0), v(0.12, 3.75, 0), v(0.5, 3.88, 0)], (t) => 0.07 - t * 0.03, 12, 6), at(box(0.22, 0.25, 0.22), 0, 0.12, 0)]), M.iron()));
  // The shade: open underneath, enamel outside, a pale reflector inside
  // that catches the bulb's light
  g.add(mesh(merge([at(new THREE.CylinderGeometry(0.06, 0.2, 0.17, 16, 1, true), x, lens + 0.085, 0), at(new THREE.CircleGeometry(0.06, 16).rotateX(-Math.PI / 2), x, lens + 0.17, 0)]), M.green()));
  g.add(mesh(at(new THREE.CylinderGeometry(0.055, 0.19, 0.16, 16, 1, true), x, lens + 0.085, 0), M.lampShade(), { cast: false }));
  // The bulb, up inside, and the frosted lens it shines through
  const glass = lit ? M.lampGlow() : M.lampNight();
  g.add(mesh(at(new THREE.SphereGeometry(0.05, 10, 8), x, bulb, 0), glass, { cast: false }));
  g.add(mesh(at(new THREE.CircleGeometry(0.185, 20).rotateX(Math.PI / 2), x, lens + 0.004, 0), glass, { cast: false, receive: false }));
  if (light !== "none") {
    // The light itself, at the bulb, straight down, soft at the edge of
    // its cone. 0 by day (the atmosphere brings it up), so the night
    // never asks for new shaders.
    const spot = new THREE.SpotLight(NEON.lamp, 0, 11, 0.62, 0.85, 1.6);
    spot.position.set(x, bulb - 0.03, 0);
    spot.target.position.set(x, 0, 0);
    spot.userData.atmos = "spot";
    spot.userData.night = LAMP.night;
    if (light === "shadow" && world.get().quality !== "mobile") {
      spot.castShadow = true;
      spot.shadow.mapSize.set(512, 512);
      spot.shadow.camera.near = 0.12;
      spot.shadow.bias = -0.0008;
      spot.shadow.normalBias = 0.03;
      spot.shadow.radius = 3;
      // Drawn only while it's lit (Atmosphere.tsx), and once at the start:
      // the shaders sample it whether it's lit or not, so it must exist
      spot.shadow.autoUpdate = false;
      spot.shadow.needsUpdate = true;
    }
    g.add(spot, spot.target);
    // Its beam in the air, from the lens to the ground
    const beam = lampBeam(lens + BEAM.apexAboveLens);
    beam.position.set(x, lens + BEAM.apexAboveLens, 0);
    g.add(beam);
  }
  return g;
}

// A wooden utility pole with a crossarm
export function buildPole() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.11, 0.15, 9, 7).translate(0, 4.5, 0), M.darkWood()));
  g.add(mesh(at(box(1.8, 0.1, 0.1), 0, 8.2, 0), M.darkWood()));
  g.add(mesh(merge([at(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 5), -0.7, 8.3, 0), at(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 5), 0.7, 8.3, 0)]), M.paper()));
  return g;
}

export function buildWires(poles: THREE.Vector3[], heights = [8.3], spread = 0.7) {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < poles.length - 1; i++) {
    for (const h of heights)
      for (const s of [-spread, spread]) {
        const a = poles[i].clone().add(v(s, h, 0));
        const b = poles[i + 1].clone().add(v(s, h, 0));
        parts.push(wire(a, b, a.distanceTo(b) * 0.06));
      }
  }
  return mesh(merge(parts), mat("wire", () => paint({ color: "#2a2a26", brush: 0 })), { cast: false });
}

export function buildVending() {
  const g = new THREE.Group();
  const front = textPanel("vending", 256, 512, {
    background: "#c9d4cf",
    lines: [{ text: "Ice cold", size: 22, color: "#3a6ea5", weight: 700 }],
  });
  const body = mesh(box(0.95, 1.85, 0.72), mat("vendingBody", () => paint({ map: enamel(200, 18, 70), rust: 0.35, grime: 0.6 })));
  body.position.y = 0.95;
  g.add(body);
  const face = new THREE.Mesh(card(0.8, 1.15), mat("vendingFace", () => paint({ map: front, emissive: "#30402f", emissiveIntensity: 0.25, brush: 0.2 })));
  face.position.set(0, 1.25, 0.362);
  g.add(face);
  // Rows of cans behind the glass, faded to pale
  const r = rng(11);
  const cans: THREE.BufferGeometry[] = [];
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 6; col++) cans.push(at(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 8), -0.28 + col * 0.11, 1.62 - row * 0.3, 0.33));
  const canMat = mat("cans", () => paint({ color: "#d59b8a", brush: 0.5, brushScale: 8 }));
  g.add(mesh(merge(cans), canMat, { cast: false }));
  void r;
  return g;
}

// ---------------------------------------------------------------------
// The phone booth: green frame, glass, a door on a hinge, the phone, a
// light that still comes on

export function buildBooth() {
  const g = new THREE.Group();
  const W = 1.0;
  const H = 2.3;
  const frame: THREE.BufferGeometry[] = [];
  for (const [x, z] of [
    [-W / 2, -W / 2],
    [W / 2, -W / 2],
    [-W / 2, W / 2],
    [W / 2, W / 2],
  ])
    frame.push(at(box(0.07, H, 0.07), x, H / 2 + 0.12, z));
  // Rails top, middle and bottom on the three fixed sides
  for (const y of [0.16, 0.95, H + 0.08]) {
    frame.push(at(box(W, 0.06, 0.06), 0, y, -W / 2), at(box(0.06, 0.06, W), -W / 2, y, 0), at(box(0.06, 0.06, W), W / 2, y, 0));
  }
  frame.push(at(box(W, 0.06, 0.06), 0, H + 0.08, W / 2));
  g.add(mesh(merge(frame), M.green()));
  // Roof cap and the sign on each side
  g.add(mesh(at(box(W + 0.18, 0.16, W + 0.18), 0, H + 0.2, 0), M.green()));
  g.add(mesh(at(box(W + 0.24, 0.05, W + 0.24), 0, H + 0.3, 0), mat("boothRoof", () => paint({ map: enamel(140, 22, 28), rust: 0.6, moss: 0.8, grime: 0.3 }))));
  // Neon letters on a navy board, like the buildings' (glow.ts: neonSign)
  const sign = neonSign("booth-sign-en", [256, 64], [0.8, 0.2], [{ text: "Telephone", size: 36 }], { halo: 5, padding: 6, grime: 0 });
  const signWords = sign.letters;
  const frames: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(card(0.8, 0.2), sign.face);
    const a = (i * Math.PI) / 2;
    s.position.set(Math.sin(a) * (W / 2 + 0.1), H + 0.2, Math.cos(a) * (W / 2 + 0.1));
    s.rotation.y = a;
    // Its words in neon
    const words = new THREE.Mesh(signWords.geometry, signWords.material);
    words.renderOrder = 1;
    words.position.z = 0.004;
    s.add(words);
    g.add(s);
    // A thin neon frame round it
    frames.push(at(neonTube(0.8, 0.2, 0.007, 0.03), Math.sin(a) * (W / 2 + 0.106), H + 0.2, Math.cos(a) * (W / 2 + 0.106), a));
  }
  g.add(new THREE.Mesh(merge(frames), mat("neonBlue", () => neon(NEON.blue))));
  // Base
  g.add(mesh(at(box(W + 0.12, 0.12, W + 0.12), 0, 0.06, 0), M.concrete()));
  // Glass on the three fixed sides
  const glass: THREE.BufferGeometry[] = [];
  glass.push(at(card(W - 0.06, H - 0.12), 0, H / 2 + 0.14, -W / 2), at(card(W - 0.06, H - 0.12), -W / 2, H / 2 + 0.14, 0, Math.PI / 2), at(card(W - 0.06, H - 0.12), W / 2, H / 2 + 0.14, 0, Math.PI / 2));
  g.add(mesh(merge(glass), M.glass(), { cast: false, receive: false }));

  // The door, hinged on its left edge
  const door = new THREE.Group();
  door.position.set(-W / 2, 0, W / 2);
  const doorFrame = merge([
    at(box(0.05, H - 0.1, 0.05), 0.03, H / 2 + 0.12, 0),
    at(box(0.05, H - 0.1, 0.05), W - 0.05, H / 2 + 0.12, 0),
    at(box(W - 0.06, 0.06, 0.05), W / 2 - 0.01, 0.2, 0),
    at(box(W - 0.06, 0.06, 0.05), W / 2 - 0.01, 0.95, 0),
    at(box(W - 0.06, 0.06, 0.05), W / 2 - 0.01, H + 0.02, 0),
  ]);
  door.add(mesh(doorFrame, M.green()));
  door.add(mesh(at(card(W - 0.1, H - 0.2), W / 2 - 0.01, H / 2 + 0.12, 0), M.glass(), { cast: false, receive: false }));
  door.add(mesh(at(box(0.04, 0.3, 0.06), W - 0.14, 1.1, 0.05), mat("chrome", () => paint({ color: "#b9b4a2", brush: 0.3, rust: 0.4 }))));
  g.add(door);

  // The phone on the back wall
  const phoneMat = mat("phone", () => paint({ map: enamel(110, 38, 52), brush: 0.15, grime: 0.3 }));
  const phone = new THREE.Group();
  phone.position.set(0, 1.35, -W / 2 + 0.1);
  phone.add(mesh(box(0.26, 0.36, 0.14), phoneMat));
  const keys: THREE.BufferGeometry[] = [];
  for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) keys.push(at(box(0.03, 0.025, 0.015), 0.02 + (col - 1) * 0.045, -0.05 - row * 0.035, 0.075));
  phone.add(mesh(merge(keys), mat("keys", () => paint({ color: "#e9e4d2", brush: 0.1 })), { cast: false }));
  phone.add(new THREE.Mesh(at(card(0.14, 0.05), 0.02, 0.1, 0.071), mat("lcd", () => paint({ color: "#9fb39a", emissive: "#6f8f6a", emissiveIntensity: 0.4 }))));
  // The receiver on its hook, on the left of the phone
  const receiver = new THREE.Group();
  receiver.position.set(-0.17, 0.02, 0.06);
  receiver.add(mesh(merge([at(box(0.045, 0.24, 0.05), 0, 0, 0), at(box(0.06, 0.06, 0.075), 0, 0.12, 0.015), at(box(0.06, 0.06, 0.075), 0, -0.12, 0.015)]), phoneMat));
  phone.add(receiver);
  // The cord, coiled
  const coil: THREE.Vector3[] = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    coil.push(v(-0.13 + Math.cos(t * 40) * 0.015, -0.16 - t * 0.12 + Math.sin(t * 3.1) * 0.02, 0.05 + Math.sin(t * 40) * 0.015));
  }
  phone.add(mesh(tube(coil, () => 0.006, 120, 4), mat("cord", () => paint({ color: "#2b2f27", brush: 0 })), { cast: false }));
  g.add(phone);
  // A shelf with the phone book
  g.add(mesh(at(box(0.6, 0.03, 0.26), 0, 1.0, -W / 2 + 0.15), M.wood()));
  g.add(mesh(at(box(0.22, 0.05, 0.16), 0.12, 1.04, -W / 2 + 0.15, 0.2), mat("book", () => paint({ color: "#b8a26a", brush: 0.3, brushScale: 6 }))));
  // The light under the roof
  const tubeMat = paint({ color: "#fff6d8", emissive: "#ffe2a8", emissiveIntensity: 1.6, brush: 0 });
  g.add(new THREE.Mesh(at(box(0.5, 0.03, 0.08), 0, H + 0.05, 0), tubeMat));
  const light = new THREE.PointLight("#ffd79a", 2.2, 4.5, 1.6);
  light.position.set(0, H - 0.1, 0);
  g.add(light);
  // Ivy up the back corner
  g.add(buildVine(21, [v(W / 2 + 0.05, 0, -W / 2 - 0.05), v(W / 2 + 0.06, 0.8, -W / 2 - 0.02), v(W / 2 + 0.04, 1.6, -W / 2 - 0.06), v(W / 2 - 0.1, 2.4, -W / 2 - 0.05), v(0, 2.42, -W / 2 - 0.08)], 0.28));
  return { group: g, door, receiver, light, tubeMat };
}

// ---------------------------------------------------------------------

export function buildBicycle() {
  const g = new THREE.Group();
  const bike = M.rust();
  const wheel = (x: number) => {
    const parts: THREE.BufferGeometry[] = [new THREE.TorusGeometry(0.33, 0.022, 6, 28).translate(x, 0.34, 0)];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI;
      parts.push(at(new THREE.CylinderGeometry(0.004, 0.004, 0.64, 3), x, 0.34, 0, 0, 0, a));
    }
    return parts;
  };
  const frame = [
    ...wheel(-0.52),
    ...wheel(0.52),
    tube([v(-0.52, 0.34, 0), v(-0.05, 0.38, 0), v(0.35, 0.78, 0)], () => 0.02, 6, 5),
    tube([v(-0.52, 0.34, 0), v(-0.15, 0.82, 0)], () => 0.018, 4, 5),
    tube([v(-0.15, 0.82, 0), v(0.38, 0.82, 0)], () => 0.02, 4, 5),
    tube([v(-0.05, 0.38, 0), v(-0.15, 0.82, 0)], () => 0.022, 4, 5),
    tube([v(0.52, 0.34, 0), v(0.42, 0.85, 0), v(0.4, 1.0, 0)], () => 0.02, 6, 5),
    tube([v(0.4, 1.0, -0.25), v(0.42, 1.02, 0), v(0.4, 1.0, 0.25)], () => 0.015, 6, 5),
    tube([v(-0.15, 0.82, 0), v(-0.18, 0.92, 0)], () => 0.015, 3, 5),
  ];
  g.add(mesh(merge(frame), bike));
  g.add(mesh(blob(rng(5), 0.11, 0.5, 0.05).scale(1.4, 1, 0.8).translate(-0.19, 0.95, 0), mat("saddle", () => paint({ color: "#3a2a20", brush: 0.3 }))));
  // A basket of dried flowers on the front
  const basket = mesh(at(box(0.3, 0.2, 0.32), 0.62, 0.95, 0), mat("basket", () => paint({ color: "#9c7a4c", brush: 0.5, brushScale: 10 })));
  g.add(basket);
  const r = rng(9);
  const flowers: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 9; i++) flowers.push(blob(r, 0.05, 1, 0.3, 0).translate(0.62 + r.range(-0.1, 0.1), 1.08 + r.range(0, 0.08), r.range(-0.12, 0.12)));
  g.add(mesh(merge(flowers), mat("dried", () => paint({ color: "#c28a6a", brush: 0.5, brushScale: 10 }))));
  // Ivy has taken the back wheel
  g.add(buildVine(12, [v(-0.9, 0, 0.1), v(-0.75, 0.3, 0.05), v(-0.52, 0.66, 0), v(-0.3, 0.45, -0.05), v(-0.2, 0.1, 0.1)], 0.2));
  return g;
}

// The swing: a frame, two seats on chains. `seats` turn on their pivot.
export function buildSwing() {
  const g = new THREE.Group();
  const legs: THREE.BufferGeometry[] = [];
  for (const x of [-1.4, 1.4])
    for (const z of [-0.8, 0.8]) legs.push(tube([v(x * 1.08, 0, z), v(x, 2.4, 0)], () => 0.045, 3, 6));
  legs.push(tube([v(-1.45, 2.4, 0), v(1.45, 2.4, 0)], () => 0.05, 3, 6));
  g.add(mesh(merge(legs), M.rust()));
  const seats: THREE.Group[] = [];
  for (const x of [-0.65, 0.65]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 2.38, 0);
    const chains = merge([at(box(0.012, 1.9, 0.012), -0.2, -0.95, 0), at(box(0.012, 1.9, 0.012), 0.2, -0.95, 0)]);
    pivot.add(mesh(chains, M.iron(), { cast: false }));
    pivot.add(mesh(at(box(0.5, 0.04, 0.2), 0, -1.9, 0), M.wood()));
    g.add(pivot);
    seats.push(pivot);
  }
  return { group: g, seats };
}

// The water in the fountain's basin, long since a small still pond. Unlit
// (it shows what's round it, not the sun's shading), and made of:
// - depth: a deep green-brown in the middle, lighter over the shallow
//   stone at its edge and round the column's foot
// - ripples, as a gently moving slope: two slow trains crossing in the
//   breeze and a few rings opening and fading on their own long beats
//   (something touched the water); rings where the jet comes down, and
//   where rain lands
// - reflections, broken by that slope: the sky, the ragged dark line of
//   the trees and walls round the park, the column upside down in the
//   middle, and after dark each nearby light (`reflect`) as a soft streak
//   drawn out toward the eye, the way light lies on rippled water
// Everything follows the hour and the weather (atmosphere/state.ts,
// environment.ts, glow.ts) and the world's clock, which stops in still
// view, so the water holds still too.
export const WATER_LIGHTS = 4;
export function waterMaterial(color = "#2f3d2b", shallow = "#6f7550", sky = "#cdb486") {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: windUniforms.uTime,
      uColor: { value: new THREE.Color(color) },
      uShallow: { value: new THREE.Color(shallow) },
      uSky: { value: new THREE.Color(sky) },
      uSplash: { value: 0 }, // 0 to 1: how hard water is falling into it
      ...waterUniforms, // the weather and the hour (atmosphere/state.ts)
      uWet: envUniforms.uWet, // rain falling on it
      uNight: envUniforms.uNight,
      uLamps: glowUniforms.uLamps,
      uSigns: glowUniforms.uSigns,
      uHaze: glowUniforms.uHaze,
      // The lights it reflects (world positions, set as it's drawn), their
      // colours, their half size in metres (width, height) and whether
      // each is a sign (1) or a lamp (0)
      uLightPos: { value: Array.from({ length: WATER_LIGHTS }, () => new THREE.Vector3(0, -100, 0)) },
      uLightCol: { value: Array.from({ length: WATER_LIGHTS }, () => new THREE.Color(0, 0, 0)) },
      uLightSize: { value: Array.from({ length: WATER_LIGHTS }, () => new THREE.Vector2(0.1, 0.1)) },
      uLightSign: { value: new THREE.Vector4() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec2 vLocal;
      void main() {
        vLocal = position.xz;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      #define LIGHTS ${WATER_LIGHTS}
      uniform float uTime;
      uniform vec3 uColor;
      uniform vec3 uShallow;
      uniform vec3 uSky;
      uniform float uSplash;
      uniform vec3 uSkyTint;
      uniform float uLight;
      uniform vec3 uSkyNow;
      uniform float uWet;
      uniform float uNight;
      uniform float uLamps;
      uniform float uSigns;
      uniform float uHaze;
      uniform vec3 uLightPos[LIGHTS];
      uniform vec3 uLightCol[LIGHTS];
      uniform vec2 uLightSize[LIGHTS];
      uniform vec4 uLightSign;
      varying vec3 vWorld;
      varying vec2 vLocal;
      float wh(vec2 c) { return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453); }
      float vn(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(wh(i), wh(i + vec2(1.0, 0.0)), f.x), mix(wh(i + vec2(0.0, 1.0)), wh(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      // The slope of one slow ring, opening from c over \`period\` seconds
      // and fading as it goes
      vec2 ring(vec2 q, vec2 c, float t, float period, float amp) {
        float k = fract(t / period);
        vec2 d = q - c;
        float r = length(d) + 1e-4;
        float x = r - k * 1.7;
        float env = exp(-x * x * 16.0) * (1.0 - k) * smoothstep(0.0, 0.12, k);
        return d / r * amp * 13.0 * cos(x * 13.0) * env;
      }
      void main() {
        vec2 q = vLocal;
        float r = length(q);
        float t = uTime;
        // The ripples' slope: two slow trains crossing in the breeze...
        vec2 k1 = vec2(2.3, 1.1);
        vec2 k2 = vec2(-1.3, 2.6);
        vec2 k3 = vec2(4.6, -3.1);
        vec2 g = k1 * cos(dot(q, k1) - t * 0.55) * 0.009
          + k2 * cos(dot(q, k2) - t * 0.43 + 1.3) * 0.008
          + k3 * cos(dot(q, k3) - t * 0.8 + 2.1) * 0.003;
        // ...a few rings, each on its own long beat
        g += ring(q, vec2(-1.5, -1.4), t, 7.0, 0.011);
        g += ring(q, vec2(1.7, 0.8), t + 2.6, 9.0, 0.009);
        g += ring(q, vec2(0.3, 1.9), t + 5.1, 11.0, 0.008);
        // Rings spreading out from where the jet comes down
        g += q / (r + 1e-4) * cos(r * 11.0 - t * 7.0) * 0.2 * uSplash * smoothstep(2.9, 0.6, r);
        // In rain: small rings where drops land, each opening and fading on
        // its own beat
        float rings = 0.0;
        if (uWet > 0.0) {
          vec2 gp = vWorld.xz * 1.3;
          vec2 cell = floor(gp);
          float tr = fract(t * 0.55 + wh(cell));
          vec2 at = vec2(wh(cell + 3.7), wh(cell + 9.1)) * 0.6 + 0.2;
          vec2 dd = fract(gp) - at;
          float rr = length(dd);
          rings = smoothstep(0.045, 0.0, abs(rr - tr * 0.42)) * (1.0 - tr) * uWet;
          g += dd / (rr + 1e-4) * rings * 0.12;
        }
        vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
        vec3 v = normalize(cameraPosition - vWorld);
        vec3 R = reflect(-v, n);

        // What it reflects: the sky above the ragged line of the trees and
        // walls round the park (low, so most of what's seen across the
        // water from the steps)...
        float az = atan(R.z, R.x);
        float line = 0.15 + 0.05 * sin(az * 5.0 + 1.1) + 0.03 * sin(az * 13.0 + 0.4) + 0.02 * (vn(vec2(az * 9.0, 0.5)) - 0.5);
        float soft = 0.05 + 0.05 * uHaze + 0.05 * uWet;
        vec3 sky = mix(uSky * uSkyTint, uSkyNow, uWet * 0.85);
        vec3 trees = mix(vec3(0.2, 0.24, 0.15), uSkyNow * 0.35, 0.3) * uLight;
        // (what's lit only by the sky goes much darker after dark than the
        // light level alone says, as the painted surfaces round it do)
        float dim = uLight * mix(1.0, 0.3, uNight);
        trees *= mix(1.0, 0.3, uNight);
        vec3 refl = mix(trees, sky, smoothstep(line - soft, line + soft, R.y));
        // ...and the column, upside down in the middle
        vec2 rd = R.xz;
        float tc = -dot(q, rd) / max(dot(rd, rd), 1e-5);
        if (tc > 0.0) {
          float dist = length(q + rd * tc);
          float h = R.y * tc;
          float rad = h < 0.95 ? 0.27 : h < 1.12 ? 0.84 : h < 1.6 ? 0.19 : 0.0;
          float col = 1.0 - smoothstep(rad * 0.8, rad * 1.15 + 0.05, dist);
          refl = mix(refl, vec3(0.4, 0.39, 0.33) * dim, col * 0.8);
        }

        // Through the water: deep in the middle, the shallow stone showing
        // at the edge and round the column's foot, a little murk drifting
        float shallow = clamp(smoothstep(1.9, 2.8, r) + 0.6 * (1.0 - smoothstep(0.38, 0.95, r)), 0.0, 1.0);
        vec3 body = mix(uColor, uShallow, shallow * 0.75) * (0.9 + 0.16 * vn(q * 1.3 + vec2(t * 0.02, 0.0)));
        body = mix(body, uSkyNow * 0.3, 0.35 * uWet) * mix(uLight, dim, 0.8) * (1.0 - 0.15 * uWet);

        // More reflection at a low angle, less where it's shallow, broken
        // further by rain
        float k = mix(0.1, 0.55, pow(1.0 - max(dot(n, v), 0.0), 3.0)) * (1.0 - 0.3 * shallow) * (1.0 - 0.2 * uWet);
        vec3 col = mix(body, refl, clamp(k + rings * 0.4, 0.0, 1.0));

        // The lights after dark, each a soft streak toward the eye: narrow
        // across, drawn out up and down by the ripples, wider in rain and
        // mist; nothing by day
        vec2 a = normalize(R.xz + 1e-5);
        float spread = 1.0 + 1.2 * uHaze + 0.8 * uWet;
        vec3 glints = vec3(0.0);
        for (int i = 0; i < LIGHTS; i++) {
          vec3 L = uLightPos[i] - vWorld;
          float dist = length(L);
          vec3 l = L / dist;
          float on = mix(uLamps, uSigns, uLightSign[i]);
          float across = acos(clamp(dot(a, normalize(l.xz + 1e-5)), -1.0, 1.0));
          float w = uLightSize[i].x / dist;
          float hh = uLightSize[i].y / dist;
          float s = 1.0 - smoothstep(w * 0.6, w * 1.2 + 0.012 * spread, across);
          float up = max(abs(R.y - l.y) - hh, 0.0);
          s *= exp(-up * up * 900.0 / spread);
          glints += uLightCol[i] * s * on;
        }
        // Broken across into short dashes by the ripples, which drift
        float dashes = smoothstep(0.2, 0.8, vn(vec2(vWorld.x * 3.0 + g.x * 20.0, vWorld.z * 13.0 + g.y * 20.0) + vec2(0.0, t * 0.25)));
        col += glints * (0.3 + 0.7 * dashes) * (0.75 - 0.25 * uWet);
        // By day, a little of the sky caught on the ripples' crests
        col += sky * smoothstep(0.1, 0.2, length(g)) * 0.05 * dim * (1.0 - uWet);
        // Where it meets the stone, a thin line of light
        col = mix(col, sky * dim, smoothstep(2.74, 2.84, r) * 0.25);
        gl_FragColor = vec4(col, 0.95);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true,
  });
}

export function buildFountain() {
  const g = new THREE.Group();
  // Its own stone, so it can catch the light when pointed at
  const stone = paint({ color: "#b4ab96", brush: 0.35, brushScale: 1.5, moss: 0.55, grime: 0.6, grimeHeight: 0.8, emissive: "#ffcf8a", emissiveIntensity: 0 });
  const outer = [v(3.0, 0, 0), v(3.15, 0.05, 0), v(3.18, 0.5, 0), v(3.05, 0.6, 0), v(2.85, 0.58, 0), v(2.82, 0.3, 0), v(0.1, 0.3, 0)].map((p) => new THREE.Vector2(p.x, p.y));
  g.add(mesh(new THREE.LatheGeometry(outer, 40), stone));
  const column = [v(0.45, 0.3, 0), v(0.35, 0.5, 0), v(0.22, 0.6, 0), v(0.24, 1.3, 0), v(0.8, 1.42, 0), v(0.85, 1.55, 0), v(0.3, 1.5, 0), v(0.16, 1.7, 0), v(0.22, 1.85, 0), v(0.05, 2.05, 0)].map((p) => new THREE.Vector2(p.x, p.y));
  g.add(mesh(new THREE.LatheGeometry(column, 24), stone));
  const waterMat = waterMaterial();
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.84, 40).rotateX(-Math.PI / 2), waterMat);
  water.position.y = 0.45;
  g.add(water);
  // Leaves floating on it
  const r = rng(31);
  const floating = new THREE.Group();
  const leafMat = paint({ map: singleLeaves(), alphaTest: 0.5, side: THREE.DoubleSide, brush: 0 });
  for (let i = 0; i < 14; i++) {
    const a = r() * Math.PI * 2;
    const d = r.range(1.1, 2.6);
    const leaf = new THREE.Mesh(leafQuad(Math.floor(r() * 4), 0.13), leafMat);
    leaf.position.set(Math.cos(a) * d, 0.46, Math.sin(a) * d);
    leaf.rotation.set(-Math.PI / 2, 0, r() * 6);
    floating.add(leaf);
  }
  g.add(floating);
  g.add(buildPondEdge(stone));

  // The jet: a column of water rising from the top, which spreads into
  // drops falling back to the upper bowl and the basin
  const TOP = 2.05;
  const jetMat = new THREE.MeshLambertMaterial({ color: "#f2f6f0", emissive: "#9fb8b0", emissiveIntensity: 0.45, transparent: true, opacity: 0, depthWrite: false });
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.11, 1, 14, 1, true).translate(0, 0.5, 0), jetMat);
  jet.position.y = TOP;
  jet.scale.y = 0.001;
  jet.visible = false;
  g.add(jet);
  const DROPS = 320;
  const drops = new Float32Array(DROPS * 3);
  const seeds = Array.from({ length: DROPS }, () => ({ a: r() * Math.PI * 2, out: r.range(0.35, 1.25), up: r.range(0.75, 1.1), phase: r() }));
  const dropGeo = new THREE.BufferGeometry();
  dropGeo.setAttribute("position", new THREE.BufferAttribute(drops, 3));
  const dropMat = new THREE.PointsMaterial({ color: "#f6faf4", size: 0.1, transparent: true, opacity: 0, depthWrite: false });
  const spray = new THREE.Points(dropGeo, dropMat);
  spray.frustumCulled = false;
  spray.visible = false;
  g.add(spray);

  // level: 0 off to 1 full; t: seconds
  const update = (level: number, t: number) => {
    const on = level > 0.002;
    jet.visible = spray.visible = on;
    waterMat.uniforms.uSplash.value = level;
    if (!on) return;
    const height = 1.7 * level;
    jet.scale.set(1 + Math.sin(t * 9) * 0.05, height, 1 + Math.cos(t * 7) * 0.05);
    jetMat.opacity = 0.85 * Math.min(1, level * 2);
    dropMat.opacity = Math.min(1, level * 1.5);
    // Each drop leaves the top of the jet, arcs out and falls back
    const g9 = 9.8;
    const v0 = Math.sqrt(2 * g9 * Math.max(height, 0.05)) * 0.55;
    for (let i = 0; i < DROPS; i++) {
      const s = seeds[i];
      const life = 1.1;
      const k = ((t / life + s.phase) % 1) * life;
      const vy = v0 * s.up;
      const vx = s.out * level;
      let y = TOP + height + vy * k - 0.5 * g9 * k * k;
      const dist = vx * k;
      // Drops that land stop at the surface they fall on
      const floor = dist < 0.85 ? 1.55 : 0.46;
      if (y < floor) y = floor;
      drops[i * 3] = Math.cos(s.a) * dist;
      drops[i * 3 + 1] = y;
      drops[i * 3 + 2] = Math.sin(s.a) * dist;
    }
    dropGeo.attributes.position.needsUpdate = true;
  };
  // The lights it reflects after dark (`waterMaterial`): each is a point
  // on some object in the park (its position in that object's own
  // frame), worked out in the world as the water is drawn
  const reflect = (lights: { obj: THREE.Object3D; at: [number, number, number]; color: string; strength: number; size: [number, number]; sign: boolean }[]) => {
    const u = waterMat.uniforms;
    const list = lights.slice(0, WATER_LIGHTS);
    list.forEach((l, i) => {
      u.uLightCol.value[i].set(l.color).multiplyScalar(l.strength);
      u.uLightSize.value[i].set(l.size[0], l.size[1]);
      u.uLightSign.value.setComponent(i, l.sign ? 1 : 0);
    });
    const local = list.map((l) => new THREE.Vector3(...l.at));
    water.onBeforeRender = () => {
      list.forEach((l, i) => u.uLightPos.value[i].copy(local[i]).applyMatrix4(l.obj.matrixWorld));
    };
  };
  return { group: g, floating, update, stone, reflect };
}

// What grows and lies at the pond's edge, kept to the shallow ring by the
// rim so the water stays open and nothing stands in the views across it:
// a few mossy stones, two clumps of reeds with grass at their feet (no
// taller than the column's bowl), lily pads, some yellowing for autumn,
// and a little grass at the basin's foot outside
function buildPondEdge(stone: THREE.MeshLambertMaterial) {
  const g = new THREE.Group();
  const r = rng(47);
  const polar = (a: number, d: number) => [Math.cos(a) * d, Math.sin(a) * d] as const;
  // Stones, mostly under the water, in the shallows by the reeds
  const stones: THREE.BufferGeometry[] = [];
  for (const [a, d, size] of [
    [3.6, 2.5, 0.2],
    [3.85, 2.62, 0.14],
    [4.05, 2.45, 0.17],
    [0.2, 2.55, 0.16],
    [0.42, 2.6, 0.12],
    [2.5, 2.6, 0.13],
  ] as const) {
    const [x, z] = polar(a, d);
    stones.push(at(blob(r, size, 0.55, 0.3, 1), x, 0.42, z, r() * 6));
  }
  g.add(mesh(merge(stones), stone, { cast: false }));
  // Reeds in two clumps on the shallow ring: the larger at the back left,
  // a smaller one on the right
  const reeds: { x: number; y: number; z: number; h: number }[] = [];
  const grassAt: { x: number; y: number; z: number; h: number }[] = [];
  for (const [a0, a1, count, tall] of [
    [3.55, 4.15, 13, 1.05],
    [0.05, 0.45, 5, 0.8],
  ] as const) {
    for (let i = 0; i < count; i++) {
      const [x, z] = polar(r.range(a0, a1), r.range(2.3, 2.7));
      reeds.push({ x, y: 0.3, z, h: tall * r.range(0.75, 1.1) });
    }
    for (let i = 0; i < count; i++) {
      const [x, z] = polar(r.range(a0 - 0.15, a1 + 0.15), r.range(2.4, 2.75));
      grassAt.push({ x, y: 0.3, z, h: r.range(0.3, 0.45) });
    }
  }
  // And a little grass at the foot of the basin, outside
  for (const a of [1.2, 2.2, 2.9, 4.6, 5.5]) {
    for (let i = 0; i < 2; i++) {
      const [x, z] = polar(a + r.range(-0.12, 0.12), r.range(3.18, 3.3));
      grassAt.push({ x, y: 0, z, h: r.range(0.25, 0.4) });
    }
  }
  g.add(tuftsAt(reeds, "reeds", 48), tuftsAt(grassAt, "grass", 49));
  // Lily pads: round leaves with a notch, in two loose groups on the
  // open water near the edge, a few turning yellow
  const pads: THREE.BufferGeometry[] = [];
  const colors = ["#56733a", "#5f7c3c", "#6b7f3e", "#a1913f"].map((c) => new THREE.Color(c));
  for (const [a, d] of [
    [2.3, 2.2],
    [2.5, 1.85],
    [2.15, 1.7],
    [2.65, 2.35],
    [5.15, 2.15],
    [5.35, 1.8],
    [4.95, 1.95],
  ] as const) {
    const [x, z] = polar(a + r.range(-0.05, 0.05), d);
    const size = r.range(0.14, 0.24);
    const notch = r.range(0.35, 0.55);
    const pad = new THREE.CircleGeometry(size, 18, notch / 2, Math.PI * 2 - notch).rotateX(-Math.PI / 2);
    const c = r.pick(colors);
    const col = new Float32Array(pad.attributes.position.count * 3);
    for (let i = 0; i < col.length; i += 3) [col[i], col[i + 1], col[i + 2]] = [c.r, c.g, c.b];
    pad.setAttribute("color", new THREE.BufferAttribute(col, 3));
    pads.push(at(pad, x, 0.462, z, r() * Math.PI * 2));
  }
  g.add(mesh(merge(pads), mat("lilyPads", () => paint({ vertexColors: true, brush: 0.25, brushScale: 6, side: THREE.DoubleSide })), { cast: false }));
  return g;
}

// One leaf from the four in the fallen-leaves texture
export function leafQuad(which: number, size: number) {
  const q = new THREE.PlaneGeometry(size * 0.45, size);
  const uv = q.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setX(i, (which + uv.getX(i)) / 4);
  return q;
}

export function buildNoticeBoard() {
  const g = new THREE.Group();
  const wood = M.darkWood();
  g.add(mesh(merge([at(box(0.12, 2.5, 0.12), -1.05, 1.25, 0), at(box(0.12, 2.5, 0.12), 1.05, 1.25, 0)]), wood));
  g.add(mesh(merge([at(box(2.2, 0.08, 0.1), 0, 2.2, 0.02), at(box(2.2, 0.08, 0.1), 0, 0.88, 0.02)]), wood));
  g.add(mesh(at(box(2.0, 1.3, 0.05), 0, 1.54, -0.02), mat("cork", () => paint({ color: "#8a6a48", brush: 0.45, brushScale: 6, moss: 0.3, grime: 0.3 }))));
  // A small roof
  const roofMat = mat("boardRoof", () => paint({ map: planks("red"), moss: 0.9, brush: 0.3 }));
  g.add(mesh(at(box(2.5, 0.05, 0.4), 0, 2.45, 0.08, 0, 0.35), roofMat));
  g.add(mesh(at(box(2.5, 0.05, 0.4), 0, 2.45, -0.22, 0, -0.35), roofMat));
  // Papers pinned to it
  const papers = new THREE.Group();
  const add = (kind: "map" | "cat" | "festival" | "faded", w: number, x: number, y: number, rz: number, z: number) => {
    const m = mat(`notice-${kind}`, () => paint({ map: notice(kind), brush: 0.18, brushScale: 6, side: THREE.DoubleSide }));
    const p = new THREE.Mesh(card(w, w * 1.25), m);
    p.position.set(x, y, 0.01 + z);
    p.rotation.z = rz;
    p.castShadow = true;
    p.name = kind;
    papers.add(p);
    return p;
  };
  add("faded", 0.4, -0.75, 1.75, 0.08, 0);
  add("cat", 0.4, -0.62, 1.38, -0.05, 0.004);
  const map = add("map", 0.62, 0.05, 1.55, 0.02, 0.008);
  add("festival", 0.42, 0.68, 1.62, -0.07, 0.004);
  add("faded", 0.32, 0.72, 1.12, 0.12, 0.012);
  g.add(papers);
  // Ivy along the top
  g.add(buildVine(41, [v(-1.1, 0.3, 0.08), v(-1.12, 1.4, 0.1), v(-0.9, 2.3, 0.12), v(-0.2, 2.34, 0.1), v(0.4, 2.28, 0.12)], 0.22));
  return { group: g, map };
}

// The signpost at the fork, pointing the way
export function buildSignpost(arms: { label: string; angle: number }[]) {
  const g = new THREE.Group();
  g.add(mesh(at(box(0.12, 2.6, 0.12), 0, 1.3, 0), M.darkWood()));
  const swing: THREE.Object3D[] = [];
  arms.forEach((arm, i) => {
    const tex = textPanel(`sign-${arm.label}`, 256, 64, {
      background: "#cdb48a",
      padding: 10,
      valign: "middle",
      lines: [{ text: `${arm.label} →`, size: 28, font: "display", color: "#3a2a1c", weight: 600, align: "center" }],
    });
    const pivot = new THREE.Group();
    pivot.position.y = 2.2 - i * 0.36;
    pivot.rotation.y = arm.angle;
    // Plain box UVs, so the face shows the whole label (box() scales them
    // per metre, which showed only a blank corner of it)
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.24, 0.04), [M.wood(), M.wood(), M.wood(), M.wood(), mat(`sign-${arm.label}`, () => paint({ map: tex, brush: 0.2, brushScale: 4, moss: 0.2 })), M.wood()] as unknown as THREE.Material);
    board.position.x = 0.58;
    board.castShadow = true;
    pivot.add(board);
    g.add(pivot);
    swing.push(pivot);
  });
  return { group: g, swing };
}

// Dust floating in the light, drifting slowly
export function buildDust(count: number, size: [number, number, number], center: [number, number, number]) {
  const r = rng(17);
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = center[0] + r.range(-0.5, 0.5) * size[0];
    positions[i * 3 + 1] = center[1] + r.range(-0.5, 0.5) * size[1];
    positions[i * 3 + 2] = center[2] + r.range(-0.5, 0.5) * size[2];
    seeds[i] = r() * 100;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  g.setAttribute("seed", new THREE.BufferAttribute(seeds, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: windUniforms.uTime, uMap: { value: softDot() }, uPx: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float seed;
      uniform float uTime;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.11 + seed) * 0.45;
        p.y += sin(uTime * 0.07 + seed * 1.7) * 0.3;
        p.z += cos(uTime * 0.09 + seed * 0.6) * 0.45;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (14.0 + mod(seed, 3.0) * 6.0) / -mv.z;
        vAlpha = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 0.4 + seed * 3.0));
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      varying float vAlpha;
      void main() {
        vec4 c = texture2D(uMap, gl_PointCoord);
        gl_FragColor = vec4(c.rgb, c.a * vAlpha * 0.7);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(g, m);
  points.frustumCulled = false;
  return points;
}

// A beam of low sun through a window or a gap in the leaves
export function buildBeam(length: number, width: number, color = "#ffdca0", strength = 0.22) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: windUniforms.uTime, uColor: { value: new THREE.Color(color) }, uStrength: { value: strength } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uStrength;
      varying vec2 vUv;
      void main() {
        float edge = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
        float along = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.45, vUv.y);
        float shimmer = 0.85 + 0.15 * sin(uTime * 0.6 + vUv.x * 9.0);
        gl_FragColor = vec4(uColor, edge * along * uStrength * shimmer);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const g = new THREE.Group();
  // The sun's: it fades with cloud and is gone at night (Atmosphere.tsx)
  g.userData.atmos = "beam";
  g.userData.strength = m.uniforms.uStrength;
  for (const ry of [0, Math.PI / 2]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(width, length).translate(0, -length / 2, 0), m);
    p.rotation.y = ry;
    g.add(p);
  }
  return g;
}

// The sky: a painted gradient with the low sun and drifting clouds. It
// follows the camera, so it's always at the horizon. The weather and the
// hour repaint it through its uniforms (atmosphere/Atmosphere.tsx): how
// much cloud and how dark, the sun's glow or the moon, a few stars on a
// clear night.
export function buildSky(opts: { top: string; horizon: string; sun: string; sunDir: [number, number, number] }) {
  const sunDir = new THREE.Vector3(...opts.sunDir).normalize();
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uTime: windUniforms.uTime,
      uTop: { value: new THREE.Color(opts.top) },
      uHorizon: { value: new THREE.Color(opts.horizon) },
      uSun: { value: new THREE.Color(opts.sun) },
      uSunDir: { value: sunDir.clone() },
      uCloudLit: { value: new THREE.Color(1.0, 0.97, 0.9) },
      uCloudShade: { value: new THREE.Color(0.68, 0.72, 0.88) },
      uCover: { value: 0.5 },
      uSunDisc: { value: 1 },
      uMoon: { value: 0 },
      uStars: { value: 0 },
      uHaze: { value: new THREE.Color(1, 1, 1) }, // the air's colour (the fog's), low in the sky
      uHazeAmt: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uTop;
      uniform vec3 uHorizon;
      uniform vec3 uSun;
      uniform vec3 uSunDir;
      uniform vec3 uCloudLit;
      uniform vec3 uCloudShade;
      uniform float uCover;
      uniform float uSunDisc;
      uniform float uMoon;
      uniform float uStars;
      uniform vec3 uHaze;
      uniform float uHazeAmt;
      varying vec3 vDir;
      float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n2(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) { float s = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { s += a * n2(p); p *= 2.07; a *= 0.5; } return s; }
      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, -0.2, 1.0);
        vec3 col = mix(uHorizon, uTop, pow(smoothstep(-0.02, 0.65, h), 0.75));
        float s = max(dot(d, uSunDir), 0.0);
        // The sun's glow; at night a smaller, cooler glow and the moon's disc
        col += uSun * (pow(s, 6.0) * 0.35 * (1.0 - uMoon * 0.55) + pow(s, 80.0) * 0.8 * (1.0 - uMoon)) * uSunDisc;
        col = mix(col, uSun * 1.1, smoothstep(0.99935, 0.9996, s) * uMoon * uSunDisc);
        // A few stars on a clear night, fixed (they don't twinkle)
        if (uStars > 0.001) {
          vec2 sg = d.xz / (max(d.y, 0.0) + 0.35) * 42.0;
          vec2 cell = floor(sg);
          vec2 jitter = vec2(h21(cell + 3.1), h21(cell + 7.7)) * 0.6 + 0.2;
          float star = step(0.975, h21(cell)) * smoothstep(0.16, 0.0, length(fract(sg) - jitter));
          col += vec3(0.85, 0.88, 1.0) * star * uStars * smoothstep(0.08, 0.35, h) * 0.55;
        }
        // Cumulus: big soft heaps in a band above the horizon, with crisp
        // painted edges, bright creamy tops and lavender-blue undersides.
        // With more cover the heaps grow and climb, and a grey layer closes
        // over the whole sky.
        float over = smoothstep(0.62, 1.0, uCover);
        vec2 drift = vec2(uTime * 0.004, uTime * 0.0015);
        vec2 uv = d.xz / (max(d.y, 0.0) + 0.2) * 0.5 + drift;
        float c = fbm(uv * 1.15) + 0.22 * fbm(uv * 3.4);
        vec3 up = normalize(d + vec3(0.0, 0.035, 0.0));
        vec2 uvUp = up.xz / (max(up.y, 0.0) + 0.2) * 0.5 + drift;
        float cUp = fbm(uvUp * 1.15) + 0.22 * fbm(uvUp * 3.4);
        float band = smoothstep(0.0, 0.1, h) * smoothstep(0.85 + over * 0.6, 0.3, h);
        float thr = 0.6 + (0.5 - uCover) * 0.4;
        float cloud = smoothstep(thr, thr + 0.045 + over * 0.06, c) * band;
        float lit = 0.25 + 0.75 * smoothstep(-0.03, 0.05, c - cUp);
        vec3 cloudCol = mix(uCloudShade, uCloudLit, lit);
        cloudCol += uSun * pow(s, 3.0) * 0.18 * uSunDisc;
        // The overcast layer, soft and a little darker toward the zenith
        col = mix(col, mix(uCloudLit, uCloudShade, 0.35 + 0.4 * smoothstep(0.0, 0.8, h)), over * 0.8 * smoothstep(-0.15, 0.12, h));
        // A few high wisps
        float wisp = smoothstep(0.58, 0.8, fbm(vec2(uv.x * 0.7, uv.y * 3.0) + 9.0)) * smoothstep(0.35, 0.7, h) * 0.35 * (1.0 - over);
        col = mix(col, uCloudLit * vec3(1.0, 1.01, 1.04), wisp);
        col = mix(col, cloudCol, cloud * 0.95);
        // In haze the sky low down is the air's own colour, so the far
        // city and hills, fogged, sit in it rather than against it
        col = mix(col, uHaze, uHazeAmt * (1.0 - smoothstep(-0.02, 0.32, h)));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), m);
  sky.renderOrder = -1;
  sky.frustumCulled = false;
  sky.userData.atmos = "sky";
  sky.userData.sunDir = sunDir; // the place's own, which the sun's height is measured against
  return sky;
}

// Leaves blowing off the trees: a few at a time, rocking as they fall,
// then lying on the ground a while before they're used again
export function buildFallingLeaves(count: number, sources: { center: THREE.Vector3; radius: number }[]) {
  const r = rng(77);
  const meshes: THREE.InstancedMesh[] = [];
  const m = paint({ map: singleLeaves(), alphaTest: 0.5, side: THREE.DoubleSide, brush: 0 });
  const per = Math.ceil(count / 4);
  for (let k = 0; k < 4; k++) {
    const im = new THREE.InstancedMesh(leafQuad(k, 0.16), m, per);
    im.frustumCulled = false;
    im.castShadow = false;
    meshes.push(im);
  }
  type Leaf = { p: THREE.Vector3; vel: THREE.Vector3; phase: number; spin: THREE.Vector3; rest: number; rot: THREE.Euler };
  const spawn = (leaf: Leaf, first = false) => {
    const s = r.pick(sources);
    leaf.p.set(s.center.x + r.range(-1, 1) * s.radius, s.center.y + r.range(-0.5, 0.5) * s.radius, s.center.z + r.range(-1, 1) * s.radius);
    if (first) leaf.p.y = r.range(0.5, s.center.y);
    leaf.vel.set(r.range(0.2, 0.6), -r.range(0.35, 0.6), r.range(-0.3, 0.1));
    leaf.phase = r() * 10;
    leaf.rest = 0;
  };
  const leaves: Leaf[] = Array.from({ length: per * 4 }, () => {
    const l: Leaf = { p: new THREE.Vector3(), vel: new THREE.Vector3(), phase: 0, spin: v(r.range(-2, 2), r.range(-2, 2), r.range(-2, 2)), rest: 0, rot: new THREE.Euler() };
    spawn(l, true);
    return l;
  });
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = v(1, 1, 1);
  const update = (dt: number, t: number) => {
    const gust = windUniforms.uGust.value;
    const dir = windUniforms.uGustDir.value;
    leaves.forEach((leaf, i) => {
      if (leaf.p.y <= 0.03) {
        leaf.rest += dt;
        leaf.p.y = 0.02;
        leaf.rot.x = -Math.PI / 2;
        if (leaf.rest > 9 + (i % 5) * 3) spawn(leaf);
      } else {
        const sway = Math.sin(t * 1.6 + leaf.phase);
        leaf.p.x += (leaf.vel.x * 0.4 + dir.x * gust * 1.6 + sway * 0.35) * dt;
        leaf.p.z += (leaf.vel.z * 0.4 + dir.y * gust * 1.6) * dt;
        leaf.p.y += (leaf.vel.y + Math.abs(sway) * 0.18) * dt;
        leaf.rot.x += leaf.spin.x * dt;
        leaf.rot.y += leaf.spin.y * dt;
        leaf.rot.z = sway * 0.8;
      }
      q.setFromEuler(leaf.rot);
      m4.compose(leaf.p, q, one);
      meshes[i % 4].setMatrixAt(Math.floor(i / 4), m4);
    });
    for (const im of meshes) im.instanceMatrix.needsUpdate = true;
  };
  const group = new THREE.Group();
  meshes.forEach((im) => group.add(im));
  return { group, update };
}

// Leaves shaken loose from a tree: a pool that's empty until a tree is
// shaken, then a handful flutter down from its crown, lie on the ground a
// few seconds and shrink away. Tinted to match the tree.
export function buildLeafBursts(capacity: number) {
  const r = rng(91);
  const m = paint({ map: singleLeaves(), alphaTest: 0.5, side: THREE.DoubleSide, brush: 0 });
  const per = Math.ceil(capacity / 4);
  const meshes = [0, 1, 2, 3].map((k) => {
    // Larger than life, so they read from across the park
    const im = new THREE.InstancedMesh(leafQuad(k, 0.6), m, per);
    im.frustumCulled = false;
    im.castShadow = false;
    for (let i = 0; i < per; i++) im.setColorAt(i, new THREE.Color("#ffffff"));
    return im;
  });
  type Leaf = { on: boolean; p: THREE.Vector3; vel: THREE.Vector3; phase: number; spin: THREE.Vector3; rot: THREE.Euler; rest: number; size: number };
  const leaves: Leaf[] = Array.from({ length: per * 4 }, () => ({
    on: false,
    p: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    phase: 0,
    spin: v(r.range(-3, 3), r.range(-3, 3), r.range(-3, 3)),
    rot: new THREE.Euler(),
    rest: 0,
    size: 0,
  }));
  let next = 0;
  const color = new THREE.Color();
  const burst = (center: THREE.Vector3, radius: number, n: number, tint: THREE.ColorRepresentation) => {
    for (let k = 0; k < n; k++) {
      const i = next;
      next = (next + 1) % leaves.length;
      const leaf = leaves[i];
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * radius * 0.9;
      leaf.on = true;
      leaf.p.set(center.x + Math.cos(a) * d, center.y + r.range(-0.6, 0.4) * radius, center.z + Math.sin(a) * d);
      // Thrown out a little by the shake, then falling and drifting
      leaf.vel.set(Math.cos(a) * r.range(0.4, 1.2), r.range(-0.2, 0.6), Math.sin(a) * r.range(0.4, 1.2));
      leaf.phase = r() * 10;
      leaf.rest = 0;
      leaf.size = r.range(0.8, 1.25);
      color.set(tint).offsetHSL(r.range(-0.03, 0.03), 0, r.range(-0.06, 0.06));
      meshes[i % 4].setColorAt(Math.floor(i / 4), color);
    }
    for (const im of meshes) if (im.instanceColor) im.instanceColor.needsUpdate = true;
  };
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const update = (dt: number, t: number) => {
    const gust = windUniforms.uGust.value;
    const dir = windUniforms.uGustDir.value;
    leaves.forEach((leaf, i) => {
      let s = 0;
      if (leaf.on) {
        if (leaf.p.y <= 0.03) {
          // On the ground: lie flat, then shrink away
          leaf.rest += dt;
          leaf.p.y = 0.02;
          leaf.rot.set(-Math.PI / 2, 0, leaf.rot.z);
          s = leaf.size * Math.max(0, 1 - Math.max(0, leaf.rest - 5) / 1.5);
          if (leaf.rest > 6.5) leaf.on = false;
        } else {
          const sway = Math.sin(t * 2.1 + leaf.phase);
          // Air slows the throw; gravity wins slowly, as it does for a leaf
          leaf.vel.x *= Math.exp(-dt * 1.6);
          leaf.vel.z *= Math.exp(-dt * 1.6);
          leaf.vel.y = Math.max(leaf.vel.y - dt * 4, -1.9);
          leaf.p.x += (leaf.vel.x + dir.x * gust * 1.2 + sway * 0.6) * dt;
          leaf.p.z += (leaf.vel.z + dir.y * gust * 1.2) * dt;
          // Each swing of the leaf checks its fall for a moment
          leaf.p.y += (leaf.vel.y + Math.abs(sway) * 0.5) * dt;
          // Flutters, mostly showing its face: rocks side to side and
          // tips forward and back, turning slowly
          leaf.rot.set(Math.sin(t * 3.1 + leaf.phase) * 0.7, leaf.rot.y + leaf.spin.y * 0.4 * dt, sway * 1.1);
          s = leaf.size;
        }
      }
      // Seen from the camera's side, so a leaf is never just a sliver
      q.setFromEuler(leaf.rot);
      if (leaf.p.y > 0.03 && facing) q.premultiply(facing);
      m4.compose(leaf.p, q, scale.setScalar(s));
      meshes[i % 4].setMatrixAt(Math.floor(i / 4), m4);
    });
    for (const im of meshes) im.instanceMatrix.needsUpdate = true;
  };
  let facing: THREE.Quaternion | null = null;
  // Turn the leaves in the air to face the camera (call once a frame)
  const face = (camera: THREE.Camera) => {
    facing ??= new THREE.Quaternion();
    facing.copy(camera.quaternion);
  };
  const group = new THREE.Group();
  meshes.forEach((im) => group.add(im));
  // How many are in the air or on the ground, and the highest one
  const stats = () => ({ on: leaves.filter((l) => l.on).length, top: Math.max(0, ...leaves.filter((l) => l.on).map((l) => +l.p.y.toFixed(2))), at: leaves.filter((l) => l.on).slice(0, 4).map((l) => l.p.toArray().map((n) => +n.toFixed(2))) });
  return { group, burst, update, stats, face };
}

// Leaves lying on the ground, thicker along edges
export function buildFallenLeaves(count: number, place: (r: ReturnType<typeof rng>) => [number, number] | null, seed = 5) {
  const r = rng(seed);
  const m = paint({ map: singleLeaves(), alphaTest: 0.5, side: THREE.DoubleSide, brush: 0.1 });
  const group = new THREE.Group();
  const per = Math.ceil(count / 4);
  const m4 = new THREE.Matrix4();
  for (let k = 0; k < 4; k++) {
    const im = new THREE.InstancedMesh(leafQuad(k, 0.17), m, per);
    let n = 0;
    let tries = 0;
    while (n < per && tries < per * 8) {
      tries++;
      const spot = place(r);
      if (!spot) continue;
      m4.compose(v(spot[0], 0.025 + r() * 0.01, spot[1]), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + r.range(-0.2, 0.2), 0, r() * 6.28)), v(1, 1, 1).multiplyScalar(r.range(0.8, 1.3)));
      im.setMatrixAt(n++, m4);
    }
    im.count = n;
    im.receiveShadow = true;
    group.add(im);
  }
  return group;
}

export { plaster };
