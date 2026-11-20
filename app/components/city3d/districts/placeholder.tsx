"use client";

import { useMemo, type ComponentType } from "react";
import * as THREE from "three";
import type { SceneProps } from "../common";
import { scenes, type SceneId } from "../scenes";

// One grey stand-in for every section's place until its own scene is
// built: a ground, three boxes, and a low strip in the place's threshold
// colour, so a journey can be seen to arrive somewhere. Each place gets
// its own component (standIn(id)), the same build with that place's
// colour; the five loaders in sceneChunks.ts all come here for now.

const GREYS = ["#4a4f58", "#5d636d", "#383c44"] as const;

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
      const ground = new THREE.MeshLambertMaterial({ color: "#23262c" });
      const greys = GREYS.map((color) => new THREE.MeshLambertMaterial({ color }));
      const strip = new THREE.MeshBasicMaterial({ color: new THREE.Color(threshold).multiplyScalar(2.2) });
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

export default standIn;
