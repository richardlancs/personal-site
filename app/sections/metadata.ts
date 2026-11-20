import type { Metadata } from "next";
import { section, siteName, type SectionId } from "./registry.ts";

// Each section's one-line summary and its page metadata (title and
// description), with what makes a page's metadata from them. Kept apart
// from the registry (./registry.ts), which every page's first load
// carries to the browser: these are read only on the server.
export const sectionWords: Record<SectionId, { summary: string; metadata: { title: string; description: string } }> = {
  home: {
    summary: "My name, what I do, and the way to everything else.",
    metadata: {
      title: "Richard Lan | Software Engineering Portfolio",
      description: "Portfolio of Richard Lan, a Computer Science student at the University of Waterloo seeking software engineering internship and co-op roles.",
    },
  },
  about: {
    summary: "Who I am and what I'm working toward.",
    metadata: { title: "About", description: "About Richard Lan, a Computer Science student at the University of Waterloo." },
  },
  projects: {
    summary: "The software I've built, and my tools.",
    metadata: { title: "Projects", description: "Software projects by Richard Lan, with screenshots, code and live demos." },
  },
  experience: {
    summary: "Where I've worked and studied.",
    metadata: { title: "Experience", description: "Richard Lan's experience and education." },
  },
  interests: {
    summary: "What I do away from the keyboard.",
    metadata: { title: "Interests", description: "What Richard Lan does away from the keyboard." },
  },
  contact: {
    summary: "Email, GitHub, LinkedIn and my résumé.",
    metadata: { title: "Contact", description: "How to reach Richard Lan: email, GitHub, LinkedIn and résumé." },
  },
};

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
// is never a canonical address.
export const sectionMetadata = (id: "home"): Metadata => {
  const s = section(id);
  const m = sectionWords[id].metadata;
  const title = s.id === "home" ? m.title : `${m.title} | ${siteName}`;
  return {
    title: m.title,
    description: m.description,
    alternates: { canonical: s.href },
    openGraph: { type: "website", siteName, url: s.href, title, description: m.description, images: [shareCard] },
    twitter: { card: "summary_large_image", title, description: m.description, images: [shareCard] },
    ...(s.listed ? {} : { robots: { index: false, follow: false } }),
  };
};

// A page of the 3D city (app/city/): titled "3D city" (home) or
// "Projects · 3D city", described as its section is, never indexed, and
// canonical to the 2D page, the one page that is (an anchor such as
// "/#projects" is never a canonical address, so every one points at "/").
export const cityMetadata = (id: SectionId): Metadata => {
  const s = section(id);
  const title = s.id === "home" ? "3D city" : `${s.title} · 3D city`;
  return {
    title,
    description: sectionWords[id].metadata.description,
    robots: { index: false, follow: true },
    alternates: { canonical: "/" },
  };
};
