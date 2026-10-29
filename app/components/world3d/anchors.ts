import * as THREE from "three";

// Points in the world that have an HTML label or link pinned to them.
// Scenes register them; the label layer (Labels.tsx) finds the elements
// by `data-anchor` and moves them to these points every frame.
export const anchors = new Map<string, THREE.Vector3>();
