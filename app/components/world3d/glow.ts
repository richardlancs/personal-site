import * as THREE from "three";
import { tube } from "./geometry";
import { paint } from "./paint";
import { world } from "./store";

// Light after dark: the street lamps' beams in the air, and the signs.
//
// - A lamp is a real spotlight at its bulb, aimed straight down (props.ts:
//   buildLamp). What shows in the air is `lampBeam`: the light scattered
//   by the air inside its cone, worked out per pixel along the view ray
//   (no cone outline: the edge is where the ray's path through the light
//   goes to nothing), brightest just under the lens, fading toward the
//   ground and into the fog
// - Signs are lit by what they're made of: a lit box behind a painted
//   face (`lightbox`), neon tube (`neonTube`, `neon`), or neon letters on a
//   dark board (an emissive mask, textures.ts: textMask). Around them, a
//   soft wash of their light on the wall (`wash`) and a halo round neon
//   letters (`halo`), both additive and far dimmer than the sign itself,
//   so the lettering stays the sharpest, brightest thing
// - The day and the weather set how much of this shows, through
//   `glowUniforms` (atmosphere/Atmosphere.tsx) and the painted material's
//   own day/night glow (paint.ts: `glow`). Nothing flickers.

export const glowUniforms = {
  uLamps: { value: 0 }, // the beams in the air: 0 by day .. 1 at night (more in rain and mist)
  uSigns: { value: 0 }, // the signs' light on walls: 0 by day .. 1 at night
  uHaze: { value: 0 }, // rain, snow or mist outdoors: light spreads a little wider and softer
};

// The palette of the lights: baby blue for neon tube, warm white for lit
// faces and lamps, the arcade's own pink as the one accent
export const NEON = {
  blue: "#5fc4f2",
  warm: "#fff0da",
  pink: "#ff8ea4",
  lamp: "#ffc98a",
};

const mobile = () => world.get().quality === "mobile";

// The fog, faded out of what's added on top of the scene (additive light
// shouldn't glow through the mist from far away)
const FOG = /* glsl */ `
uniform float fogNear;
uniform float fogFar;
float glowFog(float depth) { return 1.0 - smoothstep(fogNear, fogFar, depth); }
`;
const fogUniforms = () => THREE.UniformsUtils.clone(THREE.UniformsLib.fog);

// ---------------------------------------------------------------------
// The beam under a street lamp

// The beam's shape, in the lamp's own metres: a cone from a point just
// above the lens (so it leaves the lens as wide as the lens), visible to
// about where the spotlight's pool ends on the ground
export const BEAM = {
  apexAboveLens: 0.32,
  tan: 0.6, // the visible profile's spread (radius per metre down)
  bound: 0.74, // the mesh around it, a little wider, where the profile has gone to nothing
};

const beamMats = new Map<string, THREE.ShaderMaterial>();
function beamMaterial(steps: number) {
  const key = `beam-${steps}`;
  let m = beamMats.get(key);
  if (m) return m;
  m = new THREE.ShaderMaterial({
    uniforms: {
      ...fogUniforms(),
      uLamps: glowUniforms.uLamps,
      uColor: { value: new THREE.Color(NEON.lamp) },
      uTan: { value: BEAM.tan },
      uBound: { value: BEAM.bound },
    },
    defines: { STEPS: steps },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec3 vApex;
      varying float vDepth;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vApex = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vec4 mv = viewMatrix * w;
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      ${FOG}
      uniform float uLamps;
      uniform vec3 uColor;
      uniform float uTan;
      uniform float uBound;
      uniform float uTop;
      uniform float uLength;
      varying vec3 vWorld;
      varying vec3 vApex;
      varying float vDepth;
      void main() {
        if (uLamps < 0.002) discard;
        // The view ray, from the apex's point of view; h is depth below it
        vec3 ro = cameraPosition - vApex;
        vec3 rd = normalize(vWorld - cameraPosition);
        float tn = 0.0;
        float tf = 1e4;
        // Between the lens and the ground
        if (abs(rd.y) > 1e-5) {
          float t0 = (-uTop - ro.y) / rd.y;
          float t1 = (-uLength - ro.y) / rd.y;
          tn = max(tn, min(t0, t1));
          tf = min(tf, max(t0, t1));
        } else if (ro.y > -uTop || ro.y < -uLength) discard;
        // Inside the (bounding) cone: x^2 + z^2 - k y^2 <= 0
        float k = uBound * uBound;
        float a = rd.x * rd.x + rd.z * rd.z - k * rd.y * rd.y;
        float b = 2.0 * (ro.x * rd.x + ro.z * rd.z - k * ro.y * rd.y);
        float c = ro.x * ro.x + ro.z * ro.z - k * ro.y * ro.y;
        float disc = b * b - 4.0 * a * c;
        if (abs(a) < 1e-6) {
          if (abs(b) > 1e-6) {
            float t = -c / b;
            if (b > 0.0) tf = min(tf, t); else tn = max(tn, t);
          } else if (c > 0.0) discard;
        } else if (disc < 0.0) {
          if (a > 0.0) discard;
        } else {
          float s = sqrt(disc);
          float r1 = (-b - s) / (2.0 * a);
          float r2 = (-b + s) / (2.0 * a);
          float lo = min(r1, r2);
          float hi = max(r1, r2);
          if (a > 0.0) { tn = max(tn, lo); tf = min(tf, hi); }
          else if (tn < lo) tf = min(tf, lo);
          else tn = max(tn, hi);
        }
        if (tf <= tn) discard;
        // The light the air throws back along the way: a soft profile
        // across the beam, strongest near the lens, thinning with distance
        float dt = (tf - tn) / float(STEPS);
        float sum = 0.0;
        for (int i = 0; i < STEPS; i++) {
          vec3 p = ro + rd * (tn + (float(i) + 0.5) * dt);
          float h = -p.y;
          float R = h * uTan;
          float q = dot(p.xz, p.xz) / (R * R);
          float across = exp(-2.6 * q);
          float along = 1.0 / (0.6 + h * h) * smoothstep(uTop, uTop + 0.12, h);
          sum += across * along;
        }
        float light = sum * dt * 0.4 * uLamps * glowFog(vDepth);
        gl_FragColor = vec4(uColor * light, 1.0);
      }`,
    side: THREE.FrontSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
  });
  beamMats.set(key, m);
  return m;
}

// The beam's mesh: a cone around the light, apex up at the origin. `drop`
// is how far below the apex the ground is.
export function lampBeam(drop: number) {
  const steps = mobile() ? 5 : 8;
  const base = beamMaterial(steps);
  // Same program, its own length (lamps stand on ground of different heights)
  const m = base.clone();
  m.uniforms.uLamps = glowUniforms.uLamps;
  m.uniforms.uTop = { value: BEAM.apexAboveLens };
  m.uniforms.uLength = { value: drop - 0.03 };
  const length = drop - 0.03;
  const geo = new THREE.ConeGeometry(length * BEAM.bound, length, 20, 1, false).translate(0, -length / 2, 0);
  const beam = new THREE.Mesh(geo, m);
  beam.renderOrder = 2;
  beam.castShadow = false;
  beam.receiveShadow = false;
  return beam;
}

// ---------------------------------------------------------------------
// Signs

// A painted sign face lit from behind: its own colours, glowing; the
// letters stay dark and crisp. Restrained by day, full at night.
export function lightbox(map: THREE.Texture, { strength = 0.45, brush = 0.15, grime = 0.3 } = {}) {
  return paint({ map, emissive: NEON.warm, emissiveMap: map, emissiveIntensity: strength, brush, grime, glow: { day: 0.12, night: 1 } });
}

// Neon tube: a near-white core in its colour, lit a little by day
export function neon(color: string, strength = 2.2) {
  return paint({ color: "#eef8ff", emissive: color, emissiveIntensity: strength, brush: 0, glow: { day: 0.28, night: 1 } });
}

// A tube round a sign's edge, with rounded corners and a small gap at
// the foot of the sign where it's fed (as real neon is). Centred on the
// origin in the xy plane.
export function neonTube(w: number, h: number, radius = 0.03, corner = 0.12) {
  const pts: THREE.Vector3[] = [];
  const hw = w / 2;
  const hh = h / 2;
  const gap = 0.05;
  pts.push(new THREE.Vector3(gap, -hh, 0));
  const arc = (cx: number, cy: number, from: number) => {
    for (let i = 0; i <= 4; i++) {
      const a = from + (i / 4) * (Math.PI / 2);
      pts.push(new THREE.Vector3(cx + Math.cos(a) * corner, cy + Math.sin(a) * corner, 0));
    }
  };
  arc(hw - corner, -hh + corner, -Math.PI / 2);
  arc(hw - corner, hh - corner, 0);
  arc(-hw + corner, hh - corner, Math.PI / 2);
  arc(-hw + corner, -hh + corner, Math.PI);
  pts.push(new THREE.Vector3(-gap, -hh, 0));
  const length = 2 * (w + h);
  return tube(pts, () => radius, Math.round(length * 14), 6);
}

// What a sign's light does to the wall round it: a soft wash, brightest
// at the sign's edge and gone well before the quad's own edge. `rect` is
// the sign's size; `reach` how far the quad goes past it on each side
// [left, right, top, bottom].
const washMats = new Map<string, THREE.ShaderMaterial>();
export function wash(rect: [number, number], reach: [number, number, number, number], color: string, strength: number, fall = 0.32) {
  const [w, h] = rect;
  const [l, r, t, b] = reach;
  const pw = w + l + r;
  const ph = h + t + b;
  const key = `${color}-${strength}-${fall}`;
  let base = washMats.get(key);
  if (!base) {
    base = new THREE.ShaderMaterial({
      uniforms: {
        ...fogUniforms(),
        uSigns: glowUniforms.uSigns,
        uHaze: glowUniforms.uHaze,
        uColor: { value: new THREE.Color(color) },
        uStrength: { value: strength },
        uFall: { value: fall },
        uHalf: { value: new THREE.Vector2() },
        uPlane: { value: new THREE.Vector2() },
        uCentre: { value: new THREE.Vector2() },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying float vDepth;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        ${FOG}
        uniform float uSigns;
        uniform float uHaze;
        uniform vec3 uColor;
        uniform float uStrength;
        uniform float uFall;
        uniform vec2 uHalf;
        uniform vec2 uPlane;
        uniform vec2 uCentre;
        varying vec2 vUv;
        varying float vDepth;
        void main() {
          if (uSigns < 0.002) discard;
          vec2 p = vUv * uPlane - uCentre;
          vec2 q = abs(p) - uHalf;
          float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
          float fall = uFall * (1.0 + 0.45 * uHaze);
          float g = exp(-max(d, 0.0) / fall);
          // Gone before the quad's edge, whichever way
          vec2 e = min(vUv, 1.0 - vUv) * uPlane;
          g *= smoothstep(0.0, 0.35, min(e.x, e.y));
          gl_FragColor = vec4(uColor * g * uStrength * uSigns * glowFog(vDepth), 1.0);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: true,
    });
    washMats.set(key, base);
  }
  const m = base.clone();
  m.uniforms.uSigns = glowUniforms.uSigns;
  m.uniforms.uHaze = glowUniforms.uHaze;
  m.uniforms.uHalf.value.set(w / 2, h / 2);
  m.uniforms.uPlane.value.set(pw, ph);
  // The sign's centre, measured in the quad from its lower left corner
  m.uniforms.uCentre.value.set(l + w / 2, b + h / 2);
  const geo = new THREE.PlaneGeometry(pw, ph).translate((r - l) / 2, (t - b) / 2, 0);
  const quad = new THREE.Mesh(geo, m);
  quad.renderOrder = 1;
  return quad;
}

// A sign's lettering in neon: the colour of its own ink, brought up bright
// (the same hue: a sign's green stays green, its brown turns amber)
export function neonOf(ink: string) {
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(ink).getHSL(hsl);
  return `#${new THREE.Color().setHSL(hsl.h, Math.max(hsl.s, 0.9), 0.5).getHexString()}`;
}

// A sign's words lit as neon, on a quad laid just in front of its face
// (the face itself unchanged): each stroke glows in its colour, hottest
// along its middle (near white), with a soft halo of the same colour just
// round it (textures.ts: neonMask). A trace by day, full at night, a
// little wider in rain and mist; steady. `body` is the letters' own glow
// (0 where the face already lights them, as on the arcade's board).
export function neonLetters(mask: THREE.Texture, size: [number, number], color: string, { body = 0.55, core = 0.4, halo = 0.12, day = 0.06 } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      ...fogUniforms(),
      uSigns: glowUniforms.uSigns,
      uHaze: glowUniforms.uHaze,
      uMask: { value: mask },
      uColor: { value: new THREE.Color(color) },
      uWeights: { value: new THREE.Vector4(body, core, halo, day) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vDepth;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      ${FOG}
      uniform float uSigns;
      uniform float uHaze;
      uniform sampler2D uMask;
      uniform vec3 uColor;
      uniform vec4 uWeights;
      varying vec2 vUv;
      varying float vDepth;
      void main() {
        vec3 m = texture2D(uMask, vUv).rgb;
        float on = mix(uWeights.w, 1.0, uSigns);
        if (on * (m.r + m.b) < 0.002) discard;
        float core = smoothstep(0.75, 1.0, m.g) * m.r;
        vec3 c = uColor * (m.r * uWeights.x + m.b * uWeights.z * (1.0 + 0.3 * uHaze))
          + mix(uColor, vec3(1.0), 0.5) * core * uWeights.y;
        gl_FragColor = vec4(c * on * glowFog(vDepth), 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), m);
  quad.renderOrder = 1;
  return quad;
}

// The halo round neon letters: their own shapes, blurred (textures.ts:
// textMask, glowMask), laid just in front of them
export function halo(mask: THREE.Texture, size: [number, number], color: string, strength: number) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      ...fogUniforms(),
      uSigns: glowUniforms.uSigns,
      uHaze: glowUniforms.uHaze,
      uMask: { value: mask },
      uColor: { value: new THREE.Color(color) },
      uStrength: { value: strength },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vDepth;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      ${FOG}
      uniform float uSigns;
      uniform float uHaze;
      uniform sampler2D uMask;
      uniform vec3 uColor;
      uniform float uStrength;
      varying vec2 vUv;
      varying float vDepth;
      void main() {
        float g = texture2D(uMask, vUv).r;
        // By day a trace of it; rain and mist soften it a little wider
        float on = 0.12 + 0.88 * uSigns;
        gl_FragColor = vec4(uColor * g * uStrength * on * (1.0 + 0.3 * uHaze) * glowFog(vDepth), 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), m);
  quad.renderOrder = 1;
  return quad;
}
