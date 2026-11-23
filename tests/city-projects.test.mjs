// The projects section, with Skills inside it
// (components/city2d/sections/Projects.tsx): a row of panels along the
// street: the index under the section's heading, then one panel per
// project from app/data/portfolio.ts (the cover leading, on alternate
// sides; keys at the top of the text, "My part" apart from the team's
// features, the rest folded into a <details>), then the skill groups.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { projects, skillGroups } from "../app/data/portfolio.ts";

const root = new URL("../", import.meta.url).pathname;
const source = readFileSync(`${root}app/components/city2d/sections/Projects.tsx`, "utf8");

// The row: from its <article to its </article>
const row = source.slice(source.indexOf("<article"), source.indexOf("</article>"));

test("the component maps the projects and the skill groups from the data", () => {
  assert.match(source, /from "\.\.\/\.\.\/\.\.\/data\/portfolio"/);
  assert.match(source, /skillGroups\.map\(/);
  assert.ok((source.match(/projects\.map\(/g) ?? []).length >= 2, "the index and the rows both map the projects");
  assert.ok(projects.length > 0 && skillGroups.length > 0);
});

test("an index nav lists every project, each a link to its row's id", () => {
  assert.match(source, /<nav aria-label="Projects"/);
  const nav = source.slice(source.indexOf("<nav"), source.indexOf("</nav>"));
  assert.match(nav, /projects\.map\(/);
  assert.match(nav, /href=\{`#\$\{slug\(project\.title\)\}`\}/);
  assert.match(nav, /gloss\(project\.summary\)/);
  assert.match(row, /id=\{slug\(project\.title\)\}/);
  // Every project gets a distinct id
  const slug = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  assert.equal(new Set(projects.map((p) => slug(p.title))).size, projects.length);
});

test("the index's gloss is the summary up to its first colon, comma or full stop", () => {
  assert.match(source, /const gloss = \(summary: string\) => summary\.split\(\/\[:,\.\]\/\)\[0\]\.trim\(\);/);
  const gloss = (summary) => summary.split(/[:,.]/)[0].trim();
  assert.equal(gloss(projects.find((p) => p.title === "MarketLab").summary), "A stock market simulator");
  for (const project of projects) {
    const g = gloss(project.summary);
    assert.ok(g.length > 0 && project.summary.startsWith(g), project.title);
  }
});

test("every project is an article with a level-3 heading, a panel of the row (its look the journey's, not its own)", () => {
  assert.match(row, /<Heading level=\{3\}/);
  const opening = row.match(/<article\b[\s\S]*?>/)[0];
  assert.match(opening, /className="panel project @container reveal"/);
  assert.doesNotMatch(opening, /rounded|bg-panel|\bp-\d/);
  // The index panel opens the row, under the section's heading
  const index = source.slice(source.indexOf('className="panel project-index'), source.indexOf("</nav>"));
  assert.ok(index.indexOf("<StationHead") < index.indexOf("<nav"), "the heading, then the index");
});

test("the keys come before the lists, and Live demo only when there is one", () => {
  const keys = row.indexOf("<Keys");
  assert.ok(keys > 0);
  assert.ok(keys < row.indexOf("My part"));
  assert.ok(keys < row.indexOf("project.features.map("));
  assert.match(source, /project\.liveUrl && \(/);
  assert.match(source, /className=\{project\.liveUrl \? "glass" : "glass glass-primary"\}/);
  assert.match(source, /Live demo<span className="sr-only"> of \{project\.title\}<\/span>/);
  assert.match(source, /Code<span className="sr-only"> for \{project\.title\}<\/span>/);
});

test("My part is shown only with contributions, under a cyan rule; features take its place otherwise", () => {
  assert.match(source, /const part = project\.contributions \?\? \[\]/);
  assert.match(row, /part\.length > 0 \? \(/);
  assert.match(row, /border-l-2 border-cyan/);
  assert.match(row, /<Heading level=\{4\}[^>]*>My part<\/Heading>/);
  assert.match(row, /<Heading level=\{4\}[^>]*>What it does<\/Heading>/);
  assert.match(source, /project\.role && /);
});

test("My part shows its first four points; the rest fold under \"More of my part\", so nothing is dropped", () => {
  assert.match(source, /const SHOWN_PART = 4;/);
  assert.match(row, /part\.slice\(0, SHOWN_PART\)\.map/);
  assert.match(source, /const morePart = part\.slice\(SHOWN_PART\)/);
  const details = row.slice(row.indexOf("<details"));
  assert.match(details, /morePart\.length > 0 && \([\s\S]*?<Heading level=\{4\}[^>]*>More of my part<\/Heading>[\s\S]*?morePart\.map/);
  assert.match(source, /morePart\.length > 0 && "More of my part"/, "the summary names it");
});

test("the cover leads, matched to its words: a wide one heads them at their width, a tall one stands beside them; every other panel a size smaller", () => {
  // The frame is the picture's own shape: no empty bands, nothing cropped
  assert.match(source, /style=\{\{ aspectRatio: `\$\{shots\.reduce\(\(w, s\) => w \+ s\.width \/ s\.height, 0\)\}` \}\}/);
  assert.doesNotMatch(source, /aspect-\[16\/10\]/);
  // Wide: stacked, first (order), at the words' width
  assert.match(row, /-order-1 min-w-0/);
  // Tall (a phone's screen or a pair): beside the words from 27.5rem
  assert.match(source, /const side = Boolean\(cover && tall\(cover\)\)/);
  assert.match(row, /@min-\[27\.5rem\]:grid-cols-\[auto_minmax\(0,1fr\)\]/);
  assert.match(row, /pair \? "@min-\[27\.5rem\]:w-80" : "@min-\[27\.5rem\]:w-48"/);
  assert.match(source, /"--panel-w": small \? "34rem" : "40rem"/);
  // Its corners are the panel's less its padding
  assert.match(source, /rounded-\[var\(--radius-in\)\]/);
});

test("the index's glosses stay on one line", () => {
  assert.match(source, /<span className="min-w-0 truncate text-muted"> \{gloss\(project\.summary\)\}<\/span>/);
});

test("the stack is one muted line joined by middle dots", () => {
  assert.match(source, /project\.technologies\.join\(" · "\)/);
  assert.match(source, /Built with/);
});

test("the rest folds into a native details with a summary, only when there is something to fold", () => {
  assert.match(row, /<details\b/);
  assert.match(row, /<summary\b/);
  assert.match(source, /more screenshot/);
  assert.match(source, /folded && \(/);
});

test("the cover is screenshots[cover ?? 0]; a portrait pair shares the frame; nothing is cropped", () => {
  assert.match(source, /project\.cover \?\? 0/);
  assert.match(source, /object-contain/);
  assert.doesNotMatch(source, /object-cover/);
  assert.match(source, /tall\(cover\) && next && tall\(next\)/);
  assert.doesNotMatch(source, /sticky/);
});

test("Skills is a section with id skills, a level-3 heading and a level-4 one per group", () => {
  assert.match(source, /<section id="skills" aria-labelledby="skills-title"/);
  assert.match(source, /<Heading level=\{3\} id="skills-title"[^>]*>\s*Skills\s*<\/Heading>/);
  assert.match(source, /<Heading level=\{4\}[^>]*>\{group\.category\}<\/Heading>/);
  assert.match(source, /group\.skills\.map\(/);
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
  assert.match(source, /import \{ newTab \} from "\.\.\/ProfileLinks"/);
});

test("no fixed pixel widths, no carousel, no client code, no place names", () => {
  // (a media query's min-width in `sizes` is a breakpoint, not a width)
  assert.doesNotMatch(source, /\bw-\[\d+px\]|(?<![-\w])width:\s*\d+px/);
  assert.doesNotMatch(source, /"use client"|useState|carousel/i);
  assert.doesNotMatch(source, /Lujiazui|Longtang|Century Avenue|Line 2|Nanjing Road|The Bund/);
});
