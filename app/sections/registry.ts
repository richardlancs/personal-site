// The sections of the site, and everything the rest of the site needs to
// know about each one: its anchor on the one page, its name and the
// district painted above it. The Sections menu and the progress line are
// generated from this list, and both name a section by its title.
//
// The words themselves (projects, experience, the notebook) stay in
// app/data/portfolio.ts; this is only the sections' metadata. Each
// section's summary and its page metadata are in ./metadata.ts, read only
// on the server: this module is in every page's first load.

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
  // In the menu and the lists. A section that isn't listed is still on
  // the page; it's just not pointed at.
  listed: boolean;
  district: DistrictId; // the painting above it (never named on the page)
  // Its address in the 3D city (app/city/): its own page there
  city: "/city" | `/city/${string}`;
  // Deeper anchors inside the section, for the menu
  subsections?: { title: string; href: `/#${string}` }[];
};

// In page order: the sections are numbered 01 to 06 down the page
export const pageSections: Section[] = [
  {
    id: "home",
    city: "/city",
    hash: "",
    href: "/",
    title: "Home",
    listed: true,
    district: "lujiazui",
  },
  {
    id: "about",
    city: "/city/about",
    hash: "about",
    href: "/#about",
    title: "About",
    listed: true,
    district: "longtang",
  },
  {
    id: "projects",
    city: "/city/projects",
    hash: "projects",
    href: "/#projects",
    title: "Projects",
    listed: true,
    district: "towers",
    subsections: [{ title: "Skills", href: "/#skills" }],
  },
  {
    id: "experience",
    city: "/city/experience",
    hash: "experience",
    href: "/#experience",
    title: "Experience",
    listed: true,
    district: "metro",
  },
  {
    id: "interests",
    city: "/city/interests",
    hash: "interests",
    href: "/#interests",
    title: "Interests",
    listed: true,
    district: "nanjing-road",
  },
  {
    id: "contact",
    city: "/city/contact",
    hash: "contact",
    href: "/#contact",
    title: "Contact",
    listed: true,
    district: "bund",
  },
];

// The same array, by the older name its readers use
export const sections = pageSections;

export const section = (id: SectionId): Section => pageSections.find((s) => s.id === id)!;

// The sections that are pointed at: in the menu, the progress line and
// the numbering; an unlisted one is still on the page, unnumbered
export const listed = pageSections.filter((s) => s.listed);

// A section's number, "01" to "06", in page order among the listed ones
// ("" for one that isn't listed)
export const sectionNumber = (s: Section): string => (s.listed ? String(listed.indexOf(s) + 1).padStart(2, "0") : "");

// Where the site is published. Canonical addresses, the sitemap, robots.txt
// and the share cards are all made absolute from this (layout.tsx sets it
// as metadataBase). Change it here if the site moves to its own domain.
export const siteUrl = "https://personal-site-flame-eight-52.vercel.app";
export const siteName = "Richard Lan";
