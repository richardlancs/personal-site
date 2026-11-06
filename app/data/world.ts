// The places in the world and what's in each. The 3D scenes themselves
// are in app/components/world3d/ (scenes.ts says where each one is).

export type Place = {
  id: "pavilion" | "workshop" | "station" | "arcade" | "booth";
  name: string; // the place in the world
  section: string; // what's there
  href: string;
  summary: string; // what's there, in one line (the flat layout's lists)
};

export const places: Place[] = [
  {
    id: "pavilion",
    name: "The pavilion",
    section: "About",
    href: "/about",
    summary: "Who I am and what I'm working toward.",
  },
  {
    id: "workshop",
    name: "The workshop",
    section: "Projects",
    href: "/projects",
    summary: "The software I've built, and my tools.",
  },
  {
    id: "station",
    name: "The station",
    section: "Experience",
    href: "/experience",
    summary: "Where I've worked and studied.",
  },
  {
    id: "arcade",
    name: "The arcade",
    section: "Interests",
    href: "/interests",
    summary: "What I do away from the keyboard.",
  },
  {
    id: "booth",
    name: "The phone booth",
    section: "Contact",
    href: "/contact",
    summary: "Email, GitHub, LinkedIn and my résumé.",
  },
];

export const placeById = (id: Place["id"]) => places.find((place) => place.id === id)!;
