"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { BloomEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { HalfFloatType, NoToneMapping, Vector2 } from "three";
import { bloomStrength } from "./atmosphere/looks";
import { neonUniforms } from "./kit/uniforms";
import { TIERS, type Quality } from "./tiers";

// The picture's last steps on the desktop tiers: bloom by threshold (only
// what is brighter than 1.0 glows: the neon, a later task; nothing lit
// reaches it), then neutral tone mapping, drawn through a HalfFloat target
// (the renderer's own tone mapping is none while this is mounted). The
// mobile tier has no composer: the renderer tone-maps (City3D.tsx:
// onCreated). Under `prefers-contrast: more` there is no bloom. Nothing
// else: no grain, scanlines or other effects.
//
// Bloom's strength follows the neon (atmosphere/looks.ts: bloomStrength,
// from neonUniforms.uNeon, which the atmosphere writes): faint by day, full
// at night, a little less on the low tier. A step from high to low (or
// back) changes only the bloom's resolution scale and the composer's
// multisampling, on the same composer and passes: the level count is one
// for both tiers (BLOOM_LEVELS; tiers.ts gives low 4, which would rebuild
// the blur's chain), so nothing is compiled. The renderer's exposure is
// the mobile tier's 1.12 here too: the ToneMapping effect's shader takes
// the renderer's toneMappingExposure (three's tonemapping_pars_fragment).
//
// Built on `postprocessing` itself, not its React wrapper
// (@react-three/postprocessing): the wrapper is one file that imports
// every effect it offers, and with them n8ao (an ambient-occlusion pass
// with a bundled denoising model) and maath, which no tree shaking
// removed from the 3D chunk (measured in the wave 1 fix report). This
// does what the wrapper's EffectComposer does for these three effects:
// one composer per renderer, scene and camera, resized with the renderer,
// drawing in a frame callback of priority 1 (which takes over drawing
// from R3F), auto-clear off around it, the renderer's tone mapping none.
const MORE_CONTRAST = "(prefers-contrast: more)";
const subscribe = (onChange: () => void) => {
  const query = matchMedia(MORE_CONTRAST);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const moreContrast = () => matchMedia(MORE_CONTRAST).matches;
const BLOOM_LEVELS = TIERS.high.bloom!.levels;
// In development, ?bloom=0 draws without bloom (for measuring what bloom
// adds; the panel half must not change by more than 3/255 under snow by day)
const bloomOff = () => process.env.NODE_ENV === "development" && new URLSearchParams(location.search).get("bloom") === "0";

export default function Post({ tier }: { tier: Quality }) {
  if (tier === "mobile" || !TIERS[tier].bloom) return null;
  return <Composer tier={tier} />;
}

const size = new Vector2();

function Composer({ tier }: { tier: Exclude<Quality, "mobile"> }) {
  const { gl, scene, camera } = useThree();
  const contrast = useSyncExternalStore(subscribe, moreContrast, () => false);

  // Built once per renderer, scene and camera (and when the contrast
  // preference changes); the tier is applied to it below
  const { composer, bloom } = useMemo(() => {
    const first = TIERS.high.bloom!;
    const c = new EffectComposer(gl, { multisampling: TIERS.high.msaa, frameBufferType: HalfFloatType });
    c.addPass(new RenderPass(scene, camera));
    const glow = contrast || bloomOff()
      ? null
      : new BloomEffect({
          mipmapBlur: true,
          luminanceThreshold: first.threshold,
          luminanceSmoothing: first.smoothing,
          levels: BLOOM_LEVELS,
          resolutionScale: first.scale,
          intensity: bloomStrength(neonUniforms.uNeon.value, "high"),
        });
    c.addPass(new EffectPass(camera, ...(glow ? [glow] : []), new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL })));
    return { composer: c, bloom: glow };
  }, [gl, scene, camera, contrast]);
  useEffect(() => () => composer.dispose(), [composer]);

  // The tier: the composer's multisampling and the bloom's resolution
  // (neither compiles a program)
  useEffect(() => {
    const t = TIERS[tier];
    if (composer.multisampling !== t.msaa) composer.multisampling = t.msaa;
    if (bloom) bloom.resolution.scale = t.bloom!.scale;
  }, [composer, bloom, tier]);

  // The scene's programs are compiled for a target with no tone mapping
  // (the ToneMapping effect does it), before anything else draws or warms
  // (City3D.tsx: Warm, mounted after this)
  useLayoutEffect(() => {
    const before = gl.toneMapping;
    const exposure = gl.toneMappingExposure;
    gl.toneMapping = NoToneMapping;
    gl.toneMappingExposure = 1.12;
    return () => {
      gl.toneMapping = before;
      gl.toneMappingExposure = exposure;
    };
  }, [gl]);

  // (sized on its first frame, and whenever the renderer's size or pixel
  // ratio changes)
  const applied = useRef({ composer: null as EffectComposer | null, w: -1, h: -1, dpr: -1 });
  useFrame((_, delta) => {
    gl.getSize(size);
    const dpr = gl.getPixelRatio();
    const a = applied.current;
    if (a.composer !== composer || size.x !== a.w || size.y !== a.h || dpr !== a.dpr) {
      composer.setSize(size.x, size.y);
      applied.current = { composer, w: size.x, h: size.y, dpr };
    }
    if (bloom) bloom.intensity = bloomStrength(neonUniforms.uNeon.value, tier);
    const autoClear = gl.autoClear;
    gl.autoClear = true;
    composer.render(delta);
    gl.autoClear = autoClear;
  }, 1);
  return null;
}
