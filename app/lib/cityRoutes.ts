// The 3D city's addresses (app/city/), from the registry: a section's page
// there, which section a /city address is, and the way back to the same
// place on the 2D page. Pure, so the tests load it straight into Node.
import { pageSections, section, type Section, type SectionId } from "../sections/registry.ts";

export type CityPath = Section["city"];

export function cityPath(id: SectionId): CityPath {
  return section(id).city;
}

// "/city/projects" (or "/city/projects/") → "projects"; anything else,
// "/city/skills" included, → null
export function sectionForCityPath(pathname: string): SectionId | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return pageSections.find((s) => s.city === path)?.id ?? null;
}

// The same section on the 2D page: "/city/projects" → "/#projects"; an
// address that isn't a section's → "/"
export function twoDHref(pathname: string): Section["href"] {
  const id = sectionForCityPath(pathname);
  return id ? section(id).href : "/";
}
