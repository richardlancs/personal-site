"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { anchors } from "../anchors";
import { buildArcade, buildCity, buildHills, buildPavilion, buildRailing, buildStation, buildWorkshop } from "../buildings";
import { buildBushes, buildTree, distanceToPath, grass, merge, pathRibbon, treeKinds, type TreeKind } from "../geometry";
import { mesh, paint, windUniforms } from "../paint";
import { crownClusters, foliageGeometry, foliageMaterial, type Cluster } from "../vegetation/foliage";
import { vegMesh } from "../vegetation/shader";
import {
  M,
  buildBench,
  buildBicycle,
  buildBooth,
  buildDust,
  buildFallenLeaves,
  buildFallingLeaves,
  buildFountain,
  buildLamp,
  buildNoticeBoard,
  buildPole,
  buildSignpost,
  buildSky,
  buildSwing,
  buildVending,
  buildWires,
} from "../props";
import { onIdle, timed } from "../idle";
import { rng, type Rng } from "../rng";
import { sectionForAnchor } from "../../../sections/registry";
import { FOUNTAIN_MS, runFountain, useWorld, world } from "../store";
import { groundTexture } from "../textures";
import { Hitbox, SunLight, type SceneProps } from "./common";
import ShakeableTrees, { type ShakeTree } from "./ShakeableTrees";

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// The paths through the park, [x, z], and how wide they are
// The paths through the park, [x, z], and how wide they are: up from the
// steps to the fountain, then one to each place
const paths: { points: [number, number][]; width: number }[] = [
  { points: [[0, 26], [0, 15], [0, 9.5]], width: 3 },
  { points: [[-4.5, 2.5], [-7, -2], [-8.6, -5.6]], width: 2 },
  { points: [[3, -2], [8, -11], [12.5, -19.5], [15.2, -25.6]], width: 2.2 },
  { points: [[0, -2], [1, -14], [3, -30], [4, -45]], width: 2.6 },
  { points: [[-3, -1], [-5, -12], [-7.3, -22], [-8.4, -28]], width: 2.2 },
  { points: [[5, 6], [8.3, 2.9]], width: 1.6 },
];
const PLAZA = { x: 0, z: 4, r: 6.6 };

// Where the places stand, and where their name tags go. Seen from the
// steps, the park is composed across the whole view: the pavilion near on
// the left and the arcade's sign past it, the fountain and the station's
// tower in the middle, the workshop far on the right with the booth and
// the notice board near. Moving one means moving its path (above), its
// footprint (below), its route in scenes.ts and its pin in the registry's
// map.
export const parkPlaces = {
  library: { pos: [-11, 0, -9] as const, ry: 0.75, label: [-8.4, 3.4, -5.9] as const, hit: [8, 6.5, 6] as const, light: [-8.5, 2.5, -6.5] as const },
  workshop: { pos: [17.5, 0, -29] as const, ry: -0.6, label: [17.5, 8.2, -29] as const, hit: [13, 7, 8.5] as const, light: [15.4, 3, -24] as const },
  // The station's box is just its hall; the tower has its own (below), so
  // the trees in front of the empty air beside the tower can be shaken
  station: { pos: [4, 0, -50] as const, ry: 0, label: [4, 21.5, -48] as const, hit: [16, 6.6, 7] as const, light: [4, 4, -44] as const },
  // Turned a little toward the fountain, so its front and sign read from
  // the steps and clear the pavilion's roof
  arcade: { pos: [-10, 0, -33] as const, ry: 0.37, label: [-10, 8, -33] as const, hit: [10.5, 7, 8.5] as const, light: [-8.5, 3, -29] as const },
  // The booth's tag sits just over its roof: on a 4:3 touch screen, where
  // every tag is up at once, a higher one met the workshop's
  booth: { pos: [9.5, 0, 1.5] as const, ry: -0.5, label: [9.5, 3.0, 1.5] as const, hit: [1.6, 2.8, 1.6] as const, light: [9.2, 2.4, 2.4] as const },
  board: { pos: [4.25, 0, -1.6] as const, ry: -0.18, label: [4.25, 3.1, -1.6] as const, hit: [2.6, 2.8, 0.8] as const, light: [4.1, 2.4, 0] as const },
};

function onPath(x: number, z: number, margin = 0) {
  if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r + margin) return true;
  return paths.some((p) => distanceToPath(x, z, p.points) < p.width / 2 + margin);
}

// Footprints the grass and trees keep out of
const footprints: [number, number, number][] = [
  [-11, -9, 5],
  [17.5, -29, 8],
  [4, -50, 9],
  [-10, -33, 7],
  [9.5, 1.5, 1.2],
  [11, 0, 1],
  [4.25, -1.6, 1.4],
  [-8, 3.5, 2],
];
const blocked = (x: number, z: number) => footprints.some(([fx, fz, r]) => Math.hypot(x - fx, z - fz) < r);

function buildPark(quality: "high" | "low") {
  const root = new THREE.Group();
  const r = rng(2026);
  // Marks on the performance timeline for each part of the build
  let stage = performance.now();
  const mark = (name: string) => {
    const now = performance.now();
    performance.measure(`park:${name}`, { start: stage, end: now });
    stage = now;
  };

  // Ground, paths and the plaza
  const groundTex = groundTexture();
  groundTex.repeat.set(110, 110);
  const ground = mesh(new THREE.PlaneGeometry(600, 600).rotateX(-Math.PI / 2), paint({ map: groundTex, brush: 0.35, brushScale: 0.08 }), { cast: false });
  root.add(ground);
  root.add(mesh(merge(paths.map((p) => pathRibbon(p.points, p.width, 0.024))), M.paving(), { cast: false }));
  const plaza = new THREE.CircleGeometry(PLAZA.r, 48).rotateX(-Math.PI / 2);
  const uv = plaza.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * PLAZA.r * 0.7, uv.getY(i) * PLAZA.r * 0.7);
  root.add(mesh(plaza.translate(PLAZA.x, 0.02, PLAZA.z), M.paving(), { cast: false }));
  // The steps up into the park
  for (let i = 0; i < 3; i++) root.add(mesh(new THREE.BoxGeometry(5, 0.18, 0.9).translate(0, 0.09 - i * 0.18 + 0.36 - 0.18, 23.2 + i * 0.9), M.stone()));
  mark("ground");

  // The places
  const place = (obj: THREE.Object3D, key: keyof typeof parkPlaces) => {
    const p = parkPlaces[key];
    obj.position.set(p.pos[0], p.pos[1], p.pos[2]);
    obj.rotation.y = p.ry;
    root.add(obj);
    return obj;
  };
  const pavilion = buildPavilion();
  place(pavilion.group, "library");
  place(buildWorkshop(), "workshop");
  place(buildStation(), "station");
  const arcade = buildArcade();
  place(arcade.group, "arcade");
  const booth = buildBooth();
  place(booth.group, "booth");
  const board = buildNoticeBoard();
  place(board.group, "board");
  mark("places");

  // Things left behind
  const fountain = buildFountain();
  fountain.group.position.set(PLAZA.x, 0, PLAZA.z);
  root.add(fountain.group);
  const swing = buildSwing();
  swing.group.position.set(-8, 0, 3.5);
  swing.group.rotation.y = 0.35;
  root.add(swing.group);
  const bike = buildBicycle();
  bike.position.set(-6.4, 0, 11.6);
  bike.rotation.set(0.2, 0.18, 0);
  root.add(bike);
  root.add(buildRailing([v(-13, 0, 13.6), v(-8, 0, 12.4), v(-4.2, 0, 11.4), v(-2.1, 0, 9.8)]));
  root.add(buildRailing([v(2.1, 0, 9.8), v(4.4, 0, 11.6), v(9, 0, 12.6), v(15, 0, 13.4)]));
  for (const [x, z, ry, bag] of [
    [6.4, 9.6, -0.95, true],
    [-6.6, -0.6, 0.55, false],
    [13.2, 4, -1.4, false],
  ] as const) {
    const bench = buildBench({ bag });
    bench.position.set(x, 0, z);
    bench.rotation.y = ry;
    root.add(bench);
  }
  const vending = buildVending();
  vending.position.set(11.1, 0, -0.2);
  vending.rotation.y = -0.75;
  root.add(vending);
  for (const [x, z, lit] of [
    [-2.4, 13, false],
    [2.6, -7, true],
    [-7.6, -13, false],
    [11.6, -5.5, false],
  ] as const) {
    const lamp = buildLamp({ lit });
    lamp.position.set(x, 0, z);
    lamp.rotation.y = r() * 6;
    root.add(lamp);
  }
  // Each arm points at its place (the angle is atan2(-dz, dx) from here)
  const sign = buildSignpost([
    { zh: "工坊", label: "Workshop", angle: 1.0 },
    { zh: "车站", label: "Station", angle: 1.43 },
    { zh: "游戏厅", label: "Arcade", angle: 1.80 },
    { zh: "凉亭", label: "Pavilion", angle: 2.47 },
  ]);
  sign.group.position.set(-2.7, 0, -2.4);
  root.add(sign.group);

  // Poles and wires across the back of the park
  const poleSpots = [-40, -26, -12, 13, 27, 41].map((x) => v(x, 0, -37 + Math.sin(x) * 1.5));
  for (const p of poleSpots) {
    const pole = buildPole();
    pole.position.copy(p);
    root.add(pole);
  }
  root.add(buildWires(poleSpots, [8.3, 7.6]));
  mark("props");

  // Trees
  const trees: [keyof typeof treeKinds, number, number, number][] = [
    ["zelkova", -7.8, 19.5, 1.2],
    ["maple", 8.2, 18.8, 1.1],
    ["zelkova", -17, 6, 1],
    // The ginkgo stands by the pavilion, out of the line from the steps to
    // the arcade's sign
    ["ginkgo", -16.5, -1.5, 0.9],
    ["zelkova", -24, -9, 1.1],
    ["zelkova", 14.5, 10.5, 1],
    ["zelkova", 18, -3.5, 1.15],
    ["maple", 8, -14.5, 1],
    ["maple", -11.5, 12.5, 0.9],
    ["zelkova", 25, -14, 1],
    ["zelkova", -20, -27, 1.1],
    ["ginkgo", -14, -16, 1],
    ["ginkgo", 6.5, -31, 1],
    ["zelkova", 23, -40, 1.2],
    ["zelkova", -31, -18, 1.2],
    ["zelkova", 33, -8, 1.2],
    ["pine", -36, 4, 1],
    ["pine", 38, 6, 1],
    ["pine", -20, -46, 1.1],
    ["zelkova", 22, -44, 1.1],
    ["maple", -22, -40, 0.9],
    ["zelkova", -38, -34, 1.3],
    ["zelkova", 40, -26, 1.3],
    // Where the arcade stood, past the workshop
    ["zelkova", 28, -26, 1.2],
  ];
  const crowns: { center: THREE.Vector3; radius: number }[] = [];
  const shakeable: ShakeTree[] = [];
  // The far trees are built later, in idle time (see `late`), so the
  // first frame comes sooner. The random draws stay in order either way.
  const lateTrees: (() => void)[] = [];
  trees.forEach(([kind, x, z, scale], i) => {
    if (quality === "low" && i > 15) return;
    const k: TreeKind = treeKinds[kind];
    const ry = r() * Math.PI * 2;
    const build = () => {
      const near = Math.hypot(x, z - 4) < 34;
      const t = buildTree(100 + i, k, { shadows: near, far: !near || quality === "low" });
      t.position.set(x, 0, z);
      t.scale.setScalar(scale);
      t.rotation.y = ry;
      root.add(t);
      shakeable.push({ group: t, crown: v(x, k.height * scale * 0.72, z), radius: k.spread * 0.6 * scale, height: k.height * scale, tint: k.fall ?? "#ffffff" });
    };
    if (Math.hypot(x, z) < 30) build();
    else lateTrees.push(build);
    if (Math.hypot(x, z) < 26) crowns.push({ center: v(x, treeKinds[kind].height * scale * 0.75, z), radius: 2.5 * scale });
  });
  mark("trees");

  // Bushes along the edges of paths and buildings, merged by palette
  const bushes: Parameters<typeof buildBushes>[0] = [];
  while (bushes.length < (quality === "low" ? 18 : 34)) {
    const x = r.range(-30, 30);
    const z = r.range(-40, 24);
    if (onPath(x, z, 1.3) || blocked(x, z) || Math.hypot(x - 1.4, z - 16.5) < 4) continue;
    if (!onPath(x, z, 4.5) && r() < 0.6) continue;
    bushes.push({ seed: 300 + bushes.length, size: r.range(0.6, 1.2), palette: r() < 0.25 ? "maple" : "bush", x, z });
  }
  root.add(buildBushes(bushes));
  mark("bushes");

  // Grass: thick near the eye, a few blades between the stones of the
  // paths; the thinner, taller grass far off comes with the far scenery
  // (`late`, below), after the first frame
  const bladeCount = quality === "low" ? 12000 : 42000;
  const placeBlade = (rr: Rng, near: boolean) => {
    const x = near ? rr.range(-22, 22) : rr.range(-48, 48);
    const z = near ? rr.range(-18, 22) : rr.range(-55, 26);
    if (blocked(x, z)) return null;
    if (onPath(x, z, -0.15)) return rr() < 0.04 ? { x, z, h: 0.18 } : null;
    const edge = onPath(x, z, 1.2) ? 0.6 : 1;
    return { x, z, h: rr.range(0.3, 0.75) * edge * (near ? 1 : 1.25) };
  };
  root.add(grass(Math.round(bladeCount * 0.72), (rr) => placeBlade(rr, true)));
  mark("grass");

  // Leaves on the ground, gathered along the edges of the paths
  root.add(
    buildFallenLeaves(quality === "low" ? 500 : 1400, (rr) => {
      const x = rr.range(-16, 16);
      const z = rr.range(-14, 20);
      return onPath(x, z, 0.6) && (rr() < 0.4 || !onPath(x, z, -0.5)) ? [x, z] : null;
    }),
  );
  const falling = buildFallingLeaves(quality === "low" ? 16 : 36, crowns);
  root.add(falling.group);
  mark("leaves");

  // The empty city, the hills and the far trees: past the fog's reach
  // at first, so they're built once the first frame is up
  const late = () => {
    for (const build of lateTrees) build();
    lateTrees.length = 0;
    root.add(grass(Math.round(bladeCount * 0.28), (rr) => placeBlade(rr, false), 8, true));
    const cityR = rng(404);
    const spots = [];
    for (let i = 0; i < 46; i++) {
      const a = cityR.range(-Math.PI * 0.98, -Math.PI * 0.02);
      const d = cityR.range(68, 130);
      spots.push({ x: Math.cos(a) * d, z: Math.sin(a) * d - 10, w: cityR.range(9, 16), d: cityR.range(9, 14), h: cityR.range(12, 44) });
    }
    for (let i = 0; i < 10; i++) {
      const side = i % 2 ? 1 : -1;
      spots.push({ x: side * cityR.range(62, 90), z: cityR.range(-5, 40), w: cityR.range(9, 14), d: cityR.range(9, 14), h: cityR.range(10, 30) });
    }
    root.add(buildCity(7, spots));
    root.add(buildHills());
    // Stands of trees between the park and the city: each a crown of
    // leaf masses, lit like the near trees, all in one mesh
    const belt: Cluster[][] = [];
    for (let i = 0; i < 70; i++) {
      const a = cityR.range(-Math.PI * 1.1, Math.PI * 0.1);
      const d = cityR.range(46, 62);
      const size = cityR.range(3, 6);
      const at = v(Math.cos(a) * d, cityR.range(3, 6), Math.sin(a) * d - 6);
      const ends = [0, 1, 2].map((k) => ({ center: at.clone().add(v(Math.cos(a + k * 2.1) * size * 0.45, k * size * 0.18, Math.sin(a + k * 2.1) * size * 0.45)), radius: size * cityR.range(0.55, 0.7) }));
      belt.push(crownClusters(cityR, ends, { satellites: 2, squash: 0.85 }));
    }
    root.add(vegMesh(foliageGeometry(cityR, belt, { detail: 1, cards: 0.35 }), foliageMaterial("belt", 10, 0.1), false));
  };

  root.add(buildDust(quality === "low" ? 50 : 140, [26, 6, 26], [-2, 3, 6]));
  const sky = buildSky({ top: "#4fbde8", horizon: "#fff1dc", sun: "#ffe4bd", sunDir: [-0.75, 0.32, 0.25] });
  root.add(sky);
  mark("sky");

  return { root, sky, swing, sign, booth, board, falling, arcade, pavilion, fountain, shakeable, late };
}

export default function Park({ active, quality, navigate }: SceneProps) {
  const built = useMemo(() => timed("park", () => buildPark(quality)), [quality]);
  const hover = useWorld((s) => s.hover);
  const focus = useWorld((s) => s.focus);
  const lights = useRef<Record<string, THREE.PointLight | null>>({});
  const kick = useRef({ swing: 0, sign: 0 });
  const water = useRef(0); // the fountain, 0 off to 1 running
  const fountainLight = useRef<THREE.PointLight>(null);

  useEffect(() => {
    for (const [id, p] of Object.entries(parkPlaces)) anchors.set(`park:${id}`, v(p.label[0], p.label[1], p.label[2]));
  }, []);

  // The far scenery, once the browser has a moment
  useEffect(() => onIdle(built.late, 1500), [built]);

  useFrame(({ camera }, dt) => {
    if (!active) return;
    // The world's clock (World3D.tsx: Wind), which stops in still view, so
    // the swing, the signs and the falling leaves hold where they are
    const t = windUniforms.uTime.value;
    const still = world.get().still;
    built.sky.position.copy(camera.position);
    const wind = windUniforms.uGust.value;
    // The swing: a pendulum the wind pushes now and then
    // (in still view the pushes hold too, or the swing would creep)
    if (!still) kick.current.swing = Math.max(kick.current.swing * Math.exp(-dt * 0.35), wind * 0.22);
    built.swing.seats.forEach((seat, i) => {
      seat.rotation.x = Math.sin(t * 2.05 + i * 1.3) * (0.03 + kick.current.swing) * (i ? 0.8 : 1);
    });
    // Sign arms knock in gusts
    if (!still) kick.current.sign = Math.max(kick.current.sign * Math.exp(-dt * 0.8), wind * 0.06);
    built.sign.swing.forEach((arm, i) => {
      arm.rotation.z = Math.sin(t * 3.1 + i * 2) * (0.006 + kick.current.sign);
    });
    // The booth light catches now and then
    const flick = !still && Math.sin(t * 0.37) > 0.985 ? 0.35 + 0.65 * Math.abs(Math.sin(t * 41)) : 1;
    built.booth.light.intensity = 2.2 * flick;
    built.booth.tubeMat.emissiveIntensity = 1.6 * flick;
    // The map lifts off the board when you look closely
    const lift = focus === "board" ? 1 : 0;
    const lifting = still ? 1 : 1 - Math.exp(-3 * dt); // (THREE.MathUtils.damp's factor; still view: at once)
    built.board.map.rotation.x += (-0.22 * lift - built.board.map.rotation.x) * lifting;
    built.board.map.position.z += (0.008 + 0.08 * lift - built.board.map.position.z) * lifting;
    // The arcade's sign hums
    (built.arcade.signMat as THREE.MeshLambertMaterial).emissiveIntensity = 0.18 + (!still && Math.sin(t * 13) > 0.92 ? 0.12 : 0);
    if (!still) built.falling.update(Math.min(dt, 0.05), t);
    // The fountain: rises quickly, runs a while, dies down more slowly
    const started = world.get().fountain;
    const running = started > 0 && performance.now() - started < FOUNTAIN_MS;
    water.current = still ? (running ? 1 : 0) : THREE.MathUtils.damp(water.current, running ? 1 : 0, running ? 2.6 : 1.1, dt);
    built.fountain.update(water.current, t);
    // Pointing at the fountain warms its stone, like the places' lights
    const lit = hover === "park:fountain" ? 0.22 : 0;
    built.fountain.stone.emissiveIntensity = THREE.MathUtils.damp(built.fountain.stone.emissiveIntensity, lit, 6, dt);
    if (fountainLight.current) fountainLight.current.intensity = THREE.MathUtils.damp(fountainLight.current.intensity, lit ? 6 : 0, 6, dt);
    // Light comes up on the place you point at
    for (const [id, light] of Object.entries(lights.current)) {
      if (!light) continue;
      light.intensity = THREE.MathUtils.damp(light.intensity, hover === `park:${id}` ? 9 : 0, 6, dt);
    }
  });

  const kickSwing = () => {
    if (world.get().still) return; // in still view the swing stays put
    kick.current.swing = 0.35;
  };

  return (
    <group visible={active}>
      <primitive object={built.root} />
      <ShakeableTrees trees={built.shakeable} active={active} />
      <SunLight active={active} position={[-48, 34, 20]} target={[0, 0, -8]} color="#ffd09a" intensity={3.1} size={44} quality={quality} />
      <hemisphereLight args={["#fbe6bf", "#6a6f42", 1.35]} />
      {Object.entries(parkPlaces).map(([id, p]) => (
        <pointLight key={id} ref={(l) => void (lights.current[id] = l)} position={[...p.light]} color="#ffcf8a" intensity={0} distance={12} decay={1.4} />
      ))}
      {active &&
        Object.entries(parkPlaces).map(([id, p]) => (
          <Hitbox
            key={id}
            id={`park:${id}`}
            position={[p.pos[0], p.hit[1] / 2, p.pos[2]]}
            rotation={p.ry}
            size={p.hit}
            onSelect={() => navigate(sectionForAnchor(id as keyof typeof parkPlaces)?.href ?? "/")}
          />
        ))}
      <pointLight ref={fountainLight} position={[PLAZA.x + 0.8, 2.6, PLAZA.z + 2.4]} color="#ffcf8a" intensity={0} distance={8} decay={1.4} />
      {active && (
        <>
          {/* The basin's rim and the column, kept low so they don't catch clicks meant for the board behind */}
          <Hitbox id="park:fountain" position={[PLAZA.x, 0.35, PLAZA.z]} size={[6.4, 0.7, 6.4]} onSelect={runFountain} />
          <Hitbox id="park:fountain" position={[PLAZA.x, 1.15, PLAZA.z]} size={[1.8, 1.7, 1.8]} onSelect={runFountain} />
        </>
      )}
      {active && <Hitbox id="park:station" position={[4, 10, -48]} size={[3.8, 20, 3.8]} onSelect={() => navigate(sectionForAnchor("station")?.href ?? "/")} />}
      {active && <Hitbox id="park:swing" position={[-8, 1.3, 3.5]} rotation={0.35} size={[3, 2.6, 2]} onSelect={kickSwing} />}
    </group>
  );
}
