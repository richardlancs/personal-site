import * as THREE from "three";

// Points in the world that have an HTML link or label pinned to them,
// named "<scene id>:<name>" (common.tsx: anchorKey), and "sign:<section
// id>" for the riverside's boards (City3D.tsx: TagProjector lays a link
// over each). Scenes set them in an effect and delete them in its cleanup.
export const anchors = new Map<string, THREE.Vector3>();

// Whether every one of Home's boards, as drawn, is inside the free part of
// the screen (City3D.tsx: TagProjector, each frame it places the links;
// Riverside.tsx shows the boards on the narrow layout only then)
export const boardsIn = { value: true };
