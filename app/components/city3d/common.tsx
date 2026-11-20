"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { invisibleMaterial } from "./kit/materials";
import { DISTRICT_LIGHTS, type SceneId, type V3 } from "./scenes";
import { holdLive, world, type Quality } from "./store";

// The contract every place's scene keeps (the riverside, Riverside.tsx, and
// the five sections' scenes, districts/<id>.tsx), so the scenes can be
// built in parallel without touching City3D.tsx, sceneChunks.ts or each
// other:
//
// - A scene is the default export of districts/<id>.tsx (the riverside:
//   Riverside.tsx), a component taking SceneProps. City3D.tsx mounts it
//   inside a group at the place's offset; it builds in its own coordinates.
// - Its camera poses (home, enter, exit, fov, plateFrame, focus …) live only
//   in districts/<id>.def.ts (scenes.ts: SceneDef; no three.js there), so
//   the Director knows every pose without loading the scene. `focus` is
//   keyed by what the panel's picker writes to the store's `focus`; each
//   def lists its keys in its comment.
// - Points with something pinned over them go in `anchors` (anchors.ts),
//   named anchorKey(<scene id>, <name>), e.g. "towers:screen-0", set in an
//   effect and deleted in its cleanup. The prefix "sign:" is the
//   riverside's alone: its five signs, "sign:<section id>".
// - Anything a pointer can choose is a Hitbox (below), whose onSelect calls
//   navigate(…) or world.select(…); no scene has pointer code of its own.
// - Materials come only from the kit's factories (kit/surface.ts,
//   kit/windows.ts, kit/neon.ts; one cache, kit/materials.ts, keyed by
//   kit/uniforms.ts: materialKey), never `new THREE.*Material` in a scene.
//   Scenes dispose their own geometry and textures, never a shared material.
// - Lights: the world's two (WorldLights) are City3D's; a scene adds
//   exactly DISTRICT_LIGHTS[id] spot lights, through SceneLights, and none
//   other, so day and night (and every blend) compile the same shaders.
// - Anything that moves on its own is a Mover, run by useMovers: it is
//   parked in still view and while the place isn't showing, and the canvas
//   draws every frame only while one is running (useLive).

// What every place's scene component is given
export type SceneProps = {
  active: boolean; // the place showing
  quality: Quality;
  navigate: (href: string) => void;
  still: boolean; // still view: nothing moves (lib/still.ts)
};

// Something that moves on its own (a train, a boat, a light that blinks).
// update(t) is never called in still view; park() puts it at its resting
// state (a parked train, a light on and steady).
export type Mover = { object: THREE.Object3D; update(t: number): void; park(): void };

// The name of a scene's anchor ("<scene id>:<name>"); "sign:" is reserved
// for the riverside's five signs
export const anchorKey = (scene: Exclude<SceneId, "lujiazui">, name: string) => `${scene}:${name}`;

// While `on`, something in the city is moving, and the canvas draws every
// frame (unless still view is on); otherwise it draws only on change. A
// counter in the store, so any number of scenes and movers can hold it.
export function useLive(on: boolean): void {
  useEffect(() => (on ? holdLive() : undefined), [on]);
}

// Runs a scene's movers: each frame while the place is showing and still
// view is off (and holds the canvas live meanwhile); parked otherwise
export function useMovers(movers: readonly Mover[], { active, still }: { active: boolean; still: boolean }): void {
  const running = active && !still && movers.length > 0;
  useLive(running);
  useEffect(() => {
    if (!running) for (const m of movers) m.park();
  }, [running, movers]);
  useFrame(({ clock }) => {
    if (!running) return;
    const t = clock.elapsedTime;
    for (const m of movers) m.update(t);
  });
}

// A volume around something that can be chosen: pointing at it shows the
// pointer, a click (not a drag) chooses it. Pointer only: every Hitbox
// has an HTML control for the same choice (a link or a key), the
// keyboard's and screen reader's way. `enabled` (read at the moment of the
// event) turns it off without unmounting it.
export function Hitbox({
  id,
  position,
  rotation = 0,
  size,
  onSelect,
  enabled,
}: {
  id: string;
  position: readonly [number, number, number];
  rotation?: number;
  size: readonly [number, number, number];
  onSelect: () => void;
  enabled?: () => boolean;
}) {
  const material = useMemo(() => invisibleMaterial(), []);
  const on = () => !enabled || enabled();
  return (
    <mesh
      position={[position[0], position[1], position[2]]}
      rotation-y={rotation}
      userData={{ hitbox: id }}
      material={material}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 8 || !on()) return;
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        if (!on()) return;
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
    </mesh>
  );
}

// Tags for the lights the weather and the hour will drive (the atmosphere,
// a later task), as userData, one object so a render never hands three.js
// a new one
export const HEMI = { atmos: "hemi" } as const;
export const SUN = { atmos: "sun" } as const;
export const SPOT = { atmos: "spot" } as const;

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

// A scene's own lights: exactly DISTRICT_LIGHTS[id] spot lights, one at
// each of `spots` (the lamp heads, in the scene's coordinates), aimed
// straight down, at intensity 0 until the atmosphere raises them after
// dark (it finds them by userData.atmos === "spot"). `night` is a spot's
// intensity at full night (userData.night; the atmosphere's SPOT_NIGHT
// when left out). A wrong number of spots is an error, so the light count
// never changes.
export function SceneLights({
  id,
  spots,
  color = "#ffd7a1",
  distance = 18,
  angle = 0.7,
  night,
}: {
  id: SceneId;
  spots: readonly V3[];
  color?: string;
  distance?: number;
  angle?: number;
  night?: number;
}) {
  const count = DISTRICT_LIGHTS[id];
  if (spots.length !== count) throw new Error(`SceneLights: ${id} has ${count} spot lights, not ${spots.length}`);
  const lights = useMemo(
    () =>
      spots.map((p, i) => {
        const light = new THREE.SpotLight(color, 0, distance, angle, 0.6, 1.6);
        light.position.set(p[0], p[1], p[2]);
        // Aimed straight down: the target hangs under the light, as its child,
        // so it moves with the scene's group
        light.target.position.set(0, -p[1], 0);
        light.add(light.target);
        light.userData = night === undefined ? { ...SPOT, index: i } : { ...SPOT, index: i, night };
        return light;
      }),
    [spots, color, distance, angle, night],
  );
  useEffect(() => () => lights.forEach((l) => l.dispose()), [lights]);
  return (
    <>
      {lights.map((l, i) => (
        <primitive key={i} object={l} />
      ))}
    </>
  );
}
