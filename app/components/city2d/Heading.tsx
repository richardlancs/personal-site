import { createElement, type ReactNode } from "react";

// A section's headings, at their level under the station's h2 (3, 4 or 5),
// so the page's outline runs on with nothing skipped.
//
// Written with createElement rather than JSX so tests/city-sections-fit.test.mjs
// can load this file with its types stripped and call it directly
export default function Heading({
  level,
  id,
  className,
  children,
}: {
  level: 3 | 4 | 5;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return createElement(`h${level}`, { id, className }, children);
}
