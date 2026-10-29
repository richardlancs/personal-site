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
    home: { pos: [1.4, 2.3, 16.5], target: [0, 2.7, -6] },
    enter: { pos: [0.3, 1.45, 27], target: [0, 2.2, 8] },
    exit: { pos: [0.3, 1.45, 27], target: [0, 2.2, 8] },
    focus: {
      board: { pos: [3.55, 1.72, 1.45], target: [4.35, 1.62, -1.6] },
    },
    frame: "center",
    threshold: "#e9cf9c",
    fog: { color: "#e6cfa2", near: 22, far: 125 },
    background: "#e6cfa2",
  },
  workshop: {
    offset: [400, 0, 0],
    home: { pos: [1.2, 1.85, 3.9], target: [-0.6, 1.15, -3] },
    enter: { pos: [0.2, 1.75, 8.5], target: [0, 1.5, 0] },
    exit: { pos: [0.2, 1.75, 8.5], target: [0, 1.5, 0] },
    focus: {
      "monitor-0": { pos: [-2.25, 1.47, -2.15], target: [-2.4, 1.37, -3.62] },
      "monitor-1": { pos: [1.95, 1.47, -2.15], target: [1.8, 1.37, -3.62] },
      toolwall: { pos: [-3.4, 1.75, 0.9], target: [-6.9, 1.65, 0.9] },
    },
    frame: "right",
    threshold: "#2a2118",
    fog: { color: "#b49a74", near: 7, far: 38 },
    background: "#b49a74",
  },
  station: {
    offset: [800, 0, 0],
    home: { pos: [5.5, 2.55, 2.4], target: [-1.5, 1.9, -1.6] },
    enter: { pos: [15, 2.4, 1.6], target: [4, 2.2, -0.5] },
    exit: { pos: [15, 2.4, 1.6], target: [4, 2.2, -0.5] },
    focus: {
      timetable: { pos: [-0.55, 2.4, 1.1], target: [-2.2, 2.05, -2.85] },
    },
    frame: "left",
    threshold: "#f1dcae",
    fog: { color: "#e6c896", near: 18, far: 90 },
    background: "#e6c896",
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
    threshold: "#221b26",
    fog: { color: "#7a6458", near: 6, far: 32 },
    background: "#7a6458",
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
    threshold: "#3a2a1c",
    fog: { color: "#a88e6c", near: 6, far: 34 },
    background: "#a88e6c",
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
    threshold: "#2f4a36",
    fog: { color: "#d9bf8f", near: 14, far: 70 },
    background: "#d9bf8f",
  },
};

// The camera's route from the park's main view to each place's door, in
// park coordinates, and where it looks at the end
export const routesFromPark: Partial<Record<SceneId, { path: V3[]; look: V3 }>> = {
  workshop: { path: [[-2.5, 2.2, 7], [-9.5, 2.0, -8], [-18.5, 1.9, -21.5]], look: [-23.5, 2.1, -29] },
  station: { path: [[0.9, 2.3, 3], [1.9, 2.5, -18], [3.5, 2.3, -36]], look: [4, 3.2, -47] },
  arcade: { path: [[5, 2.2, 6], [13.5, 2.0, -9.5], [22.5, 1.9, -20]], look: [27, 2.1, -25.5] },
  library: { path: [[-3.6, 2.1, 9], [-8.6, 1.9, 0.5], [-11, 1.8, -2.9]], look: [-14, 1.7, -6] },
  booth: { path: [[4.6, 2.0, 9.5], [7.6, 1.75, 5.2]], look: [9.5, 1.45, 1.6] },
};

// Which place each address shows, and what the camera looks at there.
// "monitor" and "cabinet" mean the one that's chosen (World3D resolves them).
export function sceneForPath(pathname: string): { scene: SceneId; focus: string | null } {
  switch (pathname) {
    case "/projects":
      return { scene: "workshop", focus: "monitor" };
    case "/experience":
      return { scene: "station", focus: null };
    case "/interests":
      return { scene: "arcade", focus: "cabinet" };
    case "/about":
      return { scene: "library", focus: "notebook" };
    case "/contact":
      return { scene: "booth", focus: null };
    case "/map":
      return { scene: "park", focus: "board" };
    default:
      return { scene: "park", focus: null };
  }
}

export const hrefFor: Record<Exclude<SceneId, "park">, string> = {
  workshop: "/projects",
  station: "/experience",
  arcade: "/interests",
  library: "/about",
  booth: "/contact",
};
