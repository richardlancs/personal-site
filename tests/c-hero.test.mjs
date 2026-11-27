// The hero (components/city2d/sections/Hero.tsx): the name, the
// programme and school as its headline, "View projects" with the résumé
// beside it, and the other links in one style. (Moved here from
// city-band.test.mjs with Task 9's item 5; the role-sought line taken off
// Home at Richard's ruling, Task 10: About keeps it.)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { about } from "../app/data/portfolio.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const src = read("app/components/city2d/sections/Hero.tsx");
const css = read("app/city.css");

test("the hero says who: the name, then the programme and school as its headline; no role line, no paragraph", () => {
  assert.ok(!src.includes('"use client"'), "the hero is a server component");
  assert.match(src, /<h1[^>]*>\{profile\.name\}<\/h1>/);
  // No line on the role sought on Home (About still has it, in the data)
  assert.doesNotMatch(src, /Looking for|seeking|\babout\b/);
  assert.ok(about.flatMap((entry) => entry.points).some((point) => point.startsWith("Looking for")), "About's line stays in the data");
  assert.doesNotMatch(src, /profile\.headline/);
  assert.match(src, /experience\.find\(\(entry\) => entry\.kind === "education"\)/);
  assert.match(src, /<p className="hero-headline[^"]*"[^>]*>\s*\{school\.role\}, \{school\.organization\}\s*<\/p>/);
  assert.equal((src.match(/<p[ >]/g) ?? []).length, 1, "the school, nothing else");
});

test("one primary action with the résumé beside it as plain glass; no duplicate Contact or Email", () => {
  assert.equal((src.match(/className="glass glass-primary"/g) ?? []).length, 1);
  assert.match(src, /<a href="#projects" className="glass glass-primary">/);
  const actions = src.slice(src.indexOf("hero-actions"), src.indexOf("hero-links"));
  assert.match(actions, /<ResumeLink className="glass">Résumé<\/ResumeLink>/);
  assert.doesNotMatch(src, /href="#contact"/, "Contact isn't repeated as a link");
  assert.doesNotMatch(src, /mailto:/, "the email comes from the shared links, with its icon");
  assert.match(css, /\.hero-actions \{[^}]*display: flex;[^}]*gap: 0\.75rem;/);
});

test("the headline is display type in --text, not a cyan accent; no box behind the name", () => {
  const headline = css.match(/\.hero-headline \{[^}]*\}/)?.[0] ?? "";
  assert.match(headline, /color: var\(--text\);/);
  assert.doesNotMatch(headline, /--cyan|letter-spacing/);
  const backing = css.match(/\.hero-backing \{[^}]*\}/)?.[0] ?? "";
  assert.doesNotMatch(backing, /border:|background:/, "the name on the paper itself, read either way");
});

test("a short screen: a compact name, the actions straight after, the links on their row", () => {
  const short = css.slice(css.indexOf("/* A short screen (a phone on its side)"));
  assert.match(short, /@media \(max-height: 500px\) \{\s*\.hero-name \{\s*font-size: min\(2\.5rem, 13vw\);/);
  assert.match(short, /\.hero-actions,\s*\.hero-links \{\s*display: inline-flex;/);
});
