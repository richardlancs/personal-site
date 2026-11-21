"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useDisposeOnUnmount } from "./common";
import { AERIAL, AERIAL_FRAME, AERIAL_PLACE, FLIGHT_ORIGIN, type MapUV } from "./flight.def";
import { onIdle } from "./idle";
import { cloudMaterial, veilMaterial, type CloudLayer } from "./kit/flight";
import { buildPlate, syncPlateUniforms } from "./kit/plate";
import { world } from "./store";
import type { Quality } from "./tiers";

// What draws a flight between places (flight.def.ts has the plan, the
// Director in City3D.tsx runs it): the aerial painting as a plate
// (kit/plate.ts) far from every place, thin cloud layers lying over it
// under the camera, and the veil, the clouds the camera passes through on
// its way out of a place and down into the next (kit/flight.ts). The
// Director writes `flightView` every frame; this reads it after (its frame
// callback is registered later), so nothing here is drawn at rest: the
// aerial's group and the veil are hidden unless a flight shows them.
//
// The aerial's pictures are fetched in idle time after the canvas starts
// (or at once when a flight begins first) and kept: one painting, small
// next to a place's. Its programs are compiled ahead, like the places'
// (City3D.tsx: Warm). The phones' tier draws one cloud layer, not two,
// and fewer octaves of noise in each.

export const flightView = {
  wanted: false, // a flight has begun: fetch the aerial now if it isn't here
  air: false, // the camera is over the aerial painting
  veil: 0, // the clouds over the view, 0 .. 1
  look: new THREE.Vector3(), // where the camera looks (the veil closes toward it)
  drift: new THREE.Vector2(), // the veil's clouds slide with the flight
};

let ready = false;
// Whether the aerial painting is here (the flight cruises in cloud till it is)
export const aerialReady = () => ready;

// A point over the aerial painting, `alt` (a share of its distance) above
// it, in the world
export function aerialPoint(at: MapUV, alt: number, out: THREE.Vector3): THREE.Vector3 {
  return out.set(
    FLIGHT_ORIGIN[0] + (at[0] - 0.5) * AERIAL_FRAME.width,
    FLIGHT_ORIGIN[1] + (0.5 - at[1]) * AERIAL_FRAME.height,
    FLIGHT_ORIGIN[2] + alt * AERIAL.distance,
  );
}

// The view kept inside the painting: wherever the lens (its shift, a
// portrait screen, the bank) would show past an edge, the camera slides
// in the painting's plane, just enough
const corners = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];
const ray = new THREE.Vector3();
const MARGIN = 0.012;
export function keepOverAerial(camera: THREE.PerspectiveCamera) {
  camera.updateMatrixWorld();
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const [x, y] of corners) {
    ray.set(x, y, 0.5).unproject(camera).sub(camera.position);
    if (ray.z >= -1e-6) return; // (looking away from the painting: nothing to keep)
    const k = (FLIGHT_ORIGIN[2] - camera.position.z) / ray.z;
    const u = (camera.position.x + ray.x * k - FLIGHT_ORIGIN[0]) / AERIAL_FRAME.width + 0.5;
    const v = 0.5 - (camera.position.y + ray.y * k - FLIGHT_ORIGIN[1]) / AERIAL_FRAME.height;
    u0 = Math.min(u0, u);
    u1 = Math.max(u1, u);
    v0 = Math.min(v0, v);
    v1 = Math.max(v1, v);
  }
  const fit = (a: number, b: number) => (b - a > 1 - 2 * MARGIN ? 0.5 - (a + b) / 2 : a < MARGIN ? MARGIN - a : b > 1 - MARGIN ? 1 - MARGIN - b : 0);
  const du = fit(u0, u1);
  const dv = fit(v0, v1);
  if (!du && !dv) return;
  camera.position.x += du * AERIAL_FRAME.width;
  camera.position.y -= dv * AERIAL_FRAME.height;
  camera.updateMatrixWorld();
}

// The cloud layers over the painting: `z` their height (a share of the
// distance; the flight comes out at 0.3 and cruises at 0.62), `near` where
// they fade as the camera comes within that many units. The lower one on
// every tier; the upper one, which the climb and the descent pass
// through, on the desktop tiers.
const LAYERS: (CloudLayer & { z: number })[] = [
  { z: 0.16, cover: 0.52, seed: [3.1, 7.7], scale: [7, 4], near: [3, 9] },
  { z: 0.44, cover: 0.55, seed: [11.3, 2.9], scale: [5, 3], near: [2, 8] },
];

export default function Flight({ tier }: { tier: Quality }) {
  const { gl, scene, camera, size } = useThree();
  const plate = useMemo(() => buildPlate(AERIAL_PLACE, tier), [tier]);
  useDisposeOnUnmount(plate);
  const parts = useMemo(() => {
    const group = new THREE.Group();
    group.name = "flight";
    group.position.set(...FLIGHT_ORIGIN);
    group.visible = false;
    const layers = LAYERS.slice(0, tier === "mobile" ? 1 : 2).map((l, i) => {
      const geometry = new THREE.PlaneGeometry(AERIAL_FRAME.width * 1.15, AERIAL_FRAME.height * 1.15);
      const mesh = new THREE.Mesh(geometry, cloudMaterial(tier, i, l));
      mesh.position.z = l.z * AERIAL.distance;
      mesh.renderOrder = 2 + i;
      group.add(mesh);
      return mesh;
    });
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), veilMaterial(tier));
    veil.name = "flight-veil";
    veil.frustumCulled = false;
    veil.renderOrder = 1000;
    veil.visible = false;
    return {
      group,
      layers,
      veil,
      dispose() {
        for (const m of layers) m.geometry.dispose();
        veil.geometry.dispose();
      },
    };
  }, [tier]);
  useDisposeOnUnmount(parts);
  // (added here, not in the memo: development runs a memo twice, and the
  // second would take the plate from the first's group)
  useEffect(() => {
    parts.group.add(plate.group);
    return () => void parts.group.remove(plate.group);
  }, [parts, plate]);

  // The pictures: in idle time, or as soon as a flight wants them
  const fetch = useRef<() => void>(() => {});
  useEffect(() => {
    let live = true;
    let started = false;
    const compile = () => {
      // Every program the flight draws, against the target the frame
      // draws into (City3D.tsx: Warm), hidden or not
      const target = tier === "mobile" ? null : new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
      const previous = gl.getRenderTarget();
      gl.setRenderTarget(target);
      const all = { traverse: (fn: (o: THREE.Object3D) => void) => (parts.group.traverse(fn), parts.veil.traverse(fn)), traverseVisible: () => {} } as unknown as THREE.Object3D;
      let pending: Promise<unknown> = Promise.resolve();
      try {
        pending = gl.compileAsync(all, camera, scene);
      } catch {
        // (compiled on first use instead)
      } finally {
        gl.setRenderTarget(previous);
      }
      pending.finally(() => target?.dispose());
    };
    fetch.current = () => {
      if (started) return;
      started = true;
      plate.load().then(
        () => {
          if (!live) return;
          for (const t of plate.textures()) gl.initTexture(t);
          ready = true;
          compile();
        },
        (error) => {
          started = false;
          console.error(error);
        },
      );
    };
    const cancel = onIdle(() => fetch.current(), 6000);
    return () => {
      live = false;
      ready = false;
      cancel();
      fetch.current = () => {};
    };
  }, [plate, parts, gl, camera, scene, tier]);

  const clock = useRef(0);
  const ndc = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const v = flightView;
    if (v.wanted && !ready) fetch.current();
    const showing = v.air || v.veil > 0.001;
    if (showing && !world.get().still) clock.current = (clock.current + Math.min(dt, 0.1)) % 3600;
    parts.group.visible = v.air;
    if (v.air) {
      // (the place it left may be code-built: nothing else sets these then)
      syncPlateUniforms(world.get().hour);
      for (const m of parts.layers) {
        const u = (m.material as THREE.ShaderMaterial).uniforms;
        u.uOpacity.value = 1;
        u.uTime.value = clock.current;
      }
    }
    parts.veil.visible = v.veil > 0.001;
    if (parts.veil.visible) {
      const u = (parts.veil.material as THREE.ShaderMaterial).uniforms;
      u.uVeil.value = v.veil;
      u.uAspect.value = size.width / Math.max(1, size.height);
      u.uTime.value = clock.current;
      u.uDrift.value.copy(v.drift);
      ndc.copy(v.look).project(camera);
      u.uCenter.value.set(THREE.MathUtils.clamp((ndc.x + 1) / 2, 0, 1), THREE.MathUtils.clamp((ndc.y + 1) / 2, 0, 1));
    }
  });

  return (
    <>
      <primitive object={parts.group} />
      <primitive object={parts.veil} />
    </>
  );
}
