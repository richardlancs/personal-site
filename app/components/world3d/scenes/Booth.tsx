"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { at, box, buildBush, buildTree, buildVine, grass, merge, treeKinds } from "../geometry";
import { mesh, paint } from "../paint";
import { M, buildBench, buildBicycle, buildBooth, buildDust, buildFallenLeaves, buildFallingLeaves, buildLamp, buildPole, buildSky, buildVending, buildWires, mat } from "../props";
import { buildHills, buildRuinedTown } from "../buildings";
import { timed } from "../idle";
import { rng } from "../rng";
import { useWorld, world } from "../store";
import { flagstones, groundTexture } from "../textures";
import { buildTorch, carvedSign } from "../torch";
import { HEMI, Hitbox, SunLight, type SceneProps } from "./common";
import ShakeableTrees, { type ShakeTree } from "./ShakeableTrees";

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// The street corner round the booth: the kerb and its gutter, a drain,
// the crossing worn off the road, a post box, the bus stop, a bench, a
// bicycle left against the wall, a lamp that no longer comes on, and
// notes taped to the booth's glass. No lights of their own.
function buildCorner(booth: THREE.Group) {
  const g = new THREE.Group();
  // Kerb and gutter, between the pavement and the road
  g.add(mesh(box(40, 0.15, 0.24, 0.5).translate(0, 0.075, 3.92), M.stone()));
  g.add(mesh(box(40, 0.02, 0.3, 0.4).translate(0, 0.045, 4.19), mat("gutter", () => paint({ color: "#57534a", brush: 0.4, brushScale: 1, moss: 0.5, grime: 0.6 })), { cast: false }));
  // A drain in the gutter: an iron frame, bars, the dark under them
  const drain = new THREE.Group();
  drain.add(mesh(box(0.56, 0.005, 0.28).translate(0, 0.05, 0), mat("drainDark", () => paint({ color: "#1d1f1b", brush: 0 })), { cast: false }));
  const bars: THREE.BufferGeometry[] = [at(box(0.62, 0.03, 0.04), 0, 0.06, -0.15), at(box(0.62, 0.03, 0.04), 0, 0.06, 0.15), at(box(0.04, 0.03, 0.34), -0.29, 0.06, 0), at(box(0.04, 0.03, 0.34), 0.29, 0.06, 0)];
  for (let i = 0; i < 7; i++) bars.push(at(box(0.03, 0.03, 0.28), -0.21 + i * 0.07, 0.06, 0));
  drain.add(mesh(merge(bars), M.iron(), { cast: false }));
  drain.position.set(1.1, 0, 4.19);
  g.add(drain);
  // The crossing, nearly worn away
  const stripes: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) stripes.push(at(box(0.45, 0.012, 3.6, 0.4), 7 + i * 0.9, 0.046, 7.2));
  g.add(mesh(merge(stripes), mat("crossing", () => paint({ color: "#d8d0b8", brush: 0.5, brushScale: 0.8, grime: 0.9, moss: 0.35 })), { cast: false }));

  // A post box, its red gone to rust
  const post = new THREE.Group();
  const postMat = mat("postBox", () => paint({ color: "#8c4a3a", brush: 0.3, brushScale: 3, rust: 0.45, grime: 0.6, moss: 0.25 }));
  post.add(mesh(merge([new THREE.CylinderGeometry(0.24, 0.26, 1.15, 16).translate(0, 0.675, 0), new THREE.SphereGeometry(0.245, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 1.25, 0)]), postMat));
  post.add(mesh(new THREE.CylinderGeometry(0.29, 0.3, 0.1, 16).translate(0, 0.05, 0), M.concrete()));
  post.add(mesh(at(box(0.22, 0.025, 0.04), 0, 1.06, 0.235), M.iron(), { cast: false }));
  post.add(mesh(new THREE.PlaneGeometry(0.16, 0.1).translate(0, 0.84, 0.258), M.paper(), { cast: false }));
  post.position.set(-1.5, 0.1, 0.4);
  post.rotation.y = 0.35;
  g.add(post);

  // The bus stop: a post, its disc, and the times (the last bus long gone)
  const stop = new THREE.Group();
  stop.add(mesh(new THREE.CylinderGeometry(0.035, 0.04, 2.6, 8).translate(0, 1.3, 0), M.iron()));
  // Its disc and its times, carved boards like every sign (torch.ts), and
  // a torch on the post to read them by
  const disc = carvedSign("bus-stop-disc", [128, 128], [{ text: "Bus", size: 44 }], { padding: 14, grime: 0.3 });
  stop.add(new THREE.Mesh(new THREE.CircleGeometry(0.22, 24).translate(0, 2.42, 0.045), disc));
  stop.add(mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 24).rotateX(Math.PI / 2).translate(0, 2.42, 0.02), M.darkWood()));
  const times = carvedSign(
    "bus-stop-times",
    [256, 320],
    [
      { text: "Park Gate", size: 34, gap: 10 },
      { text: "Route 12", size: 24, gap: 18 },
      { text: "Weekdays every 20 min", size: 19, gap: 6 },
      { text: "Weekends every hour", size: 19, gap: 6 },
      { text: "Last bus 22:40", size: 19 },
    ],
    { padding: 16, grime: 0.4 },
  );
  stop.add(mesh(box(0.34, 0.42, 0.03).translate(0, 1.55, 0.03), M.darkWood()));
  stop.add(new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.375).translate(0, 1.55, 0.047), times));
  const torch = buildTorch(0.2, { light: 0 });
  torch.position.set(0, 1.95, 0.04);
  stop.add(torch);
  stop.position.set(3.1, 0.1, 2.9);
  stop.rotation.y = -0.3;
  g.add(stop);

  // A bench by the wall, facing the road
  const bench = buildBench();
  bench.position.set(-4.6, 0.1, 0.9);
  g.add(bench);
  // A bicycle left leaning on the wall
  const bike = buildBicycle();
  bike.position.set(3.3, 0.1, -1.4);
  bike.rotation.x = -0.12;
  g.add(bike);
  // A second lamp, further along, that no longer comes on: no light of
  // its own, and its glass and shade stay dull after dark
  const dead = buildLamp({ light: "none" });
  const dull = mat("lampDead", () => paint({ color: "#9a9686", brush: 0.3, grime: 0.6 }));
  const lit = [M.lampNight(), M.lampShade(), M.lampGlow()];
  dead.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && lit.includes(m.material as THREE.MeshLambertMaterial)) m.material = dull;
  });
  dead.position.set(6.4, 0.1, 3.4);
  dead.rotation.y = -Math.PI / 2;
  g.add(dead);

  // Notes taped to the booth's glass, inside and out
  const notes: THREE.BufferGeometry[] = [
    at(new THREE.PlaneGeometry(0.12, 0.16), 0.27, 1.75, -0.485, 0, 0, 0.08),
    at(new THREE.PlaneGeometry(0.1, 0.13), -0.3, 0.78, -0.485, 0, 0, -0.12),
    at(new THREE.PlaneGeometry(0.14, 0.1), 0.515, 1.45, 0.12, Math.PI / 2, 0, 0.05),
  ];
  booth.add(mesh(merge(notes), M.paper(), { cast: false }));
  return g;
}

function buildBoothScene(quality: "high" | "low") {
  const root = new THREE.Group();
  const r = rng(33);
  const groundTex = groundTexture();
  root.add(mesh(new THREE.PlaneGeometry(260, 260).rotateX(-Math.PI / 2), paint({ map: groundTex, brush: 0.35, brushScale: 0.1 }), { cast: false }));
  // A strip of pavement along the old road
  const paveTex = flagstones();
  root.add(mesh(box(40, 0.1, 3.2, 0.45).translate(0, 0.05, 2.2), paint({ map: paveTex, brush: 0.2, moss: 0.3 }), { cast: false }));
  root.add(mesh(box(40, 0.08, 6, 0.2).translate(0, 0.0, 7.2), paint({ color: "#6e6a60", brush: 0.45, brushScale: 0.6, moss: 0.4 }), { cast: false }));
  // A low wall behind, covered in ivy
  root.add(mesh(box(26, 1.6, 0.4, 0.5).translate(0, 0.8, -1.8), M.concrete()));
  for (let i = 0; i < 6; i++) {
    const x = -10 + i * 4 + r.range(-1, 1);
    root.add(buildVine(200 + i, [v(x, 0, -1.55), v(x + 0.5, 0.8, -1.56), v(x + 1.2, 1.55, -1.5), v(x + 2, 1.62, -1.75), v(x + 2.6, 1.2, -1.56)], 0.32));
  }
  const booth = buildBooth();
  booth.group.position.set(0, 0.1, 0);
  root.add(booth.group);
  root.add(buildCorner(booth.group));
  const vending = buildVending();
  vending.position.set(1.6, 0.1, -0.9);
  vending.rotation.y = -0.15;
  root.add(vending);
  const lamp = buildLamp({ lit: true, light: "shadow" });
  lamp.position.set(-2.6, 0.1, 1.2);
  lamp.rotation.y = 0.4;
  root.add(lamp);
  const poles = [v(-14, 0, 4.2), v(3.6, 0, 4.2), v(20, 0, 4.2)];
  for (const p of poles) {
    const pole = buildPole();
    pole.position.copy(p);
    root.add(pole);
  }
  // The wires, each line hung from where it meets the poles, so it can
  // swing a little in the wind (Booth, below) without leaving them
  const wires = [8.3, 7.6].map((h) => {
    const pivot = new THREE.Group();
    pivot.position.set(0, h, 4.2);
    const line = buildWires(poles, [h]);
    line.position.set(0, -h, -4.2);
    pivot.add(line);
    root.add(pivot);
    return pivot;
  });
  // A maple leaning over the booth, bushes, grass up through the paving
  const tree = buildTree(301, treeKinds.maple, { scale: 1.2 });
  tree.position.set(-3.8, 0, -3.2);
  root.add(tree);
  const tree2 = buildTree(302, treeKinds.zelkova, { scale: 1.1 });
  tree2.position.set(6, 0, -5);
  root.add(tree2);
  const shakeable: ShakeTree[] = [
    { group: tree, crown: v(-3.8, treeKinds.maple.height * 1.2 * 0.72, -3.2), radius: treeKinds.maple.spread * 0.72, height: treeKinds.maple.height * 1.2, tint: treeKinds.maple.fall },
    { group: tree2, crown: v(6, treeKinds.zelkova.height * 1.1 * 0.72, -5), radius: treeKinds.zelkova.spread * 0.66, height: treeKinds.zelkova.height * 1.1, tint: treeKinds.zelkova.fall },
  ];
  for (let i = 0; i < 7; i++) {
    const b = buildBush(310 + i, r.range(0.6, 1.1), r() < 0.3 ? "maple" : "bush");
    b.position.set(r.range(-9, 9), 0, r.range(-3.6, -2.2));
    root.add(b);
  }
  const bushFront = buildBush(330, 0.7);
  bushFront.position.set(-1.3, 0, 0.9);
  root.add(bushFront);
  root.add(
    grass(quality === "low" ? 4000 : 12000, (rr) => {
      const x = rr.range(-16, 16);
      const z = rr.range(-12, 1.2);
      if (Math.abs(x) < 0.75 && Math.abs(z) < 0.75) return null;
      return { x, z, h: rr.range(0.3, 0.8) };
    }),
  );
  root.add(
    grass(quality === "low" ? 300 : 900, (rr) => {
      const x = rr.range(-16, 16);
      const z = rr.range(0.7, 10);
      return Math.sin(x * 2.1) * Math.cos(z * 3.3) > 0.7 ? { x, z, h: rr.range(0.12, 0.4) } : null;
    }),
  );
  root.add(buildFallenLeaves(quality === "low" ? 250 : 600, (rr) => [rr.range(-6, 6), rr.range(0.6, 5)] as [number, number], 13));
  const falling = buildFallingLeaves(quality === "low" ? 8 : 16, [{ center: v(-3.8, 6, -3.2), radius: 2.4 }]);
  root.add(falling.group);
  // Beyond the street, the intro film's far view: a small drowned town and
  // blue hills (buildings.ts), brought nearer for the booth's fog
  const cityR = rng(55);
  root.add(buildRuinedTown(21, Array.from({ length: 12 }, () => ({ x: cityR.range(-60, 60), z: cityR.range(-62, -32), ry: cityR.range(-0.4, 0.4) }))));
  root.add(buildHills(0.36));
  root.add(buildDust(quality === "low" ? 20 : 50, [6, 3, 5], [0, 1.6, 1.5]));
  const sky = buildSky({ top: "#4fbde8", horizon: "#fff1dc", sun: "#ffe4bd", sunDir: [-0.7, 0.3, 0.5] });
  root.add(sky);
  return { root, booth, sky, falling, shakeable, wires };
}

export default function Booth({ active, quality }: SceneProps) {
  const built = useMemo(() => timed("booth", () => buildBoothScene(quality)), [quality]);
  const arrived = useWorld((s) => s.arrived);
  const phoneUp = useWorld((s) => s.phoneUp);
  const focus = useWorld((s) => s.focus);

  useFrame(({ camera, clock }, dt) => {
    if (!active) return;
    const t = clock.elapsedTime;
    // Still view: the door and the receiver are simply where they go, the
    // light is steady and the leaves stay where they are
    const still = world.get().still;
    const damp = (from: number, to: number, k: number) => (still ? to : THREE.MathUtils.damp(from, to, k, dt));
    built.sky.position.copy(camera.position);
    const { door, receiver, light } = built.booth;
    // The door opens once you're there
    door.rotation.y = damp(door.rotation.y, arrived ? -1.75 : 0, arrived ? 2.2 : 5);
    // The receiver lifts off the hook toward you
    const up = phoneUp ? 1 : 0;
    receiver.position.x = damp(receiver.position.x, -0.17 + up * 0.12, 7);
    receiver.position.y = damp(receiver.position.y, 0.02 + up * 0.2, 7);
    receiver.position.z = damp(receiver.position.z, 0.06 + up * 0.32, 7);
    receiver.rotation.z = damp(receiver.rotation.z, up * 1.25, 7);
    receiver.rotation.x = damp(receiver.rotation.x, up * 0.35, 7);
    // The light under the roof is steady (lights in the world don't flicker)
    light.intensity = 2.4;
    if (!still) built.falling.update(Math.min(dt, 0.05), t);
    // The wires swing slowly, each line a little out of step
    built.wires.forEach((w, i) => (w.rotation.x = still ? 0 : Math.sin(t * 0.55 + i * 1.7) * 0.05));
  });

  return (
    <group visible={active}>
      <primitive object={built.root} />
      <ShakeableTrees trees={built.shakeable} active={active} />
      <SunLight active={active} position={[-26, 16, 18]} target={[0, 0, 0]} color="#ffd39a" intensity={2.6} size={14} quality={quality} />
      <hemisphereLight userData={HEMI} args={["#f2dcb4", "#5a6338", 1.15]} />
      {active && (
        <>
          <Hitbox
            id="booth:phone"
            position={[0, 1.45, -0.35]}
            size={[0.5, 0.6, 0.3]}
            onSelect={() => {
              const s = world.get();
              if (s.focus !== "phone") world.set({ focus: "phone", phoneUp: true });
              else world.set({ phoneUp: !s.phoneUp });
            }}
          />
          {/* Around the whole booth until you're looking at the phone, so it doesn't catch clicks meant for the phone */}
          {focus !== "phone" && <Hitbox id="booth:booth" position={[0, 1.2, 0]} size={[1.2, 2.4, 1.2]} onSelect={() => world.set({ focus: "phone" })} />}
        </>
      )}
    </group>
  );
}
