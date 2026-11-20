"use client";

import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useSyncExternalStore } from "react";
import { HalfFloatType } from "three";
import { TIERS, type Quality } from "./tiers";

// The picture's last steps on the desktop tiers: bloom by threshold (only
// what is brighter than 1.0 glows: the neon, a later task; nothing lit
// reaches it), then neutral tone mapping, drawn through a HalfFloat target
// (the composer sets the renderer's own tone mapping to none while it is
// mounted). The mobile tier has no composer: the renderer tone-maps
// (City3D.tsx: onCreated). Under `prefers-contrast: more` there is no
// bloom. Nothing else: no grain, scanlines or other effects.
const MORE_CONTRAST = "(prefers-contrast: more)";
const subscribe = (onChange: () => void) => {
  const query = matchMedia(MORE_CONTRAST);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const moreContrast = () => matchMedia(MORE_CONTRAST).matches;

export default function Post({ tier }: { tier: Quality }) {
  const contrast = useSyncExternalStore(subscribe, moreContrast, () => false);
  const t = TIERS[tier];
  if (tier === "mobile" || !t.bloom) return null;
  const bloom = t.bloom;
  return (
    <EffectComposer multisampling={t.msaa} frameBufferType={HalfFloatType}>
      {[
        ...(contrast
          ? []
          : [
              <Bloom
                key="bloom"
                mipmapBlur
                luminanceThreshold={bloom.threshold}
                luminanceSmoothing={bloom.smoothing}
                levels={bloom.levels}
                resolutionScale={bloom.scale}
                intensity={0.8}
              />,
            ]),
        <ToneMapping key="tone" mode={ToneMappingMode.NEUTRAL} />,
      ]}
    </EffectComposer>
  );
}
