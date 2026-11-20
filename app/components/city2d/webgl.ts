// Whether this browser could draw the 3D city: it has WebGL2 at all. Cheap
// and side-effect free: it creates no context (the city's own shell probes
// for real, later, and falls back to the plate if that fails).
export function mayDrawWebGL(): boolean {
  return typeof WebGL2RenderingContext !== "undefined";
}
