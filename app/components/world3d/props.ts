import * as THREE from "three";
import { at, blob, box, buildVine, merge, tube, wire } from "./geometry";
import { mesh, paint, windUniforms } from "./paint";
import { rng } from "./rng";
import { enamel, flagstones, notice, planks, plaster, singleLeaves, softDot, textPanel } from "./textures";

// Props: the things people left behind, modelled from parts. Each builder
// returns a group, plus handles for anything that moves.

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const mats = new Map<string, THREE.MeshLambertMaterial>();
export function mat(key: string, make: () => THREE.MeshLambertMaterial) {
  let m = mats.get(key);
  if (!m) {
    m = make();
    mats.set(key, m);
  }
  return m;
}

export const M = {
  wood: () => mat("wood", () => paint({ map: planks("light"), brush: 0.25, brushScale: 2, moss: 0.25, grime: 0.4 })),
  darkWood: () => mat("darkWood", () => paint({ map: planks("dark"), brush: 0.25, brushScale: 2, moss: 0.3, grime: 0.4 })),
  redWood: () => mat("redWood", () => paint({ map: planks("red"), brush: 0.25, brushScale: 2, moss: 0.2, grime: 0.3 })),
  iron: () => mat("iron", () => paint({ color: "#3d3f38", brush: 0.3, brushScale: 3, rust: 0.6 })),
  rust: () => mat("rust", () => paint({ color: "#8a4b2c", brush: 0.4, brushScale: 3, rust: 0.8 })),
  green: () => mat("green", () => paint({ map: enamel(140, 28, 34), brush: 0.2, brushScale: 2, rust: 0.1, grime: 0.5, moss: 0.2 })),
  stone: () => mat("stone", () => paint({ color: "#b4ab96", brush: 0.35, brushScale: 1.5, moss: 0.55, grime: 0.6, grimeHeight: 0.8 })),
  concrete: () => mat("concrete", () => paint({ color: "#a8a293", brush: 0.35, brushScale: 1.2, moss: 0.35, grime: 0.7, grimeHeight: 2 })),
  paving: () => mat("paving", () => paint({ map: flagstones(), brush: 0.18, brushScale: 0.6, side: THREE.DoubleSide })),
  plaster: () => mat("plaster", () => paint({ map: plaster("cream"), brush: 0.15, grime: 0.6, grimeHeight: 1.5, moss: 0.15 })),
  glass: () =>
    mat("glass", () =>
      paint({ color: "#c9d8cf", transparent: true, opacity: 0.22, brush: 0.4, brushScale: 3, grime: 0.8, side: THREE.DoubleSide, depthWrite: false }),
    ),
  lampGlow: () => mat("lampGlow", () => paint({ color: "#fff1c9", emissive: "#ffd99a", emissiveIntensity: 1.4, brush: 0 })),
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

export function buildLamp({ lit = false } = {}) {
  const g = new THREE.Group();
  g.add(mesh(merge([tube([v(0, 0, 0), v(0, 2, 0), v(0, 3.4, 0), v(0.12, 3.75, 0), v(0.5, 3.85, 0)], (t) => 0.07 - t * 0.03, 12, 6), at(box(0.22, 0.25, 0.22), 0, 0.12, 0)]), M.iron()));
  g.add(mesh(at(new THREE.CylinderGeometry(0.08, 0.2, 0.18, 8), 0.55, 3.78, 0), M.green()));
  const glow = mesh(at(new THREE.SphereGeometry(0.09, 10, 8), 0.55, 3.66, 0), lit ? M.lampGlow() : M.glass(), { cast: false });
  g.add(glow);
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
    lines: [{ text: "つめたい", size: 22, color: "#3a6ea5", weight: 700 }],
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
  const signTex = textPanel("booth-sign", 256, 64, {
    background: "#efe8d4",
    padding: 6,
    valign: "middle",
    lines: [{ text: "公衆電話", size: 38, font: "display", color: "#2f5a3c", weight: 600, align: "center" }],
  });
  const signMat = mat("boothSign", () => paint({ map: signTex, brush: 0.15, emissive: "#ffe8b8", emissiveIntensity: 0.12 }));
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(card(0.8, 0.2), signMat);
    const a = (i * Math.PI) / 2;
    s.position.set(Math.sin(a) * (W / 2 + 0.1), H + 0.2, Math.cos(a) * (W / 2 + 0.1));
    s.rotation.y = a;
    g.add(s);
  }
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

// Water that holds a little of the sky
export function waterMaterial(color = "#36432f", sky = "#cdb486") {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: windUniforms.uTime,
      uColor: { value: new THREE.Color(color) },
      uSky: { value: new THREE.Color(sky) },
      uSplash: { value: 0 }, // 0 to 1: how hard water is falling into it
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
      uniform float uTime;
      uniform vec3 uColor;
      uniform vec3 uSky;
      uniform float uSplash;
      varying vec3 vWorld;
      varying vec2 vLocal;
      void main() {
        vec2 p = vWorld.xz;
        float ripple = sin(p.x * 3.1 + uTime * 0.9) * sin(p.y * 2.7 - uTime * 0.7) + sin(length(p) * 6.0 - uTime * 1.3) * 0.5;
        // Rings spreading out from where the water comes down
        float d = length(vLocal);
        ripple += sin(d * 11.0 - uTime * 7.0) * uSplash * 1.4 * smoothstep(2.9, 0.6, d);
        vec3 view = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(view.y, 0.0), 3.0);
        vec3 col = mix(uColor, uSky, 0.08 + fres * 0.3 + ripple * 0.025);
        col += vec3(1.0, 0.92, 0.75) * smoothstep(1.0, 1.45, ripple) * 0.08;
        gl_FragColor = vec4(col, 0.94);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true,
  });
}

export function buildFountain() {
  const g = new THREE.Group();
  const outer = [v(3.0, 0, 0), v(3.15, 0.05, 0), v(3.18, 0.5, 0), v(3.05, 0.6, 0), v(2.85, 0.58, 0), v(2.82, 0.3, 0), v(0.1, 0.3, 0)].map((p) => new THREE.Vector2(p.x, p.y));
  g.add(mesh(new THREE.LatheGeometry(outer, 40), M.stone()));
  const column = [v(0.45, 0.3, 0), v(0.35, 0.5, 0), v(0.22, 0.6, 0), v(0.24, 1.3, 0), v(0.8, 1.42, 0), v(0.85, 1.55, 0), v(0.3, 1.5, 0), v(0.16, 1.7, 0), v(0.22, 1.85, 0), v(0.05, 2.05, 0)].map((p) => new THREE.Vector2(p.x, p.y));
  g.add(mesh(new THREE.LatheGeometry(column, 24), M.stone()));
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
  return { group: g, floating, update };
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
export function buildSignpost(arms: { label: string; ja: string; angle: number }[]) {
  const g = new THREE.Group();
  g.add(mesh(at(box(0.12, 2.6, 0.12), 0, 1.3, 0), M.darkWood()));
  const swing: THREE.Object3D[] = [];
  arms.forEach((arm, i) => {
    const tex = textPanel(`sign-${arm.label}`, 256, 64, {
      background: "#cdb48a",
      padding: 10,
      valign: "middle",
      lines: [{ text: `${arm.ja}  ${arm.label} →`, size: 26, font: "display", color: "#3a2a1c", weight: 600 }],
    });
    const pivot = new THREE.Group();
    pivot.position.y = 2.2 - i * 0.36;
    pivot.rotation.y = arm.angle;
    const board = new THREE.Mesh(box(1.1, 0.24, 0.04), [M.wood(), M.wood(), M.wood(), M.wood(), mat(`sign-${arm.label}`, () => paint({ map: tex, brush: 0.2, brushScale: 4, moss: 0.2 })), M.wood()] as unknown as THREE.Material);
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
  for (const ry of [0, Math.PI / 2]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(width, length).translate(0, -length / 2, 0), m);
    p.rotation.y = ry;
    g.add(p);
  }
  return g;
}

// The sky: a painted gradient with the low sun and drifting clouds. It
// follows the camera, so it's always at the horizon.
export function buildSky(opts: { top: string; horizon: string; sun: string; sunDir: [number, number, number] }) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uTime: windUniforms.uTime,
      uTop: { value: new THREE.Color(opts.top) },
      uHorizon: { value: new THREE.Color(opts.horizon) },
      uSun: { value: new THREE.Color(opts.sun) },
      uSunDir: { value: new THREE.Vector3(...opts.sunDir).normalize() },
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
        col += uSun * (pow(s, 6.0) * 0.35 + pow(s, 80.0) * 0.8);
        vec2 uv = d.xz / (max(d.y, 0.0) + 0.22) * 0.9 + vec2(uTime * 0.003, uTime * 0.001);
        float c = fbm(uv * 1.4);
        float cloud = smoothstep(0.5, 0.75, c) * smoothstep(0.0, 0.18, h);
        float shade = fbm(uv * 1.4 + vec2(0.05, 0.08));
        vec3 cloudCol = mix(vec3(0.95, 0.72, 0.62), vec3(1.0, 0.93, 0.8), smoothstep(0.45, 0.8, shade));
        cloudCol = mix(cloudCol, cloudCol * vec3(1.05, 0.95, 0.85), s);
        col = mix(col, cloudCol, cloud * 0.85);
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
