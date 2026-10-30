"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { experience } from "../../../data/portfolio";
import { at, blob, box, buildBush, buildTree, buildVine, grass, merge, treeKinds, tube } from "../geometry";
import { mesh, paint, windUniforms } from "../paint";
import { M, buildBeam, buildBench, buildDust, buildFallenLeaves, buildPole, buildSky, buildVending, buildWires, mat } from "../props";
import { buildCity } from "../buildings";
import { rng } from "../rng";
import { useWorld, world } from "../store";
import { clockFace, enamel, groundTexture, plaster, textPanel } from "../textures";
import { Hitbox, SunLight, type SceneProps } from "./common";

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const TOP = 0.95; // the platform's surface
export const BOARD = { x: -2.2, y: 2.15, z: -2.78, w: 2.3, h: 1.6 };

const when = (i: number) => {
  const e = experience[i];
  return e.endDate ? `${e.startDate} – ${e.endDate}` : e.startDate;
};

// One line of the timetable, drawn as a flap
function rowTexture(i: number, selected: boolean) {
  const e = experience[i];
  return textPanel(`timetable-row-${i}-${selected}`, 512, 96, {
    background: selected ? "#e4d3a4" : "#22382b",
    padding: 16,
    valign: "middle",
    lines: [
      { text: e.role, size: e.role.length > 28 ? 21 : 25, color: selected ? "#1f2a1f" : "#ece3c9", weight: 600, gap: 4 },
      { text: `${when(i)}  ·  ${e.organization}`, size: when(i).length + e.organization.length > 40 ? 16 : 19, color: selected ? "#3d3220" : "#c8c1a8" },
    ],
  });
}

function buildStationScene(quality: "high" | "low") {
  const root = new THREE.Group();
  const r = rng(61);

  // The ground and the two tracks
  const groundTex = groundTexture();
  const ground = mesh(new THREE.PlaneGeometry(260, 260).rotateX(-Math.PI / 2), paint({ map: groundTex, brush: 0.35, brushScale: 0.1 }), { cast: false });
  root.add(ground);
  const ballast = mat("ballast", () => paint({ color: "#6e6656", brush: 0.6, brushScale: 3, moss: 0.4 }));
  const sleepers: THREE.BufferGeometry[] = [];
  const rails: THREE.BufferGeometry[] = [];
  for (const z of [4.4, 7.8]) {
    root.add(mesh(box(120, 0.12, 3.2, 0.5).translate(0, 0.06, z), ballast, { cast: false }));
    for (let x = -60; x < 60; x += 0.65) sleepers.push(at(box(0.22, 0.1, 2.4), x + r.range(-0.03, 0.03), 0.16, z, r.range(-0.03, 0.03)));
    for (const s of [-0.72, 0.72]) rails.push(at(box(120, 0.12, 0.08), 0, 0.27, z + s));
  }
  root.add(mesh(merge(sleepers), mat("sleeper", () => paint({ color: "#5a4636", brush: 0.5, brushScale: 3, moss: 0.6 }))));
  root.add(mesh(merge(rails), M.rust()));

  // The platform: concrete, a faded yellow line, cracks with grass
  root.add(mesh(box(26, TOP, 5.4, 0.5).translate(0, TOP / 2, -0.4), M.concrete()));
  root.add(mesh(at(box(26, 0.012, 0.32), 0, TOP + 0.006, 1.85), mat("tactile", () => paint({ color: "#c9ae5a", brush: 0.5, brushScale: 2, grime: 0.4 })), { cast: false }));
  // The station building behind
  const wall = mat("stationInner", () => paint({ map: plaster("cream"), brush: 0.2, grime: 0.8, grimeHeight: 2.2, moss: 0.25 }));
  root.add(mesh(box(26, 4.4, 0.5, 0.4).translate(0, TOP + 2.2, -3.3), wall));
  // Doors and a ticket window
  for (const [x, w, h, lit] of [
    [-7.5, 1.8, 2.5, 0.2],
    [3.2, 1.4, 1.0, 0.45],
    [8.5, 1.8, 2.5, 0.15],
  ] as const) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(`stationOpening-${lit}`, () => paint({ color: "#3a2c20", emissive: "#ffb867", emissiveIntensity: lit, brush: 0.3 })));
    p.position.set(x, TOP + (h > 2 ? h / 2 : 1.6), -3.04);
    root.add(p);
  }
  // The canopy over the platform, one panel missing
  const roofMat = mat("canopy", () => paint({ color: "#7d8a7c", brush: 0.4, brushScale: 2, rust: 0.55, moss: 0.4 }));
  root.add(mesh(merge([at(box(11, 0.1, 5.2), -7.5, TOP + 3.4, -0.5, 0, 0.06), at(box(11, 0.1, 5.2), 7.8, TOP + 3.4, -0.5, 0, 0.06), at(box(3, 0.1, 2), 0.6, TOP + 3.4, -2, 0, 0.06)]), roofMat));
  const columns: THREE.BufferGeometry[] = [];
  for (let x = -12; x <= 12; x += 4) columns.push(at(box(0.18, 3.4, 0.18), x, TOP + 1.7, 0.6), at(box(0.1, 0.1, 3.8), x, TOP + 3.3, -1.2));
  root.add(mesh(merge(columns), M.green()));
  // Through the gap: a shaft of sun
  const beam = buildBeam(4.5, 2.2, "#ffd9a0", 0.2);
  beam.position.set(0.8, TOP + 3.4, 0.4);
  beam.rotation.set(-0.25, 0, -0.35);
  root.add(beam);

  // The timetable board on the wall (rows are added by the component)
  const board = new THREE.Group();
  board.position.set(BOARD.x, BOARD.y, BOARD.z);
  board.add(mesh(box(BOARD.w + 0.16, BOARD.h + 0.16, 0.08), mat("boardFrame", () => paint({ map: enamel(150, 25, 20), rust: 0.5, brush: 0.2 }))));
  const head = textPanel("timetable-head", 512, 80, {
    background: "#1b2a22",
    padding: 16,
    valign: "middle",
    lines: [{ text: "时刻表   TIMETABLE", size: 34, font: "display", color: "#ece3c9", weight: 600 }],
  });
  const headMesh = new THREE.Mesh(new THREE.PlaneGeometry(BOARD.w, 0.34), mat("timetableHead", () => paint({ map: head, brush: 0.12, emissive: "#ffffff", emissiveIntensity: 0.05 })));
  headMesh.position.set(0, BOARD.h / 2 - 0.2, 0.045);
  board.add(headMesh);
  const backing = new THREE.Mesh(new THREE.PlaneGeometry(BOARD.w, BOARD.h - 0.4), mat("timetableBack", () => paint({ color: "#1f3328", brush: 0.25, brushScale: 6 })));
  backing.position.set(0, -0.2, 0.043);
  board.add(backing);
  root.add(board);

  // The clock under the canopy, stopped
  const clock = new THREE.Group();
  clock.position.set(3.4, TOP + 2.75, 0.4);
  clock.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 28).rotateX(Math.PI / 2), M.green()));
  const face = mat("clock", () => paint({ map: clockFace(), brush: 0.1, emissive: "#fff2d0", emissiveIntensity: 0.12 }));
  for (const side of [1, -1]) {
    const f = new THREE.Mesh(new THREE.CircleGeometry(0.37, 28), face);
    f.position.z = 0.062 * side;
    if (side < 0) f.rotation.y = Math.PI;
    clock.add(f);
  }
  clock.add(mesh(at(box(0.05, 0.62, 0.05), 0, 0.68, 0), M.iron()));
  root.add(clock);
  // A minute hand that tries to move when you tap the clock
  const hand = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.27).translate(0, 0.12, 0), new THREE.MeshBasicMaterial({ color: "#2b2f27" }));
  hand.position.set(3.4, TOP + 2.75, 0.47);
  hand.rotation.z = -(17 / 60) * Math.PI * 2;
  root.add(hand);

  // The name sign, hanging by one chain now
  const nameTex = textPanel("platform-name", 512, 128, {
    background: "#f0e8d6",
    padding: 8,
    valign: "middle",
    lines: [
      { text: "光明公园", size: 46, font: "display", color: "#22392b", weight: 600, align: "center", gap: 2 },
      { text: "GUĀNGMÍNG GŌNGYUÁN", size: 22, color: "#22392b", weight: 500, align: "center" },
    ],
  });
  const sign = new THREE.Group();
  sign.position.set(-7.4, TOP + 3.3, 0.6);
  const signBoard = new THREE.Mesh(box(1.9, 0.5, 0.05), [M.iron(), M.iron(), M.iron(), M.iron(), mat("platformName", () => paint({ map: nameTex, brush: 0.15, grime: 0.3 })), M.iron()]);
  signBoard.position.set(0.85, -0.55, 0);
  signBoard.rotation.z = -0.28;
  signBoard.castShadow = true;
  sign.add(signBoard);
  sign.add(mesh(at(box(0.012, 0.32, 0.012), 0, -0.16, 0), M.iron(), { cast: false }));
  root.add(sign);

  // Benches, luggage, a vending machine
  for (const [x, ry, bag] of [
    [7, Math.PI, false],
    [-11, Math.PI, true],
  ] as const) {
    const b = buildBench({ bag });
    b.position.set(x, TOP, -2.4);
    b.rotation.y = ry + Math.PI;
    root.add(b);
  }
  const suitcase = new THREE.Group();
  suitcase.add(mesh(box(0.55, 0.7, 0.24, 2), mat("suitcase", () => paint({ color: "#7c4a32", brush: 0.35, brushScale: 5, grime: 0.4 }))));
  suitcase.add(mesh(merge([at(box(0.57, 0.04, 0.26), 0, 0.15, 0), at(box(0.57, 0.04, 0.26), 0, -0.15, 0), tube([v(-0.1, 0.35, 0), v(-0.08, 0.43, 0), v(0.08, 0.43, 0), v(0.1, 0.35, 0)], () => 0.012, 8, 4)]), M.iron()));
  suitcase.position.set(5.6, TOP + 0.36, -1.6);
  suitcase.rotation.set(0, 0.5, 0.06);
  root.add(suitcase);
  const umbrella = mesh(tube([v(0, 0, 0), v(0.05, 0.9, 0)], () => 0.012, 2, 4), M.iron());
  umbrella.position.set(-10.3, TOP, -2.8);
  umbrella.rotation.z = 0.32;
  root.add(umbrella);
  const vending = buildVending();
  vending.position.set(10.5, TOP, -2.5);
  root.add(vending);
  // Railings at the ends of the platform
  for (const x of [-13, 13]) root.add(mesh(merge([tube([v(x, TOP, -3), v(x, TOP + 1, -3), v(x, TOP + 1, 2), v(x, TOP, 2)], () => 0.03, 12, 5)]), M.rust()));

  // Overhead wires along the tracks
  const poles = [-40, -20, 0, 20, 40].map((x) => v(x, 0, 10));
  for (const p of poles) {
    const pole = buildPole();
    pole.position.copy(p);
    root.add(pole);
  }
  root.add(buildWires(poles, [8.3], 0.7));
  root.add(mesh(merge(poles.map((p) => at(box(0.08, 0.08, 7), p.x, 7.2, 6.5))), M.iron()));
  root.add(buildWires(poles.map((p) => p.clone().setZ(4.4)), [6.4], 0.01));

  // Green taking it back: vines up the columns, grass between the
  // sleepers and in the cracks, bushes, trees past the tracks
  for (const x of [-8, 4, 12]) root.add(buildVine(100 + x, [v(x, TOP, 0.7), v(x + 0.05, TOP + 1.6, 0.72), v(x - 0.04, TOP + 3.2, 0.7), v(x + 0.6, TOP + 3.38, 0.2)], 0.28));
  root.add(buildVine(110, [v(-13, TOP + 4.4, -3.04), v(-11.5, TOP + 3.2, -3.04), v(-10.6, TOP + 1.4, -3.04), v(-10.4, TOP, -3.04)], 0.35));
  root.add(
    grass(quality === "low" ? 6000 : 18000, (rr) => {
      const x = rr.range(-40, 40);
      const z = rr.range(2.2, 26);
      const onSleepers = Math.abs(z - 4.4) < 1.5 || Math.abs(z - 7.8) < 1.5;
      if (onSleepers && rr() < 0.55) return null;
      return { x, z, h: onSleepers ? rr.range(0.2, 0.5) : rr.range(0.35, 0.9) };
    }),
  );
  const cracks = grass(quality === "low" ? 300 : 800, (rr) => {
    const x = rr.range(-12, 12);
    const z = rr.range(-2.8, 2.0);
    return Math.sin(x * 1.3) * Math.cos(z * 2.1) > 0.75 ? { x, z, h: rr.range(0.15, 0.35) } : null;
  });
  cracks.position.y = TOP;
  root.add(cracks);
  root.add(buildFallenLeaves(quality === "low" ? 200 : 500, (rr) => [rr.range(-12, 12), rr.range(-2.8, 2)] as [number, number], 9).translateY(TOP));
  for (let i = 0; i < 8; i++) {
    const b = buildBush(400 + i, r.range(0.7, 1.4), r() < 0.3 ? "maple" : "bush");
    b.position.set(r.range(-30, 30), 0, r.range(11, 16));
    root.add(b);
  }
  [
    ["zelkova", -16, 18, 1.1],
    ["ginkgo", -3, 20, 1],
    ["maple", 9, 16, 1],
    ["zelkova", 22, 21, 1.2],
    ["zelkova", -30, 22, 1.2],
  ].forEach(([kind, x, z, s], i) => {
    const t = buildTree(500 + i, treeKinds[kind as keyof typeof treeKinds], { shadows: false });
    t.position.set(x as number, 0, z as number);
    t.scale.setScalar(s as number);
    root.add(t);
  });
  const cityR = rng(77);
  root.add(
    buildCity(
      13,
      Array.from({ length: 26 }, () => ({ x: cityR.range(-120, 120), z: cityR.range(45, 110), w: cityR.range(9, 15), d: cityR.range(9, 13), h: cityR.range(12, 40) })),
    ),
  );
  root.add(buildDust(quality === "low" ? 30 : 80, [10, 3, 5], [1, TOP + 1.8, 0]));
  const sky = buildSky({ top: "#5f94cc", horizon: "#f4e2bc", sun: "#ffd29a", sunDir: [0.8, 0.25, 0.5] });
  root.add(sky);
  // A blob of rubble at the end of the platform
  root.add(mesh(blob(r, 0.6, 0.5, 0.4, 1).translate(-12.2, TOP + 0.15, 1.4), M.concrete()));
  return { root, board, sky, hand, sign };
}

export default function Station({ active, quality }: SceneProps) {
  const built = useMemo(() => buildStationScene(quality), [quality]);
  const line = useWorld((s) => s.sel.line);
  const rows = useMemo(
    () =>
      experience.map((_, i) => {
        const pivot = new THREE.Group();
        pivot.position.set(0, BOARD.h / 2 - 0.6 - i * 0.4, 0.06);
        const flap = new THREE.Mesh(new THREE.PlaneGeometry(BOARD.w - 0.12, 0.34), new THREE.MeshLambertMaterial({ map: rowTexture(i, false) }));
        flap.castShadow = false;
        pivot.add(flap);
        return { pivot, flap };
      }),
    [],
  );
  // Hung on the board here, not while rendering, so a render React throws
  // away can't leave a second set of flaps behind
  useEffect(() => {
    const pivots = rows.map((row) => row.pivot);
    built.board.add(...pivots);
    return () => void built.board.remove(...pivots);
  }, [built, rows]);
  const flip = useRef(experience.map(() => 0));
  const shown = useRef(-1);
  const tap = useRef(0);

  useFrame(({ camera, clock }, dt) => {
    if (!active) return;
    built.sky.position.copy(camera.position);
    const t = clock.elapsedTime;
    if (shown.current !== line) {
      // The chosen line turns over; the one before turns back
      rows.forEach((_, i) => {
        if (i === line || i === shown.current) flip.current[i] = 1;
      });
      shown.current = line;
    }
    rows.forEach((row, i) => {
      const f = flip.current[i];
      if (f > 0) {
        flip.current[i] = Math.max(0, f - dt * 2.4);
        const turned = 1 - flip.current[i];
        row.pivot.rotation.x = -turned * Math.PI * 2;
        // Swap the printing as the flap goes edge-on
        if (turned > 0.25) (row.flap.material as THREE.MeshLambertMaterial).map = rowTexture(i, i === line);
      } else {
        row.pivot.rotation.x = 0;
        (row.flap.material as THREE.MeshLambertMaterial).map = rowTexture(i, i === line);
      }
    });
    // The broken sign swings on its last chain
    const gust = windUniforms.uGust.value;
    built.sign.rotation.z = Math.sin(t * 1.3) * (0.03 + gust * 0.08);
    // The clock's hand tries to move, then gives up
    tap.current = Math.max(0, tap.current - dt);
    built.hand.rotation.z = -(17 / 60) * Math.PI * 2 - Math.sin(tap.current * 30) * tap.current * 0.08;
  });

  return (
    <group visible={active}>
      <primitive object={built.root} />
      <SunLight active={active} position={[30, 16, 22]} target={[0, 0, 0]} color="#ffd29a" intensity={2.8} size={22} quality={quality} />
      <hemisphereLight args={["#f2dcb4", "#5a6338", 1.15]} />
      {active && (
        <>
          <Hitbox id="station:timetable" position={[BOARD.x, BOARD.y + BOARD.h / 2 - 0.2, BOARD.z + 0.1]} size={[BOARD.w, 0.4, 0.2]} onSelect={() => world.set({ focus: "timetable" })} />
          {experience.map((_, i) => (
            <Hitbox
              key={i}
              id={`station:line-${i}`}
              position={[BOARD.x, BOARD.y + BOARD.h / 2 - 0.6 - i * 0.4, BOARD.z + 0.1]}
              size={[BOARD.w, 0.36, 0.2]}
              onSelect={() => {
                world.select("line", i);
                world.set({ focus: "timetable" });
              }}
            />
          ))}
          <Hitbox id="station:clock" position={[3.4, TOP + 2.75, 0.4]} size={[0.9, 0.9, 0.3]} onSelect={() => void (tap.current = 1)} />
        </>
      )}
    </group>
  );
}
