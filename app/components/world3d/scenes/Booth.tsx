"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { box, buildBush, buildTree, buildVine, grass, treeKinds } from "../geometry";
import { mesh, paint } from "../paint";
import { M, buildBooth, buildDust, buildFallenLeaves, buildFallingLeaves, buildLamp, buildPole, buildSky, buildVending, buildWires } from "../props";
import { buildCity } from "../buildings";
import { rng } from "../rng";
import { useWorld, world } from "../store";
import { flagstones, groundTexture } from "../textures";
import { Hitbox, SunLight, type SceneProps } from "./common";

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

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
  const vending = buildVending();
  vending.position.set(1.6, 0.1, -0.9);
  vending.rotation.y = -0.15;
  root.add(vending);
  const lamp = buildLamp({ lit: true });
  lamp.position.set(-2.6, 0.1, 1.2);
  lamp.rotation.y = 0.4;
  root.add(lamp);
  const poles = [v(-14, 0, 4.2), v(3.6, 0, 4.2), v(20, 0, 4.2)];
  for (const p of poles) {
    const pole = buildPole();
    pole.position.copy(p);
    root.add(pole);
  }
  root.add(buildWires(poles, [8.3, 7.6]));
  // A maple leaning over the booth, bushes, grass up through the paving
  const tree = buildTree(301, treeKinds.maple, { scale: 1.2 });
  tree.position.set(-3.8, 0, -3.2);
  root.add(tree);
  const tree2 = buildTree(302, treeKinds.zelkova, { scale: 1.1 });
  tree2.position.set(6, 0, -5);
  root.add(tree2);
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
  const cityR = rng(55);
  root.add(buildCity(21, Array.from({ length: 22 }, () => ({ x: cityR.range(-90, 90), z: cityR.range(-90, -35), w: cityR.range(9, 14), d: cityR.range(9, 12), h: cityR.range(12, 38) }))));
  root.add(buildDust(quality === "low" ? 20 : 50, [6, 3, 5], [0, 1.6, 1.5]));
  const sky = buildSky({ top: "#7ea3c2", horizon: "#f2d6a6", sun: "#ffd9a0", sunDir: [-0.7, 0.3, 0.5] });
  root.add(sky);
  return { root, booth, sky, falling };
}

export default function Booth({ active, quality }: SceneProps) {
  const built = useMemo(() => buildBoothScene(quality), [quality]);
  const arrived = useWorld((s) => s.arrived);
  const phoneUp = useWorld((s) => s.phoneUp);
  const focus = useWorld((s) => s.focus);

  useFrame(({ camera, clock }, dt) => {
    if (!active) return;
    const t = clock.elapsedTime;
    built.sky.position.copy(camera.position);
    const { door, receiver, light, tubeMat } = built.booth;
    // The door opens once you're there
    door.rotation.y = THREE.MathUtils.damp(door.rotation.y, arrived ? -1.75 : 0, arrived ? 2.2 : 5, dt);
    // The receiver lifts off the hook toward you
    const up = phoneUp ? 1 : 0;
    receiver.position.x = THREE.MathUtils.damp(receiver.position.x, -0.17 + up * 0.12, 7, dt);
    receiver.position.y = THREE.MathUtils.damp(receiver.position.y, 0.02 + up * 0.2, 7, dt);
    receiver.position.z = THREE.MathUtils.damp(receiver.position.z, 0.06 + up * 0.32, 7, dt);
    receiver.rotation.z = THREE.MathUtils.damp(receiver.rotation.z, up * 1.25, 7, dt);
    receiver.rotation.x = THREE.MathUtils.damp(receiver.rotation.x, up * 0.35, 7, dt);
    // The light catches now and then; steady while the line is open
    const flick = !phoneUp && Math.sin(t * 0.45) > 0.97 ? 0.3 + 0.7 * Math.abs(Math.sin(t * 37)) : 1;
    light.intensity = 2.4 * flick;
    tubeMat.emissiveIntensity = 1.6 * flick;
    built.falling.update(Math.min(dt, 0.05), t);
  });

  return (
    <group visible={active}>
      <primitive object={built.root} />
      <SunLight active={active} position={[-26, 16, 18]} target={[0, 0, 0]} color="#ffd39a" intensity={2.6} size={14} quality={quality} />
      <hemisphereLight args={["#f2dcb4", "#5a6338", 1.15]} />
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
