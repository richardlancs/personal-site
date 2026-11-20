"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { world, type Quality } from "./store";

// What every place's scene component is given
export type SceneProps = {
  active: boolean; // the place showing
  quality: Quality;
  navigate: (href: string) => void;
};

// A volume around something that can be chosen: pointing at it shows the
// pointer, a click (not a drag) chooses it. Pointer only: every Hitbox
// has an HTML link beside it (the tags), the keyboard's and screen
// reader's way to the same place.
export function Hitbox({
  id,
  position,
  rotation = 0,
  size,
  onSelect,
}: {
  id: string;
  position: readonly [number, number, number];
  rotation?: number;
  size: readonly [number, number, number];
  onSelect: () => void;
}) {
  return (
    <mesh
      position={[position[0], position[1], position[2]]}
      rotation-y={rotation}
      userData={{ hitbox: id }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 8) return;
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        world.set({ hover: id });
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        if (world.get().hover === id) world.set({ hover: null });
        document.body.style.cursor = "";
      }}
    >
      <boxGeometry args={[size[0], size[1], size[2]]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}

// Tags for the lights the weather and the hour will drive (the atmosphere,
// a later task), as userData, one object so a render never hands three.js
// a new one
export const HEMI = { atmos: "hemi" } as const;
export const SUN = { atmos: "sun" } as const;

// The world's two lights, the same in every place and at every hour, so
// no journey and no blend compiles a shader: a sky light and a sun with no
// shadows (the grey stand-ins need none)
export function WorldLights() {
  return (
    <>
      <hemisphereLight args={["#c9d3e2", "#2a2d33", 2.2]} userData={HEMI} />
      <directionalLight position={[-40, 80, 30]} intensity={2.2} userData={SUN} />
    </>
  );
}
