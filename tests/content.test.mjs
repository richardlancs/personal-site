// Checks on the site's content and on the two things that have to stay in
// step by hand. Run with `npm test` (Node's own test runner; Node reads the
// TypeScript data files directly).
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { FLAT_QUERY, WORLD_QUERY } from "../app/components/world/flat.ts";
import { about, experience, interests, profile, projects, skillGroups } from "../app/data/portfolio.ts";
import { places } from "../app/data/world.ts";

const root = new URL("..", import.meta.url).pathname;
const isSentence = (text) => /[.!?]$/.test(text.trim());

test("every project has a one-line summary and 3 to 5 short points", () => {
  for (const project of projects) {
    assert.ok(project.summary.length > 20 && project.summary.length <= 140, `${project.title}: summary length`);
    assert.ok(project.features.length >= 3 && project.features.length <= 5, `${project.title}: ${project.features.length} features`);
    for (const point of [...project.features, ...(project.contributions ?? [])]) {
      assert.ok(point.length <= 130, `${project.title}: point is too long to scan: "${point}"`);
      assert.ok(isSentence(point), `${project.title}: point should end like a sentence: "${point}"`);
    }
    assert.ok(project.technologies.length > 0, `${project.title}: technologies`);
    assert.match(project.githubUrl, /^https:\/\/github\.com\//, `${project.title}: GitHub link`);
    if (project.liveUrl) assert.match(project.liveUrl, /^https:\/\//, `${project.title}: live demo link`);
  }
});

test("a project that lists my contributions also says my role on it", () => {
  for (const project of projects) {
    if (project.contributions) assert.ok(project.role, `${project.title}: role`);
  }
});

test("every screenshot is a file in public/, with alt text", () => {
  for (const project of projects) {
    for (const shot of project.screenshots ?? []) {
      assert.ok(existsSync(`${root}public${shot.src}`), `${shot.src} is missing`);
      assert.ok(shot.alt.length > 10, `${shot.src}: alt text`);
    }
  }
});

test("experience entries have 2 to 4 points", () => {
  for (const stop of experience) {
    assert.ok(stop.highlights.length >= 2 && stop.highlights.length <= 4, `${stop.role}: ${stop.highlights.length} highlights`);
    for (const point of stop.highlights) assert.ok(isSentence(point), `${stop.role}: "${point}"`);
  }
});

test("the notebook's pages each have a heading and a few points", () => {
  const headings = about.map((page) => page.heading);
  assert.equal(new Set(headings).size, headings.length, "headings are unique (they are React keys)");
  for (const page of about) assert.ok(page.points.length >= 2 && page.points.length <= 5, `${page.heading}: ${page.points.length} points`);
});

test("interests and skills are filled in", () => {
  for (const interest of interests) assert.ok(interest.description.length > 20, interest.name);
  for (const group of skillGroups) assert.ok(group.skills.length > 0, group.category);
});

test("contact details point somewhere real", () => {
  assert.ok(existsSync(`${root}public${profile.resumeUrl}`), "the résumé PDF is in public/");
  assert.match(profile.githubUrl, /^https:\/\/github\.com\//);
  assert.match(profile.linkedinUrl, /^https:\/\/www\.linkedin\.com\/in\//);
  for (const email of profile.emails) assert.match(email.address, /^[^@\s]+@[^@\s]+\.[a-z]+$/);
});

test("every place has a page", () => {
  const hrefs = places.map((place) => place.href);
  assert.equal(new Set(hrefs).size, hrefs.length);
  for (const href of hrefs) assert.ok(existsSync(`${root}app${href}/page.tsx`), `${href} has no page`);
});

test("the flat and world layouts use the same media queries in CSS and in code", () => {
  const css = readFileSync(`${root}app/globals.css`, "utf8");
  const queries = [...css.matchAll(/@media ([^{]+) \{/g)].map((match) => match[1]);
  assert.ok(queries.includes(FLAT_QUERY), "globals.css has the flat layout's query");
  assert.ok(queries.includes(WORLD_QUERY), "globals.css has the world layout's query");
  // Any other query about orientation would be a third layout nobody meant
  for (const query of queries) {
    if (query.includes("orientation")) assert.ok(query === FLAT_QUERY || query === WORLD_QUERY, `unexpected layout query: ${query}`);
  }
});

test("every Chinese character on the signs is in the sign font's subset", () => {
  // app/fonts/noto-serif-sc-signs-600.woff2 holds only the characters in
  // app/fonts/signs.txt. When a sign gains a character, add it there and
  // download the subset again:
  //   https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@600&text=<the characters, URL-encoded>
  // (with a browser User-Agent, so it answers with woff2), then fetch the
  // one URL in that CSS to app/fonts/noto-serif-sc-signs-600.woff2.
  const subset = new Set(readFileSync(`${root}app/fonts/signs.txt`, "utf8").trim());
  const cjk = /[　-ヿ一-鿿＀-￯]/g;
  const missing = new Set();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (/\.tsx?$/.test(entry.name)) for (const ch of readFileSync(path, "utf8").match(cjk) ?? []) if (!subset.has(ch)) missing.add(ch);
    }
  };
  walk(`${root}app`);
  assert.deepEqual([...missing], [], "characters missing from app/fonts/signs.txt");
});
