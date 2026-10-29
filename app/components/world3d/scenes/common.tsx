"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { at, box, merge } from "../geometry";
import { mesh, paint } from "../paint";
import { M } from "../props";
import { world } from "../store";

export type SceneProps = {
  active: boolean;
  quality: "high" | "low";
  navigate: (href: string) => void;
};

// An invisible volume around something you can choose. Pointing at it
// lights the thing up and shows its name; a click (not a drag) chooses it.
export function Hitbox({
  id,
  position,
  rotation = 0,
  size,
  onSelect,
}: {
  id: string;
  position: [number, number, number];
  rotation?: number;
  size: readonly [number, number, number];
  onSelect: () => void;
}) {
  return (
    <mesh
      position={position}
      rotation-y={rotation}
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

// The low sun, with soft shadows around where the camera looks
export function SunLight({
  active,
  position,
  target,
  color,
  intensity,
  size,
  quality,
}: {
  active: boolean;
  position: [number, number, number];
  target: [number, number, number];
  color: string;
  intensity: number;
  size: number;
  quality: "high" | "low";
}) {
  const light = useMemo(() => {
    const l = new THREE.DirectionalLight(color, intensity);
    l.position.set(...position);
    l.target.position.set(...target);
    l.castShadow = true;
    const res = quality === "low" ? 1024 : 2048;
    l.shadow.mapSize.set(res, res);
    const c = l.shadow.camera;
    c.left = -size;
    c.right = size;
    c.top = size;
    c.bottom = -size;
    c.near = 1;
    c.far = 160;
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.04;
    l.shadow.radius = 4;
    return l;
  }, [color, intensity, position, target, size, quality]);
  light.castShadow = active;
  return (
    <>
      <primitive object={light} />
      <primitive object={light.target} />
    </>
  );
}

type Opening = { x: number; y: number; w: number; h: number };
type WallSpec = { openings?: Opening[] };

// A room: floor, ceiling, four walls with real openings for windows and
// doors, window frames, and glass. Walls face inward.
export function buildRoom({
  w,
  d,
  h,
  floor,
  wall,
  ceiling,
  walls,
}: {
  w: number;
  d: number;
  h: number;
  floor: THREE.MeshLambertMaterial;
  wall: THREE.MeshLambertMaterial;
  ceiling?: THREE.MeshLambertMaterial;
  walls: { back?: WallSpec; front?: WallSpec; left?: WallSpec; right?: WallSpec };
}) {
  const g = new THREE.Group();
  const floorGeo = box(w, 0.2, d, 0.45).translate(0, -0.1, 0);
  g.add(mesh(floorGeo, floor, { cast: false }));
  g.add(mesh(box(w, 0.2, d, 0.4).translate(0, h + 0.1, 0), ceiling ?? wall, { cast: true }));

  const frames: THREE.BufferGeometry[] = [];
  const panes: THREE.BufferGeometry[] = [];
  const makeWall = (length: number, spec: WallSpec | undefined) => {
    const shape = new THREE.Shape();
    shape.moveTo(-length / 2, 0);
    shape.lineTo(length / 2, 0);
    shape.lineTo(length / 2, h);
    shape.lineTo(-length / 2, h);
    shape.closePath();
    for (const o of spec?.openings ?? []) {
      const hole = new THREE.Path();
      hole.moveTo(o.x - o.w / 2, o.y - o.h / 2);
      hole.lineTo(o.x + o.w / 2, o.y - o.h / 2);
      hole.lineTo(o.x + o.w / 2, o.y + o.h / 2);
      hole.lineTo(o.x - o.w / 2, o.y + o.h / 2);
      hole.closePath();
      shape.holes.push(hole);
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: false });
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.4, uv.getY(i) * 0.4);
    return geo;
  };
  const sides: [keyof typeof walls, number, number, number, number][] = [
    ["back", w, 0, -d / 2 - 0.22, 0],
    ["front", w, 0, d / 2, Math.PI],
    ["left", d, -w / 2 - 0.22, 0, Math.PI / 2],
    ["right", d, w / 2, 0, -Math.PI / 2],
  ];
  for (const [side, length, x, z, ry] of sides) {
    const spec = walls[side];
    const geo = makeWall(length, spec);
    // Front and back walls extrude toward +z; turn them to face in
    if (side === "front") geo.translate(0, 0, -0.22);
    if (side === "right") geo.translate(0, 0, -0.22);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1));
    geo.applyMatrix4(m);
    g.add(mesh(geo, wall));
    for (const o of spec?.openings ?? []) {
      if (o.y - o.h / 2 < 0.05) continue; // a doorway, no frame or glass
      const local = [
        at(box(o.w + 0.1, 0.08, 0.26), o.x, o.y - o.h / 2, 0.11),
        at(box(o.w + 0.1, 0.08, 0.26), o.x, o.y + o.h / 2, 0.11),
        at(box(0.08, o.h, 0.26), o.x - o.w / 2, o.y, 0.11),
        at(box(0.08, o.h, 0.26), o.x + o.w / 2, o.y, 0.11),
        at(box(0.05, o.h, 0.06), o.x, o.y, 0.11),
        at(box(o.w, 0.05, 0.06), o.x, o.y, 0.11),
      ];
      const pane = at(new THREE.PlaneGeometry(o.w, o.h), o.x, o.y, 0.11);
      const shift = side === "front" || side === "right" ? -0.22 : 0;
      for (const part of local) frames.push(part.translate(0, 0, shift).applyMatrix4(m));
      // Some panes are long gone
      if ((o.x * 7 + o.y * 3) % 2 > 0.6) panes.push(pane.translate(0, 0, shift).applyMatrix4(m));
    }
  }
  if (frames.length) g.add(mesh(merge(frames), M.darkWood()));
  if (panes.length) g.add(mesh(merge(panes), M.glass(), { cast: false, receive: false }));
  return g;
}

// A plain surface material, shared
export const surfaces = {
  floorDark: () => paint({ color: "#6a5440", brush: 0.35, brushScale: 1.2, grime: 0.6 }),
};
