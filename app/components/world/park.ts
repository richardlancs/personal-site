import { section, sections, type Section, type SectionId } from "../../sections/registry";
import type { GlyphId } from "./glyphs";

// The park's rooms, for the 3D park (world3d/) and its page frame
// (Location.tsx), which nothing on the site loads any more: the site is
// one page of stations now (sections/registry.ts). The registry no
// longer knows the park, so what these files still read about it is
// kept here, keyed by section, until a later plan replaces them.
type Room = {
  place: string; // where it is in the park: "The pavilion"
  glyph: GlyphId; // its drawing, from the old map
  side: "left" | "right" | "middle"; // which side of a wide screen its page sat on
  // The park's name tag for it, if it has a building there
  // (world3d/scenes/Park.tsx keeps the positions, by this key)
  anchor?: "library" | "workshop" | "station" | "arcade" | "booth" | "board";
};

const rooms: Record<SectionId, Room> = {
  home: { place: "The park", glyph: "board", side: "middle" },
  about: { place: "The pavilion", glyph: "pavilion", side: "right", anchor: "library" },
  projects: { place: "The workshop", glyph: "workshop", side: "left", anchor: "workshop" },
  experience: { place: "The station", glyph: "station", side: "right", anchor: "station" },
  interests: { place: "The arcade", glyph: "arcade", side: "left", anchor: "arcade" },
  contact: { place: "The phone booth", glyph: "booth", side: "left", anchor: "booth" },
};

// A section with its room, and the address its page had (/about, …)
export type ParkSection = Section & Room & { path: `/${string}` };

export const parkSections: ParkSection[] = sections.map((s) => ({ ...s, ...rooms[s.id], path: `/${s.hash}` }));

export const parkSection = (id: SectionId): ParkSection => parkSections.find((s) => s.id === id) ?? { ...section("home"), ...rooms.home, path: "/" };

// Every listed room except home
export const parkRooms = parkSections.filter((s) => s.listed && s.id !== "home");

// Which room an old address showed (the park for anything else)
export const parkSectionForPath = (pathname: string): ParkSection => parkSections.find((s) => s.path === pathname) ?? parkSection("home");

// The room a building in the park leads to
export const parkSectionForAnchor = (anchor: NonNullable<Room["anchor"]>): ParkSection | undefined => parkSections.find((s) => s.anchor === anchor);
