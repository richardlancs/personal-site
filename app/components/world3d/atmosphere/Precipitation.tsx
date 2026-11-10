"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { windUniforms } from "../paint";
import { rng } from "../rng";
import { world, type Quality } from "../store";
import { overlay as scene, precip } from "./state";

// Rain and snow, out of doors (how much: Atmosphere.tsx, `precip`).
//
// One instanced quad per drop or flake, in a box that travels with the
// camera; the GPU moves them (the world's clock, uTime) and wraps them
// round the box, so a frame costs the CPU nothing but a few uniforms.
// Rain is drawn as thin painted strokes along the way it falls, snow as
// soft dots that drift. They thin out near the edges of the box and right
// in front of the lens, and give way over the introduction in the open
// sky and along the top of the screen, where the words and controls are.
//
// In still view the clock stops, so they hold where they are, at half the
// density: rain as still strokes, like rain in a woodblock print, so the
// weather still reads with nothing moving.
//
// Built when first needed; disposed a few seconds after it stops.

type Kind = "rain" | "snow";
const COUNT: Record<Kind, { full: number; mobile: number }> = {
  rain: { full: 1100, mobile: 450 },
  snow: { full: 800, mobile: 340 },
};
const LOOK: Record<Kind, { box: [number, number, number]; fall: number; drift: [number, number]; sway: number; size: [number, number]; alpha: number; round: number }> = {
  rain: { box: [30, 13, 30], fall: 7.5, drift: [1.2, -0.5], sway: 0, size: [0.03, 0.5], alpha: 0.3, round: 0 },
  snow: { box: [26, 11, 26], fall: 0.75, drift: [0.25, -0.1], sway: 0.35, size: [0.075, 0.075], alpha: 0.85, round: 1 },
};
const LINGER = 20; // seconds after it stops (or you go indoors) before it's taken down

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
  uniform vec4 uMask;
  uniform float uTop;
  uniform vec3 uShelterMin;
  uniform vec3 uShelterMax;
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
    vec3 inside = step(uShelterMin, p) * step(p, uShelterMax);
    float sheltered = inside.x * inside.y * inside.z;
    // A stroke along the way it falls, as seen from here
    vec4 mv = viewMatrix * vec4(p, 1.0);
    vec3 fall = (viewMatrix * vec4(uDrift.x, -uFall, uDrift.y, 0.0)).xyz;
    vec2 axis = normalize(fall.xy + vec2(0.0, -1e-4));
    vec2 side = vec2(-axis.y, axis.x);
    mv.xy += side * position.x * uSize.x + axis * (position.y - 0.5) * uSize.y;
    gl_Position = projectionMatrix * mv;
    // Clear of the words: the introduction's box and the top of the screen
    vec2 ndc = gl_Position.xy / gl_Position.w;
    vec2 a = smoothstep(uMask.xy - 0.08, uMask.xy + 0.02, ndc);
    vec2 b = 1.0 - smoothstep(uMask.zw - 0.02, uMask.zw + 0.08, ndc);
    float clear = max(a.x * a.y * b.x * b.y, smoothstep(uTop - 0.1, uTop, ndc.y));
    float near = smoothstep(1.6, 3.6, -mv.z);
    vAlpha = uAlpha * edge * near * (1.0 - sheltered) * (1.0 - clear * 0.92) * (0.55 + 0.45 * aSeed.w);
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

type Field = { mesh: THREE.Mesh; geometry: THREE.InstancedBufferGeometry; material: THREE.ShaderMaterial; full: number; idle: number };

function build(kind: Kind, quality: Quality): Field {
  const full = quality === "mobile" ? COUNT[kind].mobile : COUNT[kind].full;
  const look = LOOK[kind];
  const r = rng(kind === "rain" ? 811 : 812);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0]), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const seeds = new Float32Array(full * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = r();
  geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 4));
  geometry.instanceCount = 0;
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: windUniforms.uTime,
      uBox: { value: new THREE.Vector3(...look.box) },
      uCenter: { value: new THREE.Vector3() },
      uFall: { value: look.fall },
      uDrift: { value: new THREE.Vector2(...look.drift) },
      uSway: { value: look.sway },
      uSize: { value: new THREE.Vector2(...look.size) },
      uAlpha: { value: 0 },
      uMask: { value: new THREE.Vector4(2, 2, 3, 3) },
      uTop: { value: 0.88 },
      uShelterMin: { value: precip.shelterMin },
      uShelterMax: { value: precip.shelterMax },
      uColor: { value: kind === "rain" ? precip.rainColor : precip.snowColor },
      uRound: { value: look.round },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    // Drawn over the painted scene (state.ts: overlay), which has no depth
    // of its own: what's near is kept clear by the fade toward the lens
    depthTest: false,
    // The stroke runs the way the drop falls, which mirrors the quad
    side: THREE.DoubleSide,
    fog: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.name = `precip:${kind}`;
  return { mesh, geometry, material, full, idle: 0 };
}

function dispose(scene: THREE.Scene, f: Field) {
  scene.remove(f.mesh);
  f.geometry.dispose();
  f.material.dispose();
}

export default function Precipitation({ quality }: { quality: Quality }) {
  const { camera, gl } = useThree();
  const fields = useRef<Record<Kind, Field | null>>({ rain: null, snow: null });
  const tmp = useRef({ dir: new THREE.Vector3(), frame: 0, mask: new THREE.Vector4(2, 2, 3, 3), top: 0.88 });

  useEffect(
    () => () => {
      for (const kind of ["rain", "snow"] as const) {
        const f = fields.current[kind];
        if (f) dispose(scene, f);
        fields.current[kind] = null;
      }
    },
    [],
  );

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = tmp.current;
    const any = precip.rain > 0.001 || precip.snow > 0.001 || fields.current.rain || fields.current.snow;
    if (!any) return;

    // Where the words are, measured now and then rather than every frame
    if (t.frame++ % 30 === 0) {
      const canvas = gl.domElement.getBoundingClientRect();
      const intro = document.querySelector<HTMLElement>(".park-intro");
      const rect = intro && intro.offsetParent && getComputedStyle(intro).position === "absolute" ? intro.getBoundingClientRect() : null;
      if (rect && rect.width > 0 && canvas.width > 0) {
        const pad = 28;
        const x = (px: number) => ((px - canvas.left) / canvas.width) * 2 - 1;
        const y = (py: number) => 1 - ((py - canvas.top) / canvas.height) * 2;
        t.mask.set(x(rect.left - pad), y(rect.bottom + pad), x(rect.right + pad), y(rect.top - pad));
      } else {
        t.mask.set(2, 2, 3, 3);
      }
      t.top = canvas.height > 0 ? 1 - (2 * 64) / canvas.height : 0.88;
    }

    const still = world.get().still;
    camera.getWorldDirection(t.dir);
    for (const kind of ["rain", "snow"] as const) {
      const amount = kind === "rain" ? precip.rain : precip.snow;
      let f = fields.current[kind];
      if (!f) {
        if (amount <= 0.001) continue;
        f = fields.current[kind] = build(kind, quality);
        scene.add(f.mesh);
      }
      if (amount <= 0.001) {
        f.idle += dt;
        f.geometry.instanceCount = 0;
        if (f.idle > LINGER) {
          dispose(scene, f);
          fields.current[kind] = null;
        }
        continue;
      }
      f.idle = 0;
      f.geometry.instanceCount = Math.ceil(f.full * Math.min(1, amount * 1.4) * (still ? 0.5 : 1));
      const u = f.material.uniforms;
      u.uAlpha.value = LOOK[kind].alpha * Math.min(1, amount);
      // The box sits a little ahead of the camera, where it's looking
      const box = u.uBox.value as THREE.Vector3;
      (u.uCenter.value as THREE.Vector3).copy(camera.position).addScaledVector(t.dir, box.x * 0.32);
      (u.uCenter.value as THREE.Vector3).y = camera.position.y + box.y * 0.22;
      (u.uMask.value as THREE.Vector4).copy(t.mask);
      u.uTop.value = t.top;
    }
  });

  return null;
}
