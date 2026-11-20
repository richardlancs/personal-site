import * as THREE from "three";

// The rain's and snow's material (atmosphere/Precipitation.tsx builds the
// fields): each field's own ShaderMaterial, since its uniforms (time, box,
// size, colour) are the field's; built with the field and disposed with it
// (Precipitation's release), never cached in kit/materials.ts.

export type PrecipKind = "rain" | "snow";
// In world units (Precipitation.tsx scales from metres)
export type PrecipLook = { box: [number, number, number]; fall: number; drift: [number, number]; sway: number; size: [number, number]; alpha: number; round: number };

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

// The drops' material: this field's own (its uniforms are the field's),
// built with it and disposed with it
export function dropMaterial(kind: PrecipKind, look: PrecipLook, color: THREE.Color, near: [number, number]) {
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
      uNear: { value: new THREE.Vector2(...near) },
      uColor: { value: color },
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

