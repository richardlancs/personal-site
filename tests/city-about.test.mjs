// The about station's content (components/city2d/sections/About.tsx):
// every entry in `about` as an h3 and a list of points, then where to find
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
  assert.match(source, /<h3[^>]*>\{entry\.heading\}<\/h3>/);
  assert.match(source, /entry\.points\.map\(/);
});

test("points are list items in a list with the class points", () => {
  assert.match(source, /<ul[^>]*className="points[ "]/);
  assert.match(source, /<li key=\{point\}>\{point\}<\/li>/);
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
  assert.match(source, /href=\{profile\.githubUrl\}/);
  assert.match(source, /href=\{profile\.linkedinUrl\}/);
  // The résumé goes through ResumeLink, never the URL directly
  assert.match(source, /<ResumeLink/);
  assert.doesNotMatch(source, /resumeUrl/);
  // Links that open elsewhere
  for (const m of source.matchAll(/target="_blank"[^>]*/g)) assert.match(m[0], /rel="noopener noreferrer"/);
});

test("the about station is a server component with no fixed widths", () => {
  assert.doesNotMatch(source, /^["']use client["']/m);
  assert.match(source, /export default function About\(\)/);
  assert.doesNotMatch(source, /w-\[\d+px\]|width:\s*\d+px/);
  assert.match(source, /md:grid-cols-2/);
  assert.doesNotMatch(source, /[぀-ヿ㐀-鿿]/);
});

test("the points' dash and the interests' edge glow are styled, the glow gone under more contrast", () => {
  const css = readFileSync(new URL("../app/city.css", import.meta.url), "utf8");
  assert.match(css, /\.points > li::before \{[^}]*background: var\(--lantern\)/);
  assert.match(css, /@media \(prefers-contrast: more\) \{[\s\S]*\.interest-card \{\s*box-shadow: none !important;/);
});
