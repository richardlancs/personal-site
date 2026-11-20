import * as THREE from "three";
import { materialKey } from "./uniforms";

// Where the city's materials live: one cache for the whole canvas, keyed by
// materialKey() (uniforms.ts), so two scenes asking for the same material
// get the same object, compile one program, and nobody disposes a material
// another scene still uses. Only the kit's factories (surface.ts,
// windows.ts, neon.ts, and invisibleMaterial below) call `shared`; scenes
// call the factories and never create a three.js material themselves
// (tests/city3d-contract.test.mjs).
//
// Disposal is central: City3D.tsx calls disposeShared() when the canvas
// goes away. Scenes dispose their own geometry and textures, never a
// shared material.
const cache = new Map<string, THREE.Material>();

export function shared<T extends THREE.Material>(key: string, make: () => T): T {
  let m = cache.get(key) as T | undefined;
  if (!m) {
    m = make();
    m.name ||= key;
    cache.set(key, m);
  }
  return m;
}

// Every shared material (and any map it holds that the kit made) is
// disposed, and the cache emptied
export function disposeShared() {
  for (const m of cache.values()) {
    const map = (m as THREE.MeshBasicMaterial).map;
    if (map && map.userData.kitOwned) map.dispose();
    m.dispose();
  }
  cache.clear();
}

// How many shared materials exist (for the measuring scripts)
export const sharedCount = () => cache.size;

// What a Hitbox (common.tsx) is drawn with: nothing
export const invisibleMaterial = () => shared(materialKey("hit", "invisible"), () => new THREE.MeshBasicMaterial({ visible: false }));
