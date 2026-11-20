import * as THREE from "three";
import { shared } from "./materials";
import { materialKey } from "./uniforms";

// Towers' windows, drawn in the fragment shader (Task 6 fills this in:
// reads windowUniforms and envUniforms.uNight; `far` gets its own program,
// "win:far" / "win:near"). For now a plain Lambert material in the base
// colour, with the same signature.
export type WindowOptions = { base: string; glass: string; far?: boolean };

export function windowMaterial(o: WindowOptions): THREE.MeshLambertMaterial {
  return shared(materialKey("win", `${o.far ? "far" : "near"}:${o.base}:${o.glass}`), () => new THREE.MeshLambertMaterial({ color: o.base }));
}
