import * as THREE from "three";
import { at, box, merge } from "./geometry";
import { glowUniforms, wash } from "./glow";
import { mesh, paint, windUniforms } from "./paint";
import { carvedPanel, textMask, type PanelOptions } from "./textures";

// Signs lit by fire, the way a place like this would have lit them: every
// sign is a board of dark stained wood with its words carved in and
// painted cream (`carvedSign`), and a torch on an iron bracket each side
// of it (`buildTorch`), whose light falls warm on the wall round it.
//
// - The words read by their value, pale on dark, by day (their paint holds
//   a little light, so they stay pale under cloud and through mist); after
//   dark they catch the torches' light (a steady warm glow in the cut
//   letters). The board itself is never lit, so the words never wash into
//   it.
// - The flames sway slowly; their light does not change. They hold still
//   in still view (the world's clock stops) and with reduced motion.
// - No lights of their own: the light on the wall is an additive wash
//   (glow.ts: `wash`), off by day, driven by `glowUniforms.uSigns` with the
//   rest of the night, so light counts and shaders are the same at every
//   hour.

export const TORCH = { light: "#ffb46a", board: "#3b2a1c", paint: "#f1e3c4" };

const mats = new Map<string, THREE.Material>();
const cached = <T extends THREE.Material>(key: string, make: () => T) => {
  let m = mats.get(key) as T | undefined;
  if (!m) {
    m = make();
    m.name = key;
    mats.set(key, m);
  }
  return m;
};

type SignLine = { text: string; size: number; gap?: number };

// A carved board's face: `key` names its textures (change it when the
// words change), `px` their size in pixels (the face's proportions). Lay
// it on a plane the size of the face.
export function carvedSign(key: string, px: [number, number], lines: SignLine[], { padding = 10, brush = 0.3, grime = 0.5, night = 0.85 } = {}) {
  const [w, h] = px;
  const words: PanelOptions = {
    background: TORCH.board,
    padding,
    valign: "middle",
    lines: lines.map((l) => ({ ...l, font: "display", color: TORCH.paint, weight: 600, align: "center" })),
  };
  return cached(`carved-${key}`, () =>
    paint({
      map: carvedPanel(key, w, h, words),
      // The cut letters catch the torches' light after dark: warm, steady
      emissive: TORCH.light,
      emissiveMap: textMask(key, w, h, words),
      emissiveIntensity: night,
      brush,
      grime,
      // A little by day too, as pale paint holds the light under cloud and
      // through mist; the board round them never glows
      glow: { day: 0.35, night: 1 },
    }),
  );
}

// A wooden frame round a carved board, `depth` out from the wall
export function signFrame(w: number, h: number, depth = 0.08, rail = 0.09) {
  const wood = cached("signFrameWood", () => paint({ color: "#2a1d13", brush: 0.35, brushScale: 3, grime: 0.5 }));
  const parts = [
    at(box(w + rail * 2, rail, depth), 0, h / 2 + rail / 2, 0),
    at(box(w + rail * 2, rail, depth), 0, -h / 2 - rail / 2, 0),
    at(box(rail, h, depth), -w / 2 - rail / 2, 0, 0),
    at(box(rail, h, depth), w / 2 + rail / 2, 0, 0),
    at(box(w, h, depth * 0.5), 0, 0, -depth * 0.25),
  ];
  const m = mesh(merge(parts), wood as THREE.MeshLambertMaterial);
  m.name = "signFrame";
  return m;
}

// The flame: a billboard (it always faces you) with a teardrop of fire on
// it, white-gold at the heart, orange, then red at the edge. Its shape
// sways a little on the world's clock; its brightness doesn't. A little
// stronger after dark, faded out with the fog.
function flameMaterial() {
  return cached(
    "torchFlame",
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
          uTime: windUniforms.uTime,
          uSigns: glowUniforms.uSigns,
        },
        vertexShader: /* glsl */ `
          attribute float aSeed;
          varying vec2 vUv;
          varying float vDepth;
          varying float vSeed;
          void main() {
            vUv = uv;
            vSeed = aSeed;
            // Billboard: the quad's corners laid out in view space round
            // the flame's foot
            vec4 foot = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
            vec3 scale = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), 1.0);
            vec4 mv = foot + vec4(position.xy * scale.xy, 0.0, 0.0);
            vDepth = -mv.z;
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform float uSigns;
          uniform float fogNear;
          uniform float fogFar;
          varying vec2 vUv;
          varying float vDepth;
          varying float vSeed;
          void main() {
            float y = vUv.y;
            // The sway: the tip leans, slowly, a little more the higher up
            float t = uTime * 1.3 + vSeed * 6.0;
            float x = vUv.x - 0.5 - (sin(t) * 0.06 + sin(t * 1.7 + 1.3) * 0.03) * y * y;
            // A teardrop: round at the foot, drawn to a point at the tip
            float width = 0.42 * pow(1.0 - y, 0.75) * smoothstep(0.0, 0.18, y);
            float body = 1.0 - smoothstep(width * 0.55, width, abs(x));
            body *= smoothstep(1.0, 0.82, y);
            if (body < 0.01) discard;
            float heart = (1.0 - smoothstep(0.0, width * 0.55, abs(x))) * smoothstep(0.75, 0.15, y);
            vec3 c = mix(vec3(0.85, 0.22, 0.05), vec3(1.0, 0.62, 0.18), body);
            c = mix(c, vec3(1.0, 0.94, 0.72), heart);
            float on = mix(0.75, 1.0, uSigns);
            float fog = 1.0 - smoothstep(fogNear, fogFar, vDepth);
            gl_FragColor = vec4(c * body * on * fog, 1.0);
          }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: true,
      }),
  );
}

// A torch on an iron bracket out from the wall: the bracket, the wooden
// handle, the iron cup, the flame above it, and the wash of its light on
// the wall behind (`light` its strength; 0 for none). The group's origin
// is where the bracket meets the wall; the flame stands about 0.35 m out
// and 0.4 m up.
export function buildTorch(seed = 0, { light = 0.55, reach = 1.1 } = {}) {
  const g = new THREE.Group();
  g.name = "torch";
  const iron = cached("torchIron", () => paint({ color: "#2f302b", brush: 0.3, brushScale: 3, rust: 0.6 })) as THREE.MeshLambertMaterial;
  const wood = cached("torchWood", () => paint({ color: "#5a3d24", brush: 0.35, brushScale: 4, grime: 0.6 })) as THREE.MeshLambertMaterial;
  g.add(mesh(merge([at(box(0.06, 0.18, 0.02), 0, 0, 0.01), at(box(0.03, 0.03, 0.34), 0, -0.02, 0.17), at(new THREE.TorusGeometry(0.045, 0.01, 6, 12).rotateX(Math.PI / 2), 0, 0.0, 0.33)]), iron));
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.022, 0.5, 8).translate(0, 0.05, 0.34), wood));
  g.add(mesh(new THREE.CylinderGeometry(0.06, 0.035, 0.1, 10, 1, true).translate(0, 0.33, 0.34), iron, { cast: false }));
  const geo = new THREE.PlaneGeometry(0.22, 0.42).translate(0, 0.21, 0);
  geo.setAttribute("aSeed", new THREE.Float32BufferAttribute([seed, seed, seed, seed], 1));
  const flame = new THREE.Mesh(geo, flameMaterial());
  flame.position.set(0, 0.34, 0.34);
  flame.renderOrder = 2;
  flame.frustumCulled = false;
  flame.name = "torchFlame";
  g.add(flame);
  if (light > 0) {
    // Its light on the wall: round the flame, falling off within a metre
    const w = wash([0.18, 0.3], [reach, reach, reach * 0.9, reach * 1.1], TORCH.light, light, 0.42);
    w.position.set(0, 0.5, 0.012);
    g.add(w);
  }
  return g;
}

// A board's pair of torches, one each side, at the board's height. `x` the
// board's centre, `w` its width, `y` its middle, `wallZ` the wall.
export function torchPair(x: number, w: number, y: number, wallZ: number, opts: { light?: number; reach?: number; gap?: number } = {}) {
  const g = new THREE.Group();
  const gap = opts.gap ?? 0.35;
  for (const [side, seed] of [
    [-1, 0.3],
    [1, 0.75],
  ] as const) {
    const t = buildTorch(seed, opts);
    t.position.set(x + side * (w / 2 + gap), y - 0.15, wallZ);
    g.add(t);
  }
  return g;
}
