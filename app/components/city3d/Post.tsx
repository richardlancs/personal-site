"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { BloomEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { HalfFloatType, NoToneMapping, Vector2 } from "three";
import { TIERS, type Quality } from "./tiers";

// The picture's last steps on the desktop tiers: bloom by threshold (only
// what is brighter than 1.0 glows: the neon, a later task; nothing lit
// reaches it), then neutral tone mapping, drawn through a HalfFloat target
// (the renderer's own tone mapping is none while this is mounted). The
// mobile tier has no composer: the renderer tone-maps (City3D.tsx:
// onCreated). Under `prefers-contrast: more` there is no bloom. Nothing
// else: no grain, scanlines or other effects.
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

export default function Post({ tier }: { tier: Quality }) {
  if (tier === "mobile" || !TIERS[tier].bloom) return null;
  return <Composer tier={tier} />;
}

const size = new Vector2();

function Composer({ tier }: { tier: Exclude<Quality, "mobile"> }) {
  const { gl, scene, camera } = useThree();
  const contrast = useSyncExternalStore(subscribe, moreContrast, () => false);
  const t = TIERS[tier];
  const bloom = t.bloom!;

  const composer = useMemo(() => {
    const c = new EffectComposer(gl, { multisampling: t.msaa, frameBufferType: HalfFloatType });
    c.addPass(new RenderPass(scene, camera));
    const effects = [
      ...(contrast
        ? []
        : [
            new BloomEffect({
              mipmapBlur: true,
              luminanceThreshold: bloom.threshold,
              luminanceSmoothing: bloom.smoothing,
              levels: bloom.levels,
              resolutionScale: bloom.scale,
              intensity: 0.8,
            }),
          ]),
      new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    ];
    c.addPass(new EffectPass(camera, ...effects));
    return c;
  }, [gl, scene, camera, t.msaa, bloom, contrast]);
  useEffect(() => () => composer.dispose(), [composer]);

  // The scene's programs are compiled for a target with no tone mapping
  // (the ToneMapping effect does it), before anything else draws or warms
  // (City3D.tsx: Warm, mounted after this)
  useLayoutEffect(() => {
    const before = gl.toneMapping;
    gl.toneMapping = NoToneMapping;
    return () => {
      gl.toneMapping = before;
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
    const autoClear = gl.autoClear;
    gl.autoClear = true;
    composer.render(delta);
    gl.autoClear = autoClear;
  }, 1);
  return null;
}
