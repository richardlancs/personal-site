import type { Metadata } from "next";
import type { SceneId } from "../components/world3d/scenes";

// The sections of the site, and everything the rest of the site needs to
// know about each one: its anchor on the one page, its name and the
// district painted above it. The Sections menu and the progress line are
// generated from this list, and both name a section by its title.
//
// The words themselves (projects, experience, the notebook) stay in
// app/data/portfolio.ts; this is only the sections' metadata.

export type SectionId = "home" | "about" | "projects" | "experience" | "interests" | "contact";

// The six districts of the city, one per section (docs/city/style.md,
// docs/superpowers/specs/2026-11-19-shanghai-cyberpunk-design.md)
export type DistrictId = "lujiazui" | "longtang" | "towers" | "metro" | "nanjing-road" | "bund";

export type Section = {
  id: SectionId;
  // The section's anchor on `/` ("" for home, which is the top of the page)
  hash: string;
  href: "/" | `/#${string}`;
  title: string; // the section: "About"
  summary: string; // one line, for lists
  // In the menu and the lists. A section that isn't listed is still on
  // the page; it's just not pointed at.
  listed: boolean;
  district: DistrictId; // the painting above it (never named on the page)
  // The 3D city (a later plan): the scene a section belongs to
  scene: { id: SceneId; focus: string | null };
  // Deeper anchors inside the section, for the menu
  subsections?: { title: string; href: `/#${string}` }[];
  metadata: { title: string; description: string };
};

// In page order: the sections are numbered 01 to 06 down the page
export const pageSections: Section[] = [
  {
    id: "home",
    hash: "",
    href: "/",
    title: "Home",
    summary: "My name, what I do, and the way to everything else.",
    listed: true,
    district: "lujiazui",
    scene: { id: "park", focus: null },
    metadata: {
      title: "Richard Lan | Software Engineering Portfolio",
      description: "Portfolio of Richard Lan, a Computer Science student at the University of Waterloo seeking software engineering internship and co-op roles.",
    },
  },
  {
    id: "about",
    hash: "about",
    href: "/#about",
    title: "About",
    summary: "Who I am and what I'm working toward.",
    listed: true,
    district: "longtang",
    scene: { id: "library", focus: "notebook" },
    metadata: { title: "About", description: "About Richard Lan, a Computer Science student at the University of Waterloo." },
  },
  {
    id: "projects",
    hash: "projects",
    href: "/#projects",
    title: "Projects",
    summary: "The software I've built, and my tools.",
    listed: true,
    district: "towers",
    scene: { id: "workshop", focus: "monitor" },
    subsections: [{ title: "Skills", href: "/#skills" }],
    metadata: { title: "Projects", description: "Software projects by Richard Lan, with screenshots, code and live demos." },
  },
  {
    id: "experience",
    hash: "experience",
    href: "/#experience",
    title: "Experience",
    summary: "Where I've worked and studied.",
    listed: true,
    district: "metro",
    scene: { id: "station", focus: "timetable" },
    metadata: { title: "Experience", description: "Richard Lan's experience and education." },
  },
  {
    id: "interests",
    hash: "interests",
    href: "/#interests",
    title: "Interests",
    summary: "What I do away from the keyboard.",
    listed: true,
    district: "nanjing-road",
    scene: { id: "arcade", focus: "cabinet" },
    metadata: { title: "Interests", description: "What Richard Lan does away from the keyboard." },
  },
  {
    id: "contact",
    hash: "contact",
    href: "/#contact",
    title: "Contact",
    summary: "Email, GitHub, LinkedIn and my résumé.",
    listed: true,
    district: "bund",
    scene: { id: "booth", focus: null },
    metadata: { title: "Contact", description: "How to reach Richard Lan: email, GitHub, LinkedIn and résumé." },
  },
];

// The same array, by the older name its readers use
export const sections = pageSections;

export const section = (id: SectionId): Section => pageSections.find((s) => s.id === id)!;

// A section's number, "01" to "06", in page order
export const sectionNumber = (s: Section): string => String(pageSections.indexOf(s) + 1).padStart(2, "0");

// The sections that are pointed at: in the menu and the lists
export const listed = pageSections.filter((s) => s.listed);

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

// The page's metadata, from the registry: its title and description, its
// canonical address, and the same for share cards. Only for home: every
// other section is an anchor on the same page, and an anchor ("/#about")
// is never a canonical address. (The other sections' `metadata` is kept
// for the 3D city's own pages, a later plan, which will read it.)
export const sectionMetadata = (id: "home"): Metadata => {
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
