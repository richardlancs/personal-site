import * as THREE from "three";

// What Atmosphere.tsx works out for the falling weather (Precipitation.tsx):
// how much rain and snow, 0..1 of the full density, and their colour in
// the current light. Written when the look changes, read every frame.
export const precip = {
  rain: 0,
  snow: 0,
  rainColor: new THREE.Color("#9fb0c8"),
  snowColor: new THREE.Color("#eef1f6"),
};
