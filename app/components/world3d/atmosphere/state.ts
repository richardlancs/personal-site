import * as THREE from "three";

// What Atmosphere.tsx works out each frame for the falling weather
// (Precipitation.tsx): how much rain and snow, 0..1 of the full density
// (0 indoors), their colour in the current light, and the box in world
// coordinates where nothing falls (the station's canopy).
// The fountain's water is unlit (props.ts: waterMaterial): what it holds
// of the sky, and how much light falls on it, set by Atmosphere.tsx
export const waterUniforms = {
  uSkyTint: { value: new THREE.Color(1, 1, 1) },
  uLight: { value: 1 },
  uSkyNow: { value: new THREE.Color(1, 1, 1) }, // the sky low down, as it is now (what a wet pool holds)
};

// What's drawn over the painted scene, after the brushwork (Painterly.tsx):
// the rain and snow. Thin strokes would be smoothed away by the brushwork
// if they were part of the scene; on top, they stay strokes.
export const overlay = new THREE.Scene();

export const precip = {
  rain: 0,
  snow: 0,
  rainColor: new THREE.Color("#c9d3dc"),
  snowColor: new THREE.Color("#eef1f6"),
  shelterMin: new THREE.Vector3(1, 1, 1),
  shelterMax: new THREE.Vector3(-1, -1, -1),
};
