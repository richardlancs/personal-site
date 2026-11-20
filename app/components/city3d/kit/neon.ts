import * as THREE from "three";
import { shared } from "./materials";
import { materialKey } from "./uniforms";

// Neon and screens (Task 7 fills this in: tone × neonUniforms.uNeon ×
// NEON_HDR in onBeforeCompile, toneMapped false, `dayColor` by day). For
// now plain unlit materials with the same signatures, so callers need not
// change when it does.

// Above the bloom threshold (1.0), which nothing lit reaches
export const NEON_HDR = 3;

// The night plates' three neon tones: scene colours, not interface tokens
export const SCENE_TONES = { cyan: "#4fd8ee", rose: "#f062b4", gold: "#ffb454" } as const;
export type SceneTone = keyof typeof SCENE_TONES;

const toneColor = (tone: SceneTone | string) => (tone in SCENE_TONES ? SCENE_TONES[tone as SceneTone] : tone);

export function neonMaterial(tone: SceneTone | string, o: { dayColor?: string } = {}): THREE.MeshBasicMaterial {
  const color = toneColor(tone);
  return shared(materialKey("neon", `${color}:${o.dayColor ?? ""}`), () => new THREE.MeshBasicMaterial({ color }));
}

// A face drawn on a canvas (a sign's board, a screen): `draw` paints it at
// w × h pixels, again whenever `redraw` is called on the result's map
// (material.userData.redraw), e.g. once the display face has loaded. One
// material per `key`.
export function screenMaterial(draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, o: { w: number; h: number; key: string }): THREE.MeshBasicMaterial {
  return shared(materialKey("screen", o.key), () => {
    const canvas = document.createElement("canvas");
    canvas.width = o.w;
    canvas.height = o.h;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.userData.kitOwned = true;
    const paint = () => {
      draw(canvas.getContext("2d")!, o.w, o.h);
      texture.needsUpdate = true;
    };
    paint();
    const m = new THREE.MeshBasicMaterial({ map: texture });
    m.userData.redraw = paint;
    return m;
  });
}
