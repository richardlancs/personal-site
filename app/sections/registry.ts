import type { Metadata } from "next";
import type { GlyphId } from "../components/world/glyphs";
import type { SceneId } from "../components/world3d/scenes";

// The sections of the site, and everything the rest of the site needs to
// know about each one: its address, its name, its place in the park, how
// it's drawn on the map and the painting, which scene the camera goes to.
// The Places menu, the home page's list, the map, the name tags
// in the world and the "Other sections" links are all generated from this
// list, so adding a section means adding an entry here and a page for it
// (docs/adding-a-section.md). Nothing else has to change.
//
// The words themselves (projects, experience, the notebook) stay in
// app/data/portfolio.ts; this is only the sections' metadata.

export type SectionId = "home" | "about" | "projects" | "experience" | "interests" | "contact" | "map";

export type Section = {
  id: SectionId;
  href: `/${string}`;
  title: string; // the section: "About"
  place: string; // where it is in the park: "The pavilion"
  summary: string; // one line, for lists
  glyph: GlyphId; // its drawing, from the map (components/world/PlaceGlyph.tsx)
  // In the menu, the lists and the map. A section
  // that isn't listed still has its page; it's just not pointed at.
  listed: boolean;
  // The sign at the top of the page: a line about the place, and (on
  // wide screens, where there's something to choose) how to use it
  intro?: string;
  hint?: string;
  // Which side of a wide screen the page sits on; the camera frames the
  // place on the other (world3d/scenes.ts)
  side: "left" | "right" | "middle";
  // The 3D world, on wide screens: the scene the camera goes to and what
  // it looks at there. "monitor" and "cabinet" mean the one that's chosen.
  scene: { id: SceneId; focus: string | null };
  // The park's name tag for this section, if it has a building there
  // (world3d/scenes/Park.tsx keeps the positions, by this key)
  anchor?: "library" | "workshop" | "station" | "arcade" | "booth" | "board";
  // Its pin on the map sheet (percent). `label`: where the name goes on
  // small sheets, where neighbours would otherwise overlap
  map?: { x: number; y: number; label?: "right" | "side" | "below" };
  // Deeper links inside the section, for the menu
  subsections?: { title: string; place: string; href: `/${string}` }[];
  metadata: { title: string; description: string };
};

export const sections: Section[] = [
  {
    id: "home",
    href: "/",
    title: "Home",
    place: "The park",
    summary: "My name, what I do, and the way to everything else.",
    glyph: "board",
    listed: true,
    side: "middle",
    scene: { id: "park", focus: null },
    metadata: {
      title: "Richard Lan | Software Engineering Portfolio",
      description: "Portfolio of Richard Lan, a Computer Science student at the University of Waterloo seeking software engineering internship and co-op roles.",
    },
  },
  {
    id: "about",
    href: "/about",
    title: "About",
    place: "The pavilion",
    summary: "Who I am and what I'm working toward.",
    glyph: "pavilion",
    listed: true,
    intro: "A notebook someone left open on the desk, by the lit window.",
    side: "right",
    scene: { id: "library", focus: "notebook" },
    anchor: "library",
    map: { x: 16, y: 55.5 },
    metadata: { title: "About", description: "About Richard Lan, a Computer Science student at the University of Waterloo." },
  },
  {
    id: "projects",
    href: "/projects",
    title: "Projects",
    place: "The workshop",
    summary: "The software I've built, and my tools.",
    glyph: "workshop",
    listed: true,
    intro: "Old screens on the benches, still wired up.",
    hint: "Choose one to switch it on.",
    side: "left",
    scene: { id: "workshop", focus: "monitor" },
    anchor: "workshop",
    map: { x: 66.7, y: 23.5, label: "below" },
    subsections: [{ title: "Skills", place: "The workshop's tool wall", href: "/projects#skills" }],
    metadata: { title: "Projects", description: "Software projects by Richard Lan, with screenshots, code and live demos." },
  },
  {
    id: "experience",
    href: "/experience",
    title: "Experience",
    place: "The station",
    summary: "Where I've worked and studied.",
    glyph: "station",
    listed: true,
    intro: "Work and education, on the old timetable.",
    hint: "Select a role to read details.",
    side: "right",
    scene: { id: "station", focus: "timetable" },
    anchor: "station",
    map: { x: 52, y: 13, label: "side" },
    metadata: { title: "Experience", description: "Richard Lan's experience and education." },
  },
  {
    id: "interests",
    href: "/interests",
    title: "Interests",
    place: "The arcade",
    summary: "What I do away from the keyboard.",
    glyph: "arcade",
    listed: true,
    intro: "The power came back on in a few of the cabinets.",
    hint: "Choose an interest to explore.",
    side: "left",
    scene: { id: "arcade", focus: "cabinet" },
    anchor: "arcade",
    // The arcade stands to the left of the park, past the pavilion; the
    // map follows the world
    map: { x: 38, y: 21, label: "below" },
    metadata: { title: "Interests", description: "What Richard Lan does away from the keyboard." },
  },
  {
    id: "contact",
    href: "/contact",
    title: "Contact",
    place: "The phone booth",
    summary: "Email, GitHub, LinkedIn and my résumé.",
    glyph: "booth",
    listed: true,
    intro: "The light inside still comes on, and the line still works.",
    side: "left",
    scene: { id: "booth", focus: null },
    anchor: "booth",
    map: { x: 85, y: 60.5 },
    metadata: { title: "Contact", description: "How to reach Richard Lan: email, GitHub, LinkedIn and résumé." },
  },
  {
    id: "map",
    href: "/map",
    title: "Map",
    place: "The notice board",
    summary: "Every section on one sheet, drawn in ink.",
    glyph: "board",
    listed: true,
    side: "middle",
    scene: { id: "park", focus: "board" },
    anchor: "board",
    metadata: { title: "Map of the park", description: "A map of the park and every place in it: about, projects, experience, interests and contact." },
  },
];

export const section = (id: SectionId): Section => sections.find((s) => s.id === id)!;

// The sections that are pointed at: in the menu, the lists and the map
export const listed = sections.filter((s) => s.listed);

// The places in the park, in the order they're listed: every listed
// section except home
export const places = listed.filter((s) => s.id !== "home");

// Which section an address shows (the park for anything unknown, so the
// not-found page still has a world behind it)
export const sectionForPath = (pathname: string): Section => sections.find((s) => s.href === pathname) ?? section("home");

// The section a building in the park leads to
export const sectionForAnchor = (anchor: NonNullable<Section["anchor"]>): Section | undefined => sections.find((s) => s.anchor === anchor);

// Where the site is published. Canonical addresses, the sitemap, robots.txt
// and the share cards are all made absolute from this (layout.tsx sets it
// as metadataBase). Change it here if the site moves to its own domain.
export const siteUrl = "https://personal-site-flame-eight-52.vercel.app";
export const siteName = "Richard Lan";

// The picture on share cards: the painting with my name on it
// (public/share-card.jpg, drawn by scripts/identity/make-identity.mjs).
// Named on every page, because a page's openGraph replaces its parent's
// whole, pictures included.
const shareCard = {
  url: "/share-card.jpg",
  width: 1200,
  height: 630,
  alt: "Richard Lan, CS student at the University of Waterloo: software engineering portfolio, over a painting of an overgrown park in autumn light.",
};

// Page metadata, from the registry: its title and description, its
// canonical address, and the same for share cards.
export const sectionMetadata = (id: SectionId): Metadata => {
  const s = section(id);
  const title = s.id === "home" ? s.metadata.title : `${s.metadata.title} | ${siteName}`;
  return {
    title: s.metadata.title,
    description: s.metadata.description,
    alternates: { canonical: s.href },
    openGraph: { type: "website", siteName, url: s.href, title, description: s.metadata.description, images: [shareCard] },
    twitter: { card: "summary_large_image", title, description: s.metadata.description, images: [shareCard] },
    ...(s.listed ? {} : { robots: { index: false, follow: false } }),
  };
};
