"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { createContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { anchors } from "./anchors";
import { anchorKey, Hitbox, useDisposeOnUnmount, useLive, useMovers, type Hit, type SceneProps } from "./common";
import { buildMovers, buildPlate, onWantPlate, spotBox, spotPoint, syncPlateUniforms, plateUniforms, wantedPlate, type Plate } from "./kit/plate";
import { scenes, type PlaceDef, type SceneDef, type SceneId } from "./scenes";
import { world } from "./store";
import type { Quality } from "./tiers";

// A painted place (scenes.ts: PlaceDef; the engine: kit/plate.ts), the
// component every place's districts/<id>.tsx wraps:
//
//   export default function Bund(props: SceneProps) {
//     return <PlatePlace {...props} id="bund" def={bund} onSpot={(key) => world.set({ focus: key })} />;
//   }
//
// It builds the plate, fetches its pictures while the place is showing or
// being travelled to (and lets them go a while after it's left), keeps
// the plate filling the view, runs its living light and movers (parked in
// still view), lays a Hitbox on each spot (onSpot(key, hit)), and pins an
// anchor on each (anchorKey(id, key), and with ":top", ":foot", ":left"
// and ":right" at its edges, in world coordinates, kept up to date; Home's
// signs, "sign:<section>", are the riverside's, Task 4's to name). Anything
// a place adds of its own (a screen on a spot: kit/plate.ts spotGeometry)
// goes in as children, inside the plate's group, with the plate in
// PlateContext.

export const PlateContext = createContext<{ plate: Plate; def: PlaceDef } | null>(null);

// How long a place keeps its pictures after it stops showing (and isn't
// being travelled to): a journey back within this is instant; the phone
// tier keeps only the showing place's
const KEEP_MS: Record<Quality, number> = { high: 20_000, low: 12_000, mobile: 0 };

// Whether the plate moves on its own (water, sky, glass, wet paving), so
// the canvas must draw every frame while it shows
const living = (def: PlaceDef) => def.plate.regions.length > 0;

// The plate's clock: runs while a place shows and still view is off, held
// otherwise (so a ripple never jumps)
let clock = 0;

export type PlatePlaceProps = SceneProps & {
  id: SceneId;
  def: PlaceDef;
  onSpot?: (key: string, hit: Hit) => void;
  spotEnabled?: () => boolean;
  children?: ReactNode;
};

export default function PlatePlace({ id, def, active, quality, still, onSpot, spotEnabled, children }: PlatePlaceProps) {
  const plate = useMemo(() => buildPlate(def, quality), [def, quality]);
  useDisposeOnUnmount(plate);
  const movers = useMemo(() => buildMovers(def, quality), [def, quality]);
  const moverList = useMemo(() => (movers ? [movers] : []), [movers]);
  useEffect(() => {
    if (!movers) return;
    plate.group.add(movers.object);
    return () => void plate.group.remove(movers.object);
  }, [plate, movers]);
  useDisposeOnUnmount(useMemo(() => ({ dispose: () => movers?.dispose() }), [movers]));
  useMovers(moverList, { active, still });
  useLive(active && !still && living(def));
  const { gl, invalidate } = useThree();

  // The pictures: wanted while the place shows or is being travelled to
  const [wantedHere, setWantedHere] = useState(() => wantedPlate() === id);
  useEffect(() => onWantPlate(() => setWantedHere(wantedPlate() === id)), [id]);
  const want = active || wantedHere;
  useEffect(() => {
    if (!want) {
      const t = window.setTimeout(() => plate.release(), KEEP_MS[quality]);
      return () => window.clearTimeout(t);
    }
    let live = true;
    plate.load().then(
      () => {
        if (!live) return;
        // Uploaded now, not in the frame that first shows them
        for (const t of plate.textures()) gl.initTexture(t);
        invalidate();
      },
      (error) => console.error(error),
    );
    return () => {
      live = false;
    };
  }, [want, plate, quality, gl, invalidate]);

  // The spots' anchors, in world coordinates
  const spotAnchors = useMemo(
    () =>
      Object.entries(def.plate.spots).map(([key, quad]) => {
        const local = quad.map((c) => new THREE.Vector3(...spotPoint(def, plate.frame, c)));
        const xs = local.map((p) => p.x), ys = local.map((p) => p.y), z = local.reduce((a, p) => a + p.z, 0) / 4;
        const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
        const at = {
          "": new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, z),
          ":top": new THREE.Vector3((x0 + x1) / 2, y1, z),
          ":foot": new THREE.Vector3((x0 + x1) / 2, y0, z),
          ":left": new THREE.Vector3(x0, (y0 + y1) / 2, z),
          ":right": new THREE.Vector3(x1, (y0 + y1) / 2, z),
        };
        return { key, at, world: Object.fromEntries(Object.keys(at).map((k) => [k, new THREE.Vector3()])) as Record<keyof typeof at, THREE.Vector3> };
      }),
    [def, plate],
  );
  useEffect(() => {
    const scene = id as Exclude<SceneId, "lujiazui">;
    for (const s of spotAnchors) for (const [k, v] of Object.entries(s.world)) anchors.set(anchorKey(scene, `${s.key}${k}`), v);
    return () => {
      for (const s of spotAnchors) for (const k of Object.keys(s.world)) anchors.delete(anchorKey(scene, `${s.key}${k}`));
    };
  }, [spotAnchors, id]);

  const last = useRef(0);
  useFrame(({ camera }) => {
    if (!active) return;
    const now = performance.now() / 1000;
    if (!still && last.current) clock += Math.min(0.1, now - last.current);
    last.current = now;
    plateUniforms.uTime.value = clock % 3600;
    syncPlateUniforms(world.get().hour);
    plate.cover(camera);
    plate.group.updateMatrixWorld();
    for (const s of spotAnchors) for (const [k, v] of Object.entries(s.at)) s.world[k as keyof typeof s.at].copy(v).applyMatrix4(plate.group.matrixWorld);
  });

  const boxes = useMemo(() => Object.entries(def.plate.spots).map(([key, quad]) => ({ key, ...spotBox(def, plate.frame, quad) })), [def, plate]);
  const context = useMemo(() => ({ plate, def }), [plate, def]);

  return (
    <primitive object={plate.group}>
      {onSpot &&
        boxes.map((b) => (
          <Hitbox key={b.key} id={`${id}:${b.key}`} position={b.center} size={b.size} onSelect={(hit) => onSpot(b.key, hit)} enabled={spotEnabled} />
        ))}
      <PlateContext.Provider value={context}>{children}</PlateContext.Provider>
    </primitive>
  );
}

// ---------- The proof (development, or any build opened with ?perf) ----------
//
// ?plate=rooftop (or ?plate=<any painting>) shows Home as that painting
// on the plate, with stand-in data, before the places' own data exists
// (City3D.tsx swaps it in for the riverside). The rooftop's numbers are
// read off the painting (app/assets/city/rooftop-day.webp, 1672 × 941).
const PROOF: Record<string, PlaceDef["plate"]> = {
  rooftop: {
    painting: "rooftop",
    aspect: 1672 / 941,
    depth: {
      kind: "layers",
      ground: { horizon: 0.4, near: 0.42 },
      standing: 0.05,
      layers: [
        // the roof's parapet and its vents, bottom left
        { mask: [[0, 0.58], [0.06, 0.6], [0.16, 0.66], [0.3, 0.8], [0.42, 0.93], [0.47, 1], [0, 1]], z: 0.55 },
      ],
    },
    regions: [
      { kind: "sky", poly: [[0, 0], [1, 0], [1, 0.19], [0.6, 0.2], [0.3, 0.24], [0, 0.26]] },
      { kind: "water", poly: [[0.16, 0.4], [0.21, 0.33], [0.3, 0.3], [0.36, 0.4], [0.6, 0.44], [0.98, 0.41], [1, 0.47], [1, 0.55], [0.75, 0.56], [0.5, 0.55], [0.35, 0.52], [0.22, 0.47]] },
      { kind: "glass", poly: [[0.55, 0], [0.85, 0], [0.85, 0.36], [0.55, 0.36]] },
      { kind: "wet", poly: [[0.68, 0.62], [0.85, 0.62], [1, 1], [0.6, 1]] },
    ],
    spots: {},
    drift: { amplitude: 0.003, period: 40 },
    movers: [
      { kind: "trail", path: [[0.73, 0.64], [0.8, 0.78], [0.9, 1]], period: 22, count: 8, color: "#ffd9a0", size: 0.005, depth: 0.2 },
      { kind: "trail", path: [[0.88, 1], [0.78, 0.78], [0.72, 0.64]], period: 26, count: 7, color: "#ff8f8f", size: 0.004, depth: 0.2 },
      { kind: "boat", path: [[0.18, 0.47], [0.5, 0.5], [0.98, 0.49]], period: 140, count: 3, color: "#ffe7b8", size: 0.004, depth: 0.08 },
      { kind: "beacon", path: [[0.78, 0.02], [0.56, 0.035]], period: 3.2, color: "#ff6a6a", size: 0.005 },
    ],
  },
};
const genericProof = (painting: string): PlaceDef["plate"] => ({
  painting,
  aspect: painting === "aerial" ? 16 / 9 : 2400 / 1032,
  depth: { kind: "layers", ground: { horizon: 0.69, near: 0.4 }, layers: [] },
  regions: [],
  spots: {},
  drift: { amplitude: 0.003, period: 40 },
});

export function proofPlace(painting: string, base: SceneDef = scenes.lujiazui): PlaceDef {
  // (the painting framed by the place's own home view and lens)
  return { ...base, plateFrame: { ...base.plateFrame, fov: base.fov }, plate: PROOF[painting] ?? genericProof(painting) };
}

export const proofWanted = () => {
  if (typeof location === "undefined") return null;
  const q = new URLSearchParams(location.search);
  if (process.env.NODE_ENV !== "development" && !q.has("perf")) return null;
  const p = q.get("plate");
  return p && /^[a-z0-9-]+$/.test(p) ? p : null;
};

export function ProofPlace(props: SceneProps & { painting: string }) {
  const def = useMemo(() => proofPlace(props.painting), [props.painting]);
  return <PlatePlace {...props} id="lujiazui" def={def} />;
}
