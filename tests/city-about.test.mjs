// The about station's content (components/city2d/sections/About.tsx):
// every entry in `about` as an h3 (a Heading at level 3) and a list of points, then where to find
// me, built from `profile`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { about, profile } from "../app/data/portfolio.ts";

const root = new URL("../", import.meta.url).pathname;
const source = readFileSync(`${root}app/components/city2d/sections/About.tsx`, "utf8");

test("the about station maps every entry, its heading in an h3", () => {
  assert.ok(about.length > 0);
  assert.match(source, /about\.map\(/);
  assert.match(source, /<Heading level=\{3\}[^>]*>\{entry\.heading\}<\/Heading>/);
  assert.match(source, /entry\.points\.map\(/);
});

test("points are list items in a list with the class points", () => {
  assert.match(source, /<ul[^>]*className="points[ "]/);
  assert.match(source, /<li key=\{point\}>\s*<Figures>\{point\}<\/Figures>/);
  // No paragraph holds copy from the data
  assert.doesNotMatch(source, /<p[\s>]/);
  for (const entry of about) {
    for (const point of entry.points) assert.ok(!source.includes(point), `copy written into the component: ${point}`);
  }
});

test("where to find me is built from profile", () => {
  assert.match(source, /Where to find me/);
  assert.ok(profile.emails.length > 0);
  assert.match(source, /profile\.emails\.map\(/);
  assert.match(source, /href=\{`mailto:\$\{email\.address\}`\}/);
  assert.match(source, /\{email\.label\}/);
  // GitHub, LinkedIn and the résumé as keys (the shared links); no note
  // on GitHub (removed at Richard's word, 27 November 2026)
  assert.match(source, /<ProfileLinks variant="keys" \/>/);
  assert.doesNotMatch(source, /githubNote/);
  assert.doesNotMatch(source, /resumeUrl/);
  // Links that open elsewhere
  for (const m of source.matchAll(/target="_blank"[^>]*/g)) assert.match(m[0], /rel="noopener noreferrer"/);
});

test("the about station is a server component with no fixed widths", () => {
  assert.doesNotMatch(source, /^["']use client["']/m);
  assert.match(source, /export default function About\(\)/);
  assert.doesNotMatch(source, /w-\[\d+px\]|width:\s*\d+px/);
  assert.match(source, /@min-\[45\.5rem\]:grid-cols-2/);
  assert.doesNotMatch(source, /[぀-ヿ㐀-鿿]/);
});

test("the retired card glow is gone", () => {
  const css = readFileSync(new URL("../app/city.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /\.interest-card/);
});
