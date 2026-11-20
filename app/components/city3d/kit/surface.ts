import * as THREE from "three";
import { shared } from "./materials";
import { materialKey } from "./uniforms";

// The city's one lit material (Task 6 fills this in: MeshLambertMaterial +
// onBeforeCompile adding the fog and envUniforms, customProgramCacheKey
// per variant, from materialKey). For now a plain Lambert material with the
// same signature, so callers need not change when it does.
export type SurfaceOptions = { color: string; map?: THREE.Texture; wet?: number; snow?: boolean; grime?: number };

export function surface(o: SurfaceOptions): THREE.MeshLambertMaterial {
  const variant = [o.color, o.map?.uuid ?? "", o.wet ?? 0, o.snow ? 1 : 0, o.grime ?? 0].join("|");
  return shared(materialKey("surface", variant), () => new THREE.MeshLambertMaterial({ color: o.color, map: o.map ?? null }));
}
