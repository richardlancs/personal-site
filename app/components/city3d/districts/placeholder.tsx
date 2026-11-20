"use client";

import { useMemo, type ComponentType } from "react";
import * as THREE from "three";
import type { SceneProps } from "../common";
import { neonMaterial } from "../kit/neon";
import { surface } from "../kit/surface";
import { scenes, type SceneId } from "../scenes";

// One grey stand-in for every section's place until its own scene is
// built: a ground, three boxes, and a low strip in the place's threshold
// colour, so a journey can be seen to arrive somewhere. Each place gets
// its own component (standIn(id)), the same build with that place's
// colour; each districts/<id>.tsx is one of these until its scene is built.
// Its materials come from the kit's factories (shared, disposed centrally).

const GREYS = ["#5a606a", "#6f7680", "#4a4f58"] as const;

// Three boxes, placed so the camera's home view (districts/*.def.ts) looks
// between them: [x, z, w, d, h]
const BOXES: [number, number, number, number, number][] = [
  [-4.5, -3, 3, 3, 6],
  [2.5, -6, 4, 3, 9],
  [5, 1, 2, 2, 3.5],
];

const made = new Map<SceneId, ComponentType<SceneProps>>();

export function standIn(id: Exclude<SceneId, "lujiazui">): ComponentType<SceneProps> {
  const existing = made.get(id);
  if (existing) return existing;
  const threshold = scenes[id].threshold;
  function StandIn() {
    const parts = useMemo(() => {
      const ground = surface({ color: "#2c3038" });
      const greys = GREYS.map((color) => surface({ color }));
      const strip = neonMaterial(`#${new THREE.Color(threshold).multiplyScalar(2.2).getHexString()}`);
      return { ground, greys, strip };
    }, []);
    return (
      <group>
        <mesh material={parts.ground} rotation-x={-Math.PI / 2} name={`ground:${id}`}>
          <planeGeometry args={[40, 40]} />
        </mesh>
        {BOXES.map(([x, z, w, d, h], i) => (
          <mesh key={i} material={parts.greys[i]} position={[x, h / 2, z]}>
            <boxGeometry args={[w, h, d]} />
          </mesh>
        ))}
        <mesh material={parts.strip} position={[0, 0.02, -2]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[14, 0.6]} />
        </mesh>
      </group>
    );
  }
  made.set(id, StandIn);
  return StandIn;
}

