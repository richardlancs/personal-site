// The hero (components/city2d/sections/Hero.tsx): the name, the role
// sought in Richard's own words, the school, "View projects" with the
// résumé beside it, and the other links in one style. (Moved here from
// city-band.test.mjs with Task 9's item 5.)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { about } from "../app/data/portfolio.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const src = read("app/components/city2d/sections/Hero.tsx");
const css = read("app/city.css");

test("the hero says who and what: the name, the role sought from the data, the school; no paragraph", () => {
  assert.ok(!src.includes('"use client"'), "the hero is a server component");
  assert.match(src, /<h1[^>]*>\{profile\.name\}<\/h1>/);
  // The role sought: the line already in `about`, nothing new
  assert.match(src, /about\.flatMap\(\(entry\) => entry\.points\)\.find\(\(point\) => point\.startsWith\("Looking for"\)\)/);
  assert.ok(about.flatMap((entry) => entry.points).some((point) => point.startsWith("Looking for")), "the data has the line");
  assert.match(src, /<p className="hero-headline[^"]*"[^>]*>\{seeking\}<\/p>/);
  assert.doesNotMatch(src, /profile\.headline/);
  assert.match(src, /experience\.find\(\(entry\) => entry\.kind === "education"\)/);
  assert.match(src, /\{school\.role\}, \{school\.organization\}/);
  assert.equal((src.match(/<p[ >]/g) ?? []).length, 2, "the role and the school, nothing else");
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

test("the role is a sentence in --text, not a cyan accent; no box behind the name on the journey", () => {
  const headline = css.match(/\.hero-headline \{[^}]*\}/)?.[0] ?? "";
  assert.match(headline, /color: var\(--text\);/);
  assert.doesNotMatch(headline, /--cyan|letter-spacing/);
  assert.match(css, /:root\[data-track="on"\] \.hero-backing \{\s*padding: 0;\s*border: 0;\s*background: none;/);
});

test("a short screen: a compact name, the actions straight after, the links on their row", () => {
  const short = css.slice(css.indexOf("/* A short screen (a phone on its side)"));
  assert.match(short, /@media \(max-height: 500px\) \{\s*\.hero-name \{\s*font-size: min\(2\.5rem, 13vw\);/);
  assert.match(short, /\.hero-actions,\s*\.hero-links \{\s*display: inline-flex;/);
});
