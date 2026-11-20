"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useLive } from "../common";
import { rng } from "../rng";
import type { Quality } from "../tiers";
import { useWorld, world } from "../store";
import { precip } from "./state";

// Rain and snow (how much, and their colour: Atmosphere.tsx, `precip`).
//
// One instanced quad per drop or flake, in a box that travels with the
// camera; the GPU moves them (this file's own clock, uTime) and wraps them
// round the box, so a frame costs the CPU nothing but a few uniforms.
// Rain is thin strokes along the way it falls, snow soft dots that drift.
// They are drawn in the scene itself, after everything opaque, tested
// against its depth (a drop behind a tower is hidden by it) and never
// writing depth; they thin out near the edges of the box and right in
// front of the lens. The panels are HTML over the canvas, so nothing here
// needs to keep clear of words.
//
// One world unit is ten metres: a drop is half a metre long and falls at
// 7.5 m/s, in a box 30 m across round the lens.
//
// In still view the clock stops, so they hold where they are, at half the
// density: rain as still strokes, like rain in a woodblock print, so the
// weather still reads with nothing moving. While they fall (and still view
// is off) the canvas draws every frame (useLive).
//
// Per tier: high and low draw the full field (1,100 drops, 800 flakes; one
// draw call each, 2 triangles a drop); mobile draws 600 and 460, larger and
// nearer, since its band is small and its pixel ratio capped. Built when
// first needed; disposed LINGER seconds after it stops, and when the
// canvas goes.

type Kind = "rain" | "snow";
const UNIT = 0.1; // world units per metre
const COUNT: Record<Kind, { full: number; mobile: number }> = {
  rain: { full: 1100, mobile: 600 },
  snow: { full: 800, mobile: 460 },
};
// In metres (scaled by UNIT when built)
type Look = { box: [number, number, number]; fall: number; drift: [number, number]; sway: number; size: [number, number]; alpha: number; round: number };
const LOOK: Record<Kind, Look> = {
  rain: { box: [30, 13, 30], fall: 7.5, drift: [1.2, -0.5], sway: 0, size: [0.03, 0.5], alpha: 0.32, round: 0 },
  snow: { box: [26, 11, 26], fall: 0.75, drift: [0.25, -0.1], sway: 0.35, size: [0.075, 0.075], alpha: 0.85, round: 1 },
};
// On the mobile tier the city is a band above the page's sheet, at a
// capped pixel ratio: the same drops would be a pixel or two and read as
// nothing. Fewer of them, in a smaller box nearer the lens, larger.
const MOBILE: Record<Kind, Pick<Look, "box" | "size" | "alpha">> = {
  rain: { box: [18, 10, 18], size: [0.07, 1.2], alpha: 0.7 },
  snow: { box: [16, 9, 16], size: [0.15, 0.15], alpha: 1 },
};
const LINGER = 20; // seconds after it stops before it's taken down
const NEAR: [number, number] = [1.6 * UNIT, 3.6 * UNIT]; // fades in over this distance from the lens

const vertexShader = /* glsl */ `
  attribute vec4 aSeed;
  uniform float uTime;
  uniform vec3 uBox;
  uniform vec3 uCenter;
  uniform float uFall;
  uniform vec2 uDrift;
  uniform float uSway;
  uniform vec2 uSize;
  uniform float uAlpha;
  uniform vec2 uNear;
  varying vec2 vUv;
  varying float vAlpha;
  void main() {
    float speed = 0.8 + 0.4 * aSeed.w;
    vec3 p = aSeed.xyz * uBox;
    p.y -= uTime * uFall * speed;
    p.xz += uDrift * uTime * speed;
    p.x += sin(uTime * 0.8 + aSeed.w * 40.0) * uSway;
    p.z += cos(uTime * 0.6 + aSeed.w * 25.0) * uSway;
    vec3 origin = uCenter - uBox * 0.5;
    p = origin + mod(p - origin, uBox);
    // Thin out toward the edges of the box, so nothing pops as it wraps
    vec3 q = abs(p - uCenter) / (uBox * 0.5);
    float edge = 1.0 - smoothstep(0.65, 1.0, max(max(q.x, q.y), q.z));
    // A stroke along the way it falls, as seen from here
    vec4 mv = viewMatrix * vec4(p, 1.0);
    vec3 fall = (viewMatrix * vec4(uDrift.x, -uFall, uDrift.y, 0.0)).xyz;
    vec2 axis = normalize(fall.xy + vec2(0.0, -1e-4));
    vec2 side = vec2(-axis.y, axis.x);
    mv.xy += side * position.x * uSize.x + axis * (position.y - 0.5) * uSize.y;
    gl_Position = projectionMatrix * mv;
    float near = smoothstep(uNear.x, uNear.y, -mv.z);
    vAlpha = uAlpha * edge * near * (0.55 + 0.45 * aSeed.w);
    vUv = vec2(position.x + 0.5, position.y);
  }`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uRound;
  varying vec2 vUv;
  varying float vAlpha;
  void main() {
    vec2 c = vUv - 0.5;
    // A stroke: soft across, tapering at both ends
    float stroke = (1.0 - smoothstep(0.1, 0.5, abs(c.x))) * smoothstep(0.0, 0.4, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
    // A flake: a soft dot
    float flake = 1.0 - smoothstep(0.12, 0.5, length(c));
    float alpha = mix(stroke, flake, uRound) * vAlpha;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(uColor, alpha);
    #include <colorspace_fragment>
  }`;

type Field = { mesh: THREE.Mesh; geometry: THREE.InstancedBufferGeometry; material: THREE.ShaderMaterial; full: number; alpha: number; idle: number };

// The drops' material: this field's own (its uniforms are the field's),
// built with it and disposed with it
function dropMaterial(kind: Kind, look: Look) {
  return new THREE.ShaderMaterial({
    name: `precip:${kind}`,
    uniforms: {
      uTime: { value: 0 },
      uBox: { value: new THREE.Vector3(...look.box) },
      uCenter: { value: new THREE.Vector3() },
      uFall: { value: look.fall },
      uDrift: { value: new THREE.Vector2(...look.drift) },
      uSway: { value: look.sway },
      uSize: { value: new THREE.Vector2(...look.size) },
      uAlpha: { value: 0 },
      uNear: { value: new THREE.Vector2(...NEAR) },
      uColor: { value: kind === "rain" ? precip.rainColor : precip.snowColor },
      uRound: { value: look.round },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    // The stroke runs the way the drop falls, which mirrors the quad
    side: THREE.DoubleSide,
    fog: false,
  });
}

function build(kind: Kind, mobile: boolean): Field {
  const full = mobile ? COUNT[kind].mobile : COUNT[kind].full;
  const m = mobile ? { ...LOOK[kind], ...MOBILE[kind] } : LOOK[kind];
  // Into world units
  const look: Look = {
    ...m,
    box: [m.box[0] * UNIT, m.box[1] * UNIT, m.box[2] * UNIT],
    fall: m.fall * UNIT,
    drift: [m.drift[0] * UNIT, m.drift[1] * UNIT],
    sway: m.sway * UNIT,
    size: [m.size[0] * UNIT, m.size[1] * UNIT],
  };
  const r = rng(kind === "rain" ? 811 : 812);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0]), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const seeds = new Float32Array(full * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = r();
  geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 4));
  geometry.instanceCount = 0;
  const material = dropMaterial(kind, look);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 10;
  mesh.name = `precip:${kind}`;
  return { mesh, geometry, material, full, alpha: look.alpha, idle: 0 };
}

function release(scene: THREE.Scene, f: Field) {
  scene.remove(f.mesh);
  f.geometry.dispose();
  f.material.dispose();
}

export default function Precipitation({ quality }: { quality: Quality }) {
  const { camera, scene, invalidate } = useThree();
  const fields = useRef<Record<Kind, Field | null>>({ rain: null, snow: null });
  const tmp = useRef({ dir: new THREE.Vector3(), time: 0 });
  // Whether anything is falling: the canvas draws every frame while it is
  // (and still view is off)
  const [falling, setFalling] = useState(false);
  const still = useWorld((s) => s.still);
  useLive(falling && !still);

  // The mobile tier's fields are another size, so a change to or from it
  // builds them again; high and low share theirs (a step down compiles
  // nothing)
  const mobile = quality === "mobile";
  useEffect(() => {
    const current = fields.current;
    return () => {
      for (const kind of ["rain", "snow"] as const) {
        const f = current[kind];
        if (f) release(scene, f);
        current[kind] = null;
      }
    };
  }, [scene, mobile]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = tmp.current;
    const any = precip.rain > 0.001 || precip.snow > 0.001;
    if (any !== falling) setFalling(any);
    if (!any && !fields.current.rain && !fields.current.snow) return;

    const isStill = world.get().still;
    if (!isStill) t.time += dt;
    camera.getWorldDirection(t.dir);
    for (const kind of ["rain", "snow"] as const) {
      const amount = kind === "rain" ? precip.rain : precip.snow;
      let f = fields.current[kind];
      if (!f) {
        if (amount <= 0.001) continue;
        f = fields.current[kind] = build(kind, mobile);
        scene.add(f.mesh);
        invalidate();
      }
      if (amount <= 0.001) {
        f.idle += dt;
        f.geometry.instanceCount = 0;
        if (f.idle > LINGER) {
          release(scene, f);
          fields.current[kind] = null;
        }
        continue;
      }
      f.idle = 0;
      f.geometry.instanceCount = Math.ceil(f.full * Math.min(1, amount * 1.4) * (isStill ? 0.5 : 1));
      const u = f.material.uniforms;
      u.uTime.value = t.time;
      u.uAlpha.value = f.alpha * Math.min(1, amount);
      // The box sits a little ahead of the camera, where it's looking
      const box = u.uBox.value as THREE.Vector3;
      const center = u.uCenter.value as THREE.Vector3;
      center.copy(camera.position).addScaledVector(t.dir, box.x * 0.32);
      center.y = camera.position.y + box.y * 0.22;
    }
  });

  return null;
}
