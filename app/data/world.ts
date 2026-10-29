// The park and the places it leads to.
//
// The park is one painting (app/assets/park/park-v04.png, 1536 × 1024),
// cut into layers that move (app/assets/park/layers, made by
// scripts/art/layers.mjs). Everything placed on it uses the painting's own
// pixels, so hotspots stay on their painted objects at any screen size.
// Source art and its history: docs/art/park/.

export const PAINTING = { width: 1536, height: 1024 };

// [left, top, right, bottom] in painting pixels
export type Box = [number, number, number, number];

// Where the camera looks. `x`/`y`: the point it looks at (painting pixels).
// `zoom`: how far it pushes in. `at`: where that point ends up on a wide
// screen, as fractions of the screen, so the page's content has room on
// the other side. Phones always centre it.
export type Camera = { x: number; y: number; zoom: number; at: [number, number] };

export type Place = {
  id: string;
  name: string; // the place in the park
  section: string; // what's there
  href: string;
  summary: string; // one line for the map and the places list
  box: Box; // the painted object
  camera: Camera;
  // The painted light that comes on when you look at the place
  light?: Box;
};

export const places: Place[] = [
  {
    id: "pavilion",
    name: "The pavilion",
    section: "About",
    href: "/about",
    summary: "A notebook left open on the bench. Who I am and what I'm working toward.",
    box: [15, 389, 407, 604],
    camera: { x: 210, y: 500, zoom: 1.75, at: [0.27, 0.56] },
    light: [118, 505, 198, 552],
  },
  {
    id: "workshop",
    name: "The workshop",
    section: "Projects",
    href: "/projects",
    summary: "Old screens on a workbench. The software I've built, and my tools.",
    box: [338, 266, 591, 369],
    camera: { x: 465, y: 318, zoom: 1.6, at: [0.5, 0.2] },
    light: [340, 290, 590, 365],
  },
  {
    id: "station",
    name: "The station",
    section: "Experience",
    href: "/experience",
    summary: "The timetable under the clock tower. Where I've worked and studied.",
    box: [837, 123, 899, 348],
    camera: { x: 868, y: 236, zoom: 1.65, at: [0.25, 0.45] },
    light: [846, 180, 892, 222],
  },
  {
    id: "greenhouse",
    name: "The greenhouse",
    section: "Interests",
    href: "/interests",
    summary: "Labels in the planting beds. What I do away from the keyboard.",
    box: [1190, 297, 1390, 440],
    camera: { x: 1290, y: 372, zoom: 1.7, at: [0.74, 0.36] },
    light: [1195, 340, 1385, 435],
  },
  {
    id: "booth",
    name: "The phone booth",
    section: "Contact",
    href: "/contact",
    summary: "The line still works. Email, GitHub and LinkedIn.",
    box: [1293, 401, 1441, 711],
    camera: { x: 1372, y: 572, zoom: 1.95, at: [0.68, 0.52] },
    light: [1338, 468, 1414, 700],
  },
];

// The notice board in the middle of the park opens the map (/map)
export const noticeBoard = {
  box: [942, 412, 1104, 566] as Box,
  camera: { x: 1023, y: 478, zoom: 2.1, at: [0.5, 0.5] } as Camera,
};

// The receiver of the phone in the booth (it lifts on /contact)
export const receiver: Box = [1356, 542, 1380, 602];

// Small things to look at in the park. They don't lead anywhere; they're
// there for anyone who looks around. Nothing here is about Richard.
export type Discovery = {
  id: string;
  name: string;
  box: Box;
  note: string;
  label?: "below";
};

export const discoveries: Discovery[] = [
  {
    id: "bicycle",
    name: "The bicycle",
    box: [150, 645, 412, 785],
    note: "Leaned against the railing and never collected. Ivy has taken the back wheel.",
  },
  {
    id: "swing",
    name: "The swing",
    box: [455, 540, 605, 655],
    note: "It still swings, a little, when the wind comes through.",
  },
  {
    id: "signpost",
    name: "The signpost",
    box: [838, 424, 940, 540],
    note: "The arrows still point the way: the workshop to the west, the station up past the towers, the greenhouse to the east.",
  },
  {
    id: "fountain",
    name: "The fountain",
    box: [660, 640, 1150, 755],
    note: "It stopped running long ago. Rain still collects in the basin and holds a little of the sky.",
    label: "below",
  },
  {
    id: "bench",
    name: "The bench",
    box: [1165, 728, 1395, 850],
    note: "Someone left a bag on the bench, as if they meant to be right back.",
    label: "below",
  },
];

// Which scene a URL shows: the park, the map, or one of the places
export type SceneId = "park" | "map" | Place["id"];

export function sceneFor(pathname: string): SceneId {
  if (pathname === "/map") return "map";
  return places.find((place) => place.href === pathname)?.id ?? "park";
}

export function cameraFor(scene: SceneId): Camera | null {
  if (scene === "park") return null;
  if (scene === "map") return noticeBoard.camera;
  return placeById(scene).camera;
}

export const placeById = (id: string) => places.find((place) => place.id === id)!;
