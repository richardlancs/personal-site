import { createElement, type ReactNode } from "react";

// Where a section is drawn: on the 2D page ("2d"), under its station's h2,
// or in a panel of the 3D city ("3d", city3d/CityPage.tsx), under the
// page's h1 (the section's title). A section's headings are written at
// their 2D level (3, 4 or 5) and come out one level higher in 3D, so both
// outlines run on with nothing skipped.
export type Where = "2d" | "3d";

export const headingLevel = (level: 3 | 4 | 5, where: Where = "2d") => level - (where === "3d" ? 1 : 0);

// Written with createElement rather than JSX so tests/city-panel-fit.test.mjs
// can load this file with its types stripped and call it directly
export default function Heading({
  level,
  where = "2d",
  id,
  className,
  children,
}: {
  level: 3 | 4 | 5;
  where?: Where;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return createElement(`h${headingLevel(level, where)}`, { id, className }, children);
}
