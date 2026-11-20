import * as THREE from "three";
import { shared } from "./materials";
import { track } from "./textures";
import { materialKey, neonUniforms } from "./uniforms";
import { rng } from "../rng";

// Neon, screens, and the mobile tier's stand-in for bloom.
//
// - neonMaterial: a tube or strip of light. Unlit; its colour is the tone
//   × neonUniforms.uNeon (0.3 by day .. 1 at night, more in rain or snow:
//   atmosphere/Atmosphere.tsx) × NEON_HDR, so at night it is brighter than
//   1.0 and the bloom (Post.tsx, threshold 1.0) picks it up, and by day it
//   is the tone itself, a little dim, under the threshold. With `dayColor`,
//   an unlit tube by day: that colour, turning into the light as the
//   evening comes.
// - screenMaterial: a face painted on a canvas. By default it shows exactly
//   as painted, whatever the tone mapping (the inverse of the neutral tone
//   map is applied in the shader, so after the renderer's or the
//   composer's tone mapping the pixel is the canvas's sRGB value): a
//   section's sign reads in the interface's own tones. With `glow`, a lit
//   screen instead: as painted by day, × glow × uNeon at night (over 1.0
//   where it's bright, so it blooms).
// - glowSprites: soft additive dots, one draw call, for the mobile tier,
//   which has no bloom; nothing under `prefers-contrast: more`.
//
// Every material goes through shared(materialKey(…)) (equal ones are one
// object, disposed centrally) and names its program with
// customProgramCacheKey. Nothing here changes a shader at runtime: day,
// night and weather move uniforms only.

// Above the bloom threshold (1.0), which nothing lit reaches
export const NEON_HDR = 3;

// The night plates' three neon tones: scene colours, not interface tokens
export const SCENE_TONES = { cyan: "#4fd8ee", rose: "#f062b4", gold: "#ffb454" } as const;
export type SceneTone = keyof typeof SCENE_TONES;

export const toneColor = (tone: SceneTone | string): string => (tone in SCENE_TONES ? SCENE_TONES[tone as SceneTone] : tone);

const hex = (c: string) => new THREE.Color(c).getHexString();

export function neonMaterial(tone: SceneTone | string, o: { dayColor?: string } = {}): THREE.MeshBasicMaterial {
  const color = toneColor(tone);
  const program = materialKey("neon", o.dayColor ? "day" : "lit");
  return shared(materialKey("neon", `${hex(color)}:${o.dayColor ? hex(o.dayColor) : "lit"}`), () => {
    const m = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    const day = { value: new THREE.Color(o.dayColor ?? color) };
    m.onBeforeCompile = (s) => {
      s.uniforms.uNeon = neonUniforms.uNeon;
      s.uniforms.uDay = day;
      s.fragmentShader = `uniform float uNeon;\nuniform vec3 uDay;\n${s.fragmentShader}`.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        diffuseColor.rgb *= uNeon * ${NEON_HDR.toFixed(1)};
        ${o.dayColor ? "diffuseColor.rgb = mix(uDay, diffuseColor.rgb, smoothstep(0.35, 0.85, uNeon));" : ""}`,
      );
    };
    m.customProgramCacheKey = () => program;
    return m;
  });
}

// The inverse of three's NeutralToneMapping (tonemapping_pars_fragment)
// at the renderer's exposure: untone(c) tone-maps back to c, for c under
// 0.97. Applied to a face after its colour is worked out and before the
// tone mapping (the material's own on the mobile tier, the composer's
// ToneMapping effect on the desktop tiers; both use toneMappingExposure),
// so the face shows as painted. Without it, the neutral map's toe takes
// the boards' soft black (#181b23) to about rgb(3, 9, 23).
const UNTONE = /* glsl */ `
#ifndef TONE_MAPPING
uniform float toneMappingExposure;
#endif
vec3 untone(vec3 o) {
  const float StartCompression = 0.76;
  const float Desaturation = 0.15;
  o = clamp(o, 0.0, 0.97);
  vec3 c = o;
  float np = max(o.r, max(o.g, o.b));
  if (np >= StartCompression) {
    // the shoulder: newPeak = 1 - d^2 / (peak + d - StartCompression), d = 0.24
    float p = 0.52 + 0.0576 / (1.0 - np);
    float g = 1.0 - 1.0 / (Desaturation * (p - np) + 1.0);
    c = (o - g * np) / (1.0 - g) * (p / np);
  }
  // the toe: the darkest channel x goes to 6.25 x^2 under x = 0.08, else
  // everything drops by 0.04
  float y = min(c.r, min(c.g, c.b));
  float x = y < 0.04 ? sqrt(max(y, 0.0) / 6.25) : y + 0.04;
  return (c + (x - y)) / toneMappingExposure;
}
`;

// A face drawn on a canvas (a sign's board, a screen): `draw` paints it at
// w × h pixels, again whenever the material's userData.redraw() is called
// (e.g. once the display face has loaded). One material per `key`. As
// painted, or with `glow` a lit screen (see the top of this file).
export function screenMaterial(
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
  o: { w: number; h: number; key: string; glow?: number },
): THREE.MeshBasicMaterial {
  const program = materialKey("screen", o.glow ? "glow" : "exact");
  return shared(materialKey("screen", o.key), () => {
    const canvas = document.createElement("canvas");
    canvas.width = o.w;
    canvas.height = o.h;
    const texture = track(new THREE.CanvasTexture(canvas));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.userData.kitOwned = true;
    const paint = () => {
      const g = canvas.getContext("2d")!;
      g.clearRect(0, 0, o.w, o.h);
      draw(g, o.w, o.h);
      texture.needsUpdate = true;
    };
    paint();
    const m = new THREE.MeshBasicMaterial({ map: texture });
    const glow = { value: o.glow ?? 1 };
    m.onBeforeCompile = (s) => {
      if (o.glow) {
        s.uniforms.uNeon = neonUniforms.uNeon;
        s.uniforms.uGlow = glow;
        s.fragmentShader = `uniform float uNeon;\nuniform float uGlow;\n${s.fragmentShader}`.replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          diffuseColor.rgb *= max(1.0, uGlow * uNeon);`,
        );
      } else {
        s.fragmentShader = `${UNTONE}\n${s.fragmentShader}`.replace("#include <opaque_fragment>", "#include <opaque_fragment>\n  gl_FragColor.rgb = untone(gl_FragColor.rgb);");
      }
    };
    m.customProgramCacheKey = () => program;
    m.userData.redraw = paint;
    return m;
  });
}

// An abstract picture for a big screen, as on the night plates' towers:
// a deep blue-black ground, two or three soft waves of light in the
// tones, and a few thin bars. No letters. Use with screenMaterial's
// `glow`. Same seed, same picture.
export function screenArt(seed: number, tones: readonly SceneTone[] = ["cyan", "rose", "gold"]) {
  return (g: CanvasRenderingContext2D, w: number, h: number) => {
    const r = rng(seed);
    const bg = g.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#0b1430");
    bg.addColorStop(1, "#150c2a");
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    const waves = 2 + Math.floor(r() * 2);
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < waves; i++) {
      const tone = SCENE_TONES[tones[(i + Math.floor(r() * tones.length)) % tones.length]];
      const y0 = h * r.range(0.25, 0.75);
      const amp = h * r.range(0.12, 0.3);
      const thick = h * r.range(0.12, 0.3);
      const phase = r() * Math.PI * 2;
      const freq = r.range(0.8, 1.8);
      const grad = g.createLinearGradient(0, y0 - amp - thick, 0, y0 + amp + thick);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(0.5, tone);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      g.globalAlpha = r.range(0.55, 0.85);
      g.beginPath();
      for (let x = 0; x <= w; x += w / 48) g.lineTo(x, y0 + Math.sin((x / w) * Math.PI * 2 * freq + phase) * amp - thick / 2);
      for (let x = w; x >= 0; x -= w / 48) g.lineTo(x, y0 + Math.sin((x / w) * Math.PI * 2 * freq + phase + 0.6) * amp + thick / 2);
      g.closePath();
      g.fill();
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    // A few thin bars along the foot, like a screen's ticker, unreadable
    g.fillStyle = "rgba(230,240,255,0.35)";
    let x = w * 0.06;
    while (x < w * 0.9) {
      const bw = w * r.range(0.04, 0.14);
      g.fillRect(x, h * 0.86, bw, Math.max(2, h * 0.02));
      x += bw + w * r.range(0.02, 0.05);
    }
  };
}

// A white dot, soft to its edge: the glow sprites' shape
function glowDot() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.2, "rgba(255,255,255,0.45)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.12)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const t = track(new THREE.CanvasTexture(canvas));
  t.userData.kitOwned = true;
  return t;
}

const MORE_CONTRAST = "(prefers-contrast: more)";

// Mobile's stand-in for bloom: a soft dot of light round each point,
// facing the camera, added over the scene, as bright as the neon is
// (nothing by day, full at night), fading into the fog like the rest.
// One draw call for all of them. Hidden under `prefers-contrast: more`
// (as the bloom is). The caller disposes its geometry (mesh.geometry,
// mesh.dispose()); the material is shared.
export function glowSprites(points: { pos: THREE.Vector3; color: string; size: number }[]): THREE.InstancedMesh {
  const m = shared(materialKey("glow", "sprite"), () => {
    const mat = new THREE.MeshBasicMaterial({ map: glowDot(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    mat.onBeforeCompile = (s) => {
      s.uniforms.uNeon = neonUniforms.uNeon;
      s.vertexShader = s.vertexShader.replace(
        "#include <project_vertex>",
        // Facing the camera, and drawn toward it by its radius (keeping
        // its place and size on screen), so it never cuts into the
        // surface it glows over: no hard line where a wall meets it
        `vec4 centre = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float spriteSize = length(instanceMatrix[0].xyz);
        float pull = max(0.05, 1.0 - 0.5 * spriteSize / max(length(centre.xyz), 1e-3));
        vec4 mvPosition = vec4(centre.xyz * pull, 1.0);
        mvPosition.xy += position.xy * spriteSize * pull;
        gl_Position = projectionMatrix * mvPosition;`,
      );
      s.fragmentShader = `uniform float uNeon;\n${s.fragmentShader}`
        .replace("#include <color_fragment>", "#include <color_fragment>\n  diffuseColor.rgb *= 1.6 * smoothstep(0.35, 1.0, uNeon);")
        // Faded by the fog, not tinted by it (it's added on top)
        .replace(
          "#include <fog_fragment>",
          `#ifdef USE_FOG
            #ifdef FOG_EXP2
              gl_FragColor.rgb *= exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
            #else
              gl_FragColor.rgb *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
            #endif
          #endif`,
        );
    };
    mat.customProgramCacheKey = () => materialKey("glow", "sprite");
    return mat;
  });
  const geometry = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.InstancedMesh(geometry, m, Math.max(1, points.length));
  mesh.count = points.length;
  const at = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const c = new THREE.Color();
  points.forEach((p, i) => {
    mesh.setMatrixAt(i, at.compose(p.pos, q, s.setScalar(p.size)));
    mesh.setColorAt(i, c.set(toneColor(p.color)));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.renderOrder = 3;
  mesh.castShadow = mesh.receiveShadow = false;
  mesh.name = "glow-sprites";
  if (typeof matchMedia !== "undefined" && matchMedia(MORE_CONTRAST).matches) mesh.visible = false;
  return mesh;
}
