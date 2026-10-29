// The park and the places it leads to.
//
// The park is one painting (app/assets/park/park-v04.png, 1536 × 1024).
// Everything placed on it uses the painting's own pixels, so hotspots stay
// on their painted objects at any screen size. Source art and its history:
// docs/art/park/.

export const PAINTING = { width: 1536, height: 1024 };

// [left, top, right, bottom] in painting pixels
export type Box = [number, number, number, number];

export type Place = {
  id: string;
  name: string; // the place in the park
  section: string; // what's there
  href: string;
  summary: string; // one line for the map
  box: Box; // the painted object
  // Where to aim the painting in this place's page header (percent)
  view: { x: number; y: number };
};

export const places: Place[] = [
  {
    id: "pavilion",
    name: "The pavilion",
    section: "About",
    href: "/about",
    summary: "Who I am and what I'm working toward.",
    box: [15, 389, 407, 604],
    view: { x: 12, y: 52 },
  },
  {
    id: "workshop",
    name: "The workshop",
    section: "Projects",
    href: "/projects",
    summary: "The software I've built, and the tools I build it with.",
    box: [338, 266, 591, 369],
    view: { x: 30, y: 30 },
  },
  {
    id: "station",
    name: "The station",
    section: "Experience",
    href: "/experience",
    summary: "Where I've worked and studied.",
    box: [837, 123, 899, 348],
    view: { x: 56, y: 22 },
  },
  {
    id: "greenhouse",
    name: "The greenhouse",
    section: "Interests",
    href: "/interests",
    summary: "What I do away from the keyboard.",
    box: [1190, 297, 1390, 440],
    view: { x: 84, y: 36 },
  },
  {
    id: "booth",
    name: "The phone booth",
    section: "Contact",
    href: "/contact",
    summary: "Email, GitHub and LinkedIn.",
    box: [1293, 401, 1441, 711],
    view: { x: 89, y: 54 },
  },
];

// The notice board in the middle of the park opens the map
export const noticeBoard: Box = [942, 412, 1104, 566];

export const placeById = (id: string) => places.find((place) => place.id === id)!;
