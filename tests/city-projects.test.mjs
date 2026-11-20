// The projects station, with Skills inside it
// (components/city2d/sections/Projects.tsx): every project written out
// from app/data/portfolio.ts, then the skill groups.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { projects, skillGroups } from "../app/data/portfolio.ts";

const root = new URL("../", import.meta.url).pathname;
const source = readFileSync(`${root}app/components/city2d/sections/Projects.tsx`, "utf8");

test("the component maps the projects and the skill groups from the data", () => {
  assert.match(source, /from "\.\.\/\.\.\/\.\.\/data\/portfolio"/);
  assert.match(source, /projects\.map\(/);
  assert.match(source, /skillGroups\.map\(/);
  assert.match(source, /<article\b/);
  assert.ok(projects.length > 0 && skillGroups.length > 0);
});

test("every project's title, summary and code link come through the mapped fields", () => {
  for (const field of ["title", "summary", "githubUrl", "features", "technologies"]) {
    assert.match(source, new RegExp(`project\\.${field}\\b`), field);
  }
  for (const project of projects) {
    assert.ok(project.title && project.summary, project.title);
    assert.match(project.githubUrl, /^https:\/\/github\.com\//, project.title);
  }
});

test("Skills is a section with id skills, an h3 and an h4 per group", () => {
  assert.match(source, /<section id="skills" aria-labelledby="skills-title"/);
  assert.match(source, /<h3 id="skills-title"[^>]*>\s*Skills\s*<\/h3>/);
  assert.match(source, /<h4[^>]*>\{group\.category\}<\/h4>/);
  assert.match(source, /group\.skills\.map\(/);
});

test("the live demo, the role and the contributions appear only when the data has them", () => {
  assert.match(source, /project\.liveUrl && \(/);
  assert.match(source, /project\.role && /);
  assert.match(source, /project\.contributions && \(/);
  assert.match(source, /My part/);
});

test("technologies are plain text, joined with commas", () => {
  assert.match(source, /project\.technologies\.join\(", "\)/);
});

test("every image has an alt from the data and its real size", () => {
  const images = source.match(/<Image\b[\s\S]*?\/>/g) ?? [];
  assert.ok(images.length >= 2);
  for (const image of images) {
    assert.match(image, /alt=\{\w+\.alt\}/);
    assert.match(image, /width=\{\w+\.width\}/);
    assert.match(image, /height=\{\w+\.height\}/);
    assert.match(image, /sizes=/);
  }
});

test("links that open elsewhere say so and carry noopener noreferrer", () => {
  const blanks = source.match(/target="_blank"/g) ?? [];
  const rels = source.match(/rel="noopener noreferrer"/g) ?? [];
  assert.ok(blanks.length >= 4);
  assert.equal(rels.length, blanks.length);
  assert.match(source, /\(opens in a new tab\)/);
});

test("no fixed pixel widths, no carousel, no client code", () => {
  // (a media query's min-width in `sizes` is a breakpoint, not a width)
  assert.doesNotMatch(source, /\bw-\[\d+px\]|(?<![-\w])width:\s*\d+px/);
  assert.doesNotMatch(source, /"use client"|useState|carousel/i);
});
