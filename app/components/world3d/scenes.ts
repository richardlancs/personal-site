// The six places in the world: where each one is, how the camera arrives,
// where it looks, and the route from the park the camera flies to get
// there. Places are modelled in their own coordinates and sit far apart
// in one world (`offset`), past the fog, so only one is ever visible.

export type SceneId = "park" | "workshop" | "station" | "arcade" | "library" | "booth";
export type V3 = [number, number, number];
export type Pose = { pos: V3; target: V3 };

export type SceneDef = {
  offset: V3;
  home: Pose;
  // Where the camera is when it steps into the place, and where it backs
  // out to when leaving
  enter: Pose;
  exit: Pose;
  focus: Record<string, Pose>;
  // Which side of a wide screen the place is framed on, so the page's
  // content has the other side
  frame: "left" | "right" | "center";
  // The colour of the threshold: the dark doorway, the bright platform
  threshold: string;
  fog: { color: string; near: number; far: number };
  background: string;
};

export const scenes: Record<SceneId, SceneDef> = {
  park: {
    offset: [0, 0, 0],
    home: { pos: [1.4, 2.3, 16.5], target: [0, 5.2, -6] },
    enter: { pos: [0.3, 1.45, 27], target: [0, 2.2, 8] },
    exit: { pos: [0.3, 1.45, 27], target: [0, 2.2, 8] },
    focus: {
      board: { pos: [3.55, 1.72, 1.45], target: [4.35, 1.62, -1.6] },
    },
    frame: "center",
    threshold: "#e9e2d8",
    fog: { color: "#d7e4ec", near: 20, far: 135 },
    background: "#d7e4ec",
  },
  workshop: {
    offset: [400, 0, 0],
    home: { pos: [1.2, 1.85, 3.9], target: [-0.6, 1.15, -3] },
    enter: { pos: [0.2, 1.75, 8.5], target: [0, 1.5, 0] },
    exit: { pos: [0.2, 1.75, 8.5], target: [0, 1.5, 0] },
    focus: {
      "monitor-0": { pos: [-2.25, 1.47, -2.15], target: [-2.4, 1.37, -3.62] },
      "monitor-1": { pos: [1.25, 1.47, -2.15], target: [1.1, 1.37, -3.62] },
      "monitor-2": { pos: [2.65, 1.47, -2.15], target: [2.5, 1.37, -3.62] },
      "monitor-3": { pos: [5.35, 1.47, -2.15], target: [5.2, 1.37, -3.62] },
      toolwall: { pos: [-3.4, 1.75, 0.9], target: [-6.9, 1.65, 0.9] },
    },
    frame: "right",
    threshold: "#221c3e",
    fog: { color: "#c1b19e", near: 7, far: 38 },
    background: "#c1b19e",
  },
  station: {
    offset: [800, 0, 0],
    home: { pos: [6.2, 2.5, -0.5], target: [-2.2, 2.0, -2.6] },
    enter: { pos: [15, 2.4, -0.6], target: [4, 2.2, -1.6] },
    exit: { pos: [15, 2.4, -0.6], target: [4, 2.2, -1.6] },
    focus: {
      timetable: { pos: [-1.6, 2.35, 1.25], target: [-2.25, 2.05, -2.85] },
    },
    frame: "left",
    threshold: "#efe7dc",
    fog: { color: "#d8e4ea", near: 18, far: 100 },
    background: "#d8e4ea",
  },
  arcade: {
    offset: [1200, 0, 0],
    home: { pos: [-1.2, 1.75, 3.4], target: [0.6, 1.3, -3] },
    enter: { pos: [-0.5, 1.75, 8.2], target: [0, 1.5, 0] },
    exit: { pos: [-0.5, 1.75, 8.2], target: [0, 1.5, 0] },
    focus: {
      "cabinet-0": { pos: [-3.4, 1.62, -1.15], target: [-3.6, 1.42, -3.3] },
      "cabinet-1": { pos: [-1.05, 1.62, -1.15], target: [-1.2, 1.42, -3.3] },
      "cabinet-2": { pos: [1.35, 1.62, -1.15], target: [1.2, 1.42, -3.3] },
      "cabinet-3": { pos: [3.75, 1.62, -1.15], target: [3.6, 1.42, -3.3] },
    },
    frame: "right",
    threshold: "#1a1452",
    fog: { color: "#6e6482", near: 6, far: 32 },
    background: "#6e6482",
  },
  library: {
    offset: [1600, 0, 0],
    home: { pos: [-1.5, 1.8, 2.8], target: [0.9, 0.95, -1.3] },
    enter: { pos: [-0.4, 1.75, 7.5], target: [0.4, 1.3, -1] },
    exit: { pos: [-0.4, 1.75, 7.5], target: [0.4, 1.3, -1] },
    focus: {
      notebook: { pos: [1.15, 1.62, -0.2], target: [1.2, 0.82, -1.3] },
    },
    frame: "left",
    threshold: "#2a2140",
    fog: { color: "#b3a28c", near: 6, far: 34 },
    background: "#b3a28c",
  },
  booth: {
    offset: [2000, 0, 0],
    home: { pos: [1.9, 1.75, 4.6], target: [0, 1.35, 0] },
    enter: { pos: [4.5, 2.1, 10.5], target: [0, 1.5, 0] },
    exit: { pos: [4.5, 2.1, 10.5], target: [0, 1.5, 0] },
    focus: {
      phone: { pos: [0.08, 1.6, 0.95], target: [0, 1.42, -0.4] },
    },
    frame: "right",
    threshold: "#24306a",
    fog: { color: "#dbe4e8", near: 14, far: 80 },
    background: "#dbe4e8",
  },
};

// The camera's route from the park's main view to each place's door, in
// park coordinates, and where it looks at the end
export const routesFromPark: Partial<Record<SceneId, { path: V3[]; look: V3 }>> = {
  workshop: { path: [[2, 2.2, 7], [8, 2.0, -9], [13.2, 1.9, -19.5]], look: [15.6, 2.1, -26.5] },
  station: { path: [[0.9, 2.3, 3], [1.9, 2.5, -18], [3.5, 2.3, -36]], look: [4, 3.2, -47] },
  arcade: { path: [[-2.5, 2.2, 5], [-5.5, 2.0, -12], [-7.5, 1.9, -22.5]], look: [-9.5, 2.1, -28] },
  library: { path: [[-2.6, 2.1, 9], [-6.2, 1.9, 0], [-8.2, 1.8, -4.5]], look: [-11, 1.7, -9] },
  booth: { path: [[4.6, 2.0, 9.5], [7.6, 1.75, 5.2]], look: [9.5, 1.45, 1.6] },
};

// Which scene each address shows, and what the camera looks at there, is
// in the section registry (sections/registry.ts: `scene`).
