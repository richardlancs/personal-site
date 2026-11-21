"use client";

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { clearPools, clearShade, setPools, setShade, type DayShade, type GlowPool } from "./kit/glow";
import { invisibleMaterial } from "./kit/materials";
import { scenes, type SceneId } from "./scenes";
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
// - Materials come only from the kit's factories (kit/plate.ts,
//   kit/neon.ts, kit/signs.ts, kit/flight.ts; one cache, kit/materials.ts, keyed by
//   kit/uniforms.ts: materialKey), never `new THREE.*Material` in a scene.
//   Scenes dispose their own geometry and textures, never a shared material.
// - Lights: the world's two (WorldLights) are City3D's, and a place adds
//   none (scenes.ts: DISTRICT_LIGHTS, all 0: a painted place is unlit), so
//   day and night (and every blend) compile the same shaders.
// - Anything that moves on its own is a Mover, run by useMovers: it is
//   parked in still view and while the place isn't showing, and the canvas
//   draws every frame only while one is running (useLive).
// - What a scene builds (useMemo) it lets go with useDisposeOnUnmount, so
//   development's double effect never disposes a scene still on screen;
//   a kit dispose() frees GPU resources only and never takes a mesh out
//   of its parent.
// - Light after dark on the walls and paving round its lamps and signs:
//   useGlowPools; the shade its day plate paints: useDayShade (kit/glow.ts).

// What every place's scene component is given
export type SceneProps = {
  active: boolean; // the place showing
  quality: Quality;
  navigate: (href: string) => void;
  still: boolean; // still view: nothing moves (lib/still.ts)
};

// Something that moves on its own (a train, a boat, a light that blinks).
// update(t) is never called in still view; park() puts it at its resting
// state (a parked train, a light on and steady). `resting(t)`, if it has
// one, says it isn't moving at time t (a train at its stop): the canvas
// needn't draw for it then.
export type Mover = { object: THREE.Object3D; update(t: number): void; park(): void; resting?(t: number): boolean };

// The name of a scene's anchor ("<scene id>:<name>"); "sign:" is reserved
// for the riverside's five signs
export const anchorKey = (scene: Exclude<SceneId, "lujiazui">, name: string) => `${scene}:${name}`;

// While `on`, something in the city is moving, and the canvas draws every
// frame (unless still view is on); otherwise it draws only on change. A
// counter in the store, so any number of scenes and movers can hold it.
export function useLive(on: boolean): void {
  useEffect(() => (on ? holdLive() : undefined), [on]);
}

// Runs a scene's movers: each frame while the place is showing, still
// view is off and at least one of them is in view and not resting
// (holding the canvas live meanwhile); parked otherwise. When none is in
// view (or every one in view is resting) the canvas stops drawing: they are moved on, unseen, twice a second (no frame drawn), and
// the loop starts again the moment one comes into view. Their clock is
// the page's (performance.now), so a mover is where it would have been.
const box = new THREE.Box3();
const frustum = new THREE.Frustum();
const viewProjection = new THREE.Matrix4();
const seconds = () => performance.now() / 1000;
// Whether one of them is in view and moving (not resting) at time t
function anyInView(movers: readonly Mover[], camera: THREE.Camera, t: number) {
  camera.updateMatrixWorld();
  frustum.setFromProjectionMatrix(viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  return movers.some((m) => {
    if (m.resting?.(t)) return false;
    m.object.updateWorldMatrix(true, true);
    return frustum.intersectsBox(box.setFromObject(m.object));
  });
}
export function useMovers(movers: readonly Mover[], { active, still }: { active: boolean; still: boolean }): void {
  const wanted = active && !still && movers.length > 0;
  const [seen, setSeen] = useState(true);
  const camera = useThree((s) => s.camera);
  useLive(wanted && seen);
  useEffect(() => {
    if (!wanted) for (const m of movers) m.park();
  }, [wanted, movers]);
  // Out of view: move them on without drawing, and watch for one coming in
  useEffect(() => {
    if (!wanted || seen) return;
    const id = window.setInterval(() => {
      const t = seconds();
      for (const m of movers) m.update(t);
      if (anyInView(movers, camera, t)) setSeen(true);
    }, 500);
    return () => window.clearInterval(id);
  }, [wanted, seen, movers, camera]);
  const frames = useRef(0);
  useFrame(({ camera: cam }) => {
    if (!wanted) return;
    const t = seconds();
    for (const m of movers) m.update(t);
    // (every fifteenth frame, and on any frame drawn while they're out of view)
    if (!seen || ++frames.current % 15 === 0) {
      const inView = anyInView(movers, cam, t);
      if (inView !== seen) setSeen(inView);
    }
  });
}

// Where a Hitbox was hit: `uv` on the face that was hit (three's box
// faces: 0..1 across, 0 at the bottom), and `point` in the box's own
// frame, each axis -0.5..0.5 of its size (x across, y up, z toward the
// front), so a scene can aim a click on a screen
export type Hit = { uv: THREE.Vector2 | null; point: THREE.Vector3 };

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
  onSelect: (hit: Hit) => void;
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
        const local = e.object.worldToLocal(e.point.clone());
        onSelect({ uv: e.uv ? e.uv.clone() : null, point: local.set(local.x / size[0], local.y / size[1], local.z / size[2]) });
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

// Lets go of what a scene built (its geometry, textures, render targets)
// when the scene really goes: development runs every effect twice
// (StrictMode reaches the canvas), and a cleanup that disposed at once
// would leave the memoised scene drawing from freed resources and, where a
// dispose took meshes out, without them. The cleanup only schedules the
// dispose; the second run of the effect takes it back.
const pendingDispose = new WeakMap<object, number>();
export function useDisposeOnUnmount(owner: { dispose(): void }): void {
  useEffect(() => {
    const waiting = pendingDispose.get(owner);
    if (waiting !== undefined) {
      window.clearTimeout(waiting);
      pendingDispose.delete(owner);
    }
    return () => {
      pendingDispose.set(
        owner,
        window.setTimeout(() => {
          pendingDispose.delete(owner);
          owner.dispose();
        }, 0),
      );
    };
  }, [owner]);
}

// The light pools round a place's lamps, lanterns and signs (kit/glow.ts:
// GlowPool, in the place's coordinates), on the lit surfaces while the
// place is showing; the atmosphere brings them up after dark. At most
// POOLS (kit/uniforms.ts); past that the strongest are kept.
export function useGlowPools(id: SceneId, pools: readonly GlowPool[], active: boolean): void {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!active) return;
    const owner = {};
    setPools(owner, pools, scenes[id].offset);
    invalidate();
    return () => clearPools(owner);
  }, [id, pools, active, invalidate]);
}

// The shade a place's day plate paints (kit/glow.ts: DayShade), while the
// place is showing; the atmosphere lays it on with the sun
export function useDayShade(id: SceneId, shade: DayShade | null, active: boolean): void {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!active || !shade) return;
    const owner = {};
    setShade(owner, shade, scenes[id].offset);
    invalidate();
    return () => clearShade(owner);
  }, [id, shade, active, invalidate]);
}
