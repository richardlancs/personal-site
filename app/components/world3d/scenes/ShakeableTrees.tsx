"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildLeafBursts } from "../props";
import { rng } from "../rng";
import { world } from "../store";

// A tree that can be shaken: its group (turning around its base), its
// crown, and the colour of the leaves that come off it
export type ShakeTree = { group: THREE.Group; crown: THREE.Vector3; radius: number; height: number; tint: THREE.ColorRepresentation };

const SHAKE_S = 1.1;
const chance = rng(1234);

// Clicking a tree gives it a brief shake, a quick wobble that settles, and
// a few leaves come loose and flutter down. What's nearest under the
// pointer wins, as you'd expect: the hit areas follow the crown and trunk
// closely, so a building seen past a trunk or between crowns can still be
// chosen, and leaves in front of it shake.
export default function ShakeableTrees({ trees, active }: { trees: ShakeTree[]; active: boolean }) {
  const bursts = useMemo(() => buildLeafBursts(160), []);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __leafBursts?: unknown[] };
    (w.__leafBursts ??= []).push(bursts);
  }, [bursts]);
  const shakes = useRef(new Map<number, { t: number; axis: THREE.Vector3 }>());
  // Each tree's own turn, so the shake adds to it rather than replacing it
  const bases = useMemo(() => trees.map((tree) => tree.group.quaternion.clone()), [trees]);
  const tmp = useMemo(() => new THREE.Quaternion(), []);

  useFrame(({ clock, camera }, rawDt) => {
    if (!active) return;
    const dt = Math.min(rawDt, 0.05);
    bursts.face(camera);
    bursts.update(dt, clock.elapsedTime);
    for (const [i, shake] of shakes.current) {
      shake.t += dt;
      const tree = trees[i];
      const k = shake.t / SHAKE_S;
      if (k >= 1) {
        tree.group.quaternion.copy(bases[i]);
        shakes.current.delete(i);
        continue;
      }
      // A quick wobble that dies away
      const angle = 0.075 * Math.exp(-k * 4) * Math.sin(shake.t * 22);
      tmp.setFromAxisAngle(shake.axis, angle);
      tree.group.quaternion.copy(bases[i]).premultiply(tmp);
    }
  });

  function shake(i: number, e: ThreeEvent<MouseEvent>) {
    if (e.delta > 8) return;
    e.stopPropagation();
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tree = trees[i];
    if (!reduce) {
      const a = chance() * Math.PI * 2;
      shakes.current.set(i, { t: 0, axis: new THREE.Vector3(Math.cos(a), 0, Math.sin(a)) });
    }
    bursts.burst(tree.crown, tree.radius, reduce ? 6 : 16 + Math.floor(chance() * 8), tree.tint);
  }

  return (
    <>
      <primitive object={bursts.group} />
      {active &&
        trees.map((tree, i) => {
          const handlers = {
            onClick: (e: ThreeEvent<MouseEvent>) => shake(i, e),
            onPointerOver: (e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              document.body.style.cursor = "pointer";
            },
            onPointerOut: () => {
              if (!world.get().hover) document.body.style.cursor = "";
            },
          };
          const crownBottom = tree.crown.y - tree.radius * 0.8;
          return (
            <group key={i}>
              {/* The crown: a soft ball the size of the leaves */}
              <mesh position={tree.crown} scale={[1, 0.85, 1]} userData={{ hitbox: true, tree: true }} {...handlers}>
                <sphereGeometry args={[tree.radius, 10, 8]} />
                <meshBasicMaterial visible={false} />
              </mesh>
              {/* The trunk */}
              <mesh position={[tree.crown.x, crownBottom / 2, tree.crown.z]} userData={{ hitbox: true, tree: true }} {...handlers}>
                <boxGeometry args={[0.7, crownBottom, 0.7]} />
                <meshBasicMaterial visible={false} />
              </mesh>
            </group>
          );
        })}
    </>
  );
}
