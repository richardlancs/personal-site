// Checks on the site's content and on the two things that have to stay in
// step by hand. Run with `npm test` (Node's own test runner; Node reads the
// TypeScript data files directly).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { about, experience, interests, profile, projects, skillGroups } from "../app/data/portfolio.ts";
import { sectionWords } from "../app/sections/metadata.ts";
import { section, sections, siteUrl } from "../app/sections/registry.ts";

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

test("every section in the registry is complete and is a station on the one page", () => {
  const ids = sections.map((s) => s.id);
  const hrefs = sections.map((s) => s.href);
  assert.equal(new Set(ids).size, ids.length, "ids are unique");
  assert.equal(new Set(hrefs).size, hrefs.length, "addresses are unique");
  assert.ok(existsSync(`${root}app/page.tsx`), "the one page");
  const page = readFileSync(`${root}app/page.tsx`, "utf8");
  for (const s of sections) {
    assert.equal(s.href, s.hash ? `/#${s.hash}` : "/", `${s.id}: its address is its anchor`);
    assert.match(page, new RegExp(`<Station\\s+section=\\{section\\("${s.id}"\\)\\}`), `${s.id} has no station on the page`);
    // (its summary and metadata live apart, read only on the server)
    const w = sectionWords[s.id];
    assert.ok(w.metadata.title && w.metadata.description, `${s.id}: metadata`);
    assert.ok(isSentence(w.summary), `${s.id}: summary "${w.summary}"`);
    assert.equal(section(s.id), s);
    for (const sub of s.subsections ?? []) assert.match(sub.href, /^\/#[a-z-]+$/, `${s.id}: ${sub.title} is an anchor`);
  }
});

test("the section starter is a template in docs, not a public page", () => {
  const path = `${root}docs/development/section-template/Greenhouse.tsx`;
  assert.ok(existsSync(path), "the starter template is kept in docs/development");
  // docs/ isn't type-checked, so check the template still fits the code it
  // is copied next to: every import resolves from
  // app/components/city2d/sections/, and every name it imports is exported
  // there
  const template = readFileSync(path, "utf8");
  const imports = [...template.matchAll(/import\s+(.+?)\s+from\s+"(\.\.?\/[^"]+)"/g)];
  assert.ok(imports.length >= 1, "the template's imports were found");
  const here = new URL("../app/components/city2d/sections/", import.meta.url);
  for (const [, names, from] of imports) {
    const base = new URL(from, here).pathname;
    const file = [".tsx", ".ts"].map((ext) => base + ext).find(existsSync);
    assert.ok(file, `the template imports ${from}, which isn't there from city2d/sections/`);
    const source = readFileSync(file, "utf8");
    const wanted = names.startsWith("{") ? names.slice(1, -1).split(",").map((n) => n.trim()) : [];
    if (!names.startsWith("{")) assert.match(source, /export default/, `${from} has no default export`);
    for (const name of wanted) assert.match(source, new RegExp(`export (const|function|type) ${name}\\b`), `${from} doesn't export ${name}`);
  }
  // A section component: no h2 of its own (the Station gives it one), and
  // not a page
  assert.doesNotMatch(template, /<h2[\s>]/);
  assert.doesNotMatch(template, /^export const metadata/m);
  assert.ok(!existsSync(`${root}app/greenhouse`), "app/greenhouse would be served at /greenhouse");
  assert.ok(!existsSync(`${root}app/components/city2d/sections/Greenhouse.tsx`), "the starter isn't mounted");
  assert.ok(!sections.some((s) => s.id === "greenhouse"), "no greenhouse entry in the registry");
});

// The arcade machine (city3d/arcade/, restyled for the city in a later
// task): every mode has an action, and it never asks for money
test("the arcade's machine has an action for every mode, and asks for nothing", () => {
  const logic = readFileSync(`${root}app/components/city3d/arcade/arcadeLogic.ts`, "utf8");
  for (const scene of ["basketball", "badminton", "chess", "poker"]) assert.match(logic, new RegExp(`${scene}: \\{ label: "[^"]+", hint: "[^"]+" \\}`), `${scene} has an action`);
  const machine = readFileSync(`${root}app/components/city3d/arcade/arcadeMachine.ts`, "utf8");
  assert.doesNotMatch(machine, /INSERT COIN/i);
});

test("the site has its own icons and share card, not the framework's (audit F1)", () => {
  const favicon = readFileSync(`${root}app/favicon.ico`);
  // The icon create-next-app ships: a black square with a white N
  assert.notEqual(createHash("sha1").update(favicon).digest("hex"), "9bd95591db1b6ee579ed9485a4d4a957e7a90354", "app/favicon.ico is still the Next.js default");
  for (const file of ["app/icon.svg", "app/apple-icon.png", "public/share-card.jpg"]) assert.ok(existsSync(`${root}${file}`), `${file} is missing`);
  assert.match(siteUrl, /^https:\/\/[^/]+$/, "siteUrl is an https origin with no trailing slash");
});
