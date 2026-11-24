// The projects section, with Skills inside it
// (components/city2d/sections/Projects.tsx): a row of panels along the
// street: the index under the section's heading, then one panel per
// project from app/data/portfolio.ts (the title, the keys, the summary,
// then the cover, in that order in the document; "My part" apart from the team's
// features, the rest folded into a <details>), then the skill groups.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { projects, skillGroups } from "../app/data/portfolio.ts";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const source = read("app/components/city2d/sections/Projects.tsx");

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
  assert.match(source, /morePart\.length > 0 && "the rest of my part"/, "the summary names it");
});

test("the fold's summary is a full-width glass key: \"Show more\" and what it holds, \"Show less\" when open", () => {
  const details = row.slice(row.indexOf("<details"));
  const summary = details.slice(details.indexOf("<summary"), details.indexOf("</summary>"));
  assert.match(summary, /<summary className="glass w-full list-none /);
  assert.match(summary, /group-open:hidden">Show more/);
  assert.match(summary, /group-open:block">Show less</);
  assert.match(summary, /group-open:hidden">\{summaryText\}/, "what it holds, while it's closed");
  assert.match(summary, /className="chevron [^"]*group-open:rotate-180/);
  assert.match(source, /\.join\(", "\)/);
  // (city.css: the key reads from the left, its edge cyan while open)
  const city = read("app/city.css");
  assert.match(city, /summary\.glass \{\s*display: flex;\s*justify-content: space-between;/);
  assert.match(city, /details\[open\] > summary\.glass \{\s*border-color: var\(--cyan\);/);
});

test("a fold opens in place, its height and fade on the motion tokens, only where motion is welcome", () => {
  const city = read("app/city.css");
  const i = city.indexOf('details::details-content {');
  assert.ok(i > 0);
  const guard = city.lastIndexOf("@media", i);
  assert.match(city.slice(guard, i), /^@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*:root:not\(\[data-still="on"\]\) details \{\s*interpolate-size: allow-keywords;/);
  const rule = city.slice(i, city.indexOf("}", i));
  assert.match(rule, /block-size: 0;\s*opacity: 0;/);
  assert.match(rule, /block-size var\(--t-slow\) var\(--ease-out\)/);
  assert.match(rule, /content-visibility var\(--t-slow\) allow-discrete/);
  assert.match(city, /details\[open\]::details-content \{\s*block-size: auto;\s*opacity: 1;/);
});

test("on a phone the title, the keys, the summary, then the cover, in the document's order; on a wide panel, two columns", () => {
  // DOM order (not CSS order, which would split reading and Tab order from
  // what the eye sees): the title, the keys, the summary, the cover
  const at = (needle) => {
    const i = row.indexOf(needle);
    assert.ok(i >= 0, needle);
    return i;
  };
  assert.ok(at("<Heading level={3}") < at("<Keys project={project} />"), "title, then keys");
  assert.ok(at("<Keys project={project} />") < at("project.summary"), "keys, then summary");
  assert.ok(at("project.summary") < at("<Picture shots={shown}"), "summary, then cover");
  assert.doesNotMatch(row, /-order-1|\border-none\b/, "no CSS reordering");
  // The frame is the picture's own shape (--ar): no empty bands, nothing
  // cropped; on a phone at most a quarter of the screen tall
  assert.match(row, /"--ar": shown\.reduce\(\(w, s\) => w \+ s\.width \/ s\.height, 0\)/);
  assert.match(source, /aspect-\(--ar\)/);
  assert.match(row, /max-w-\[calc\(25svh\*var\(--ar\)\)\]/);
  assert.doesNotMatch(source, /aspect-\[16\/10\]/);
  // Tall (a phone's screen or a pair): beside the words from 27.5rem
  assert.match(source, /const side = Boolean\(cover && tall\(cover\)\)/);
  assert.match(row, /@min-\[27\.5rem\]:grid-cols-\[auto_minmax\(0,1fr\)\]/);
  assert.match(row, /pair \? "@min-\[27\.5rem\]:w-80" : "@min-\[27\.5rem\]:w-48"/);
  // A wide cover grows to the height of the words beside it
  assert.match(source, /@min-\[45\.5rem\]:h-full @min-\[45\.5rem\]:aspect-auto/);
  assert.match(row, /@min-\[45\.5rem\]:row-start-3 @min-\[45\.5rem\]:flex/);
  // A pair's frame is exactly its two pictures: no gap, no band
  assert.doesNotMatch(source, /justify-center gap-3/);
  assert.doesNotMatch(source, /--panel-w/);
  assert.match(source, /"@min-\[45\.5rem\]:grid-cols-\[minmax\(0,1\.1fr\)_minmax\(0,1fr\)\]"/);
  assert.match(source, /@min-\[45\.5rem\]:grid-cols-\[auto_minmax\(0,1fr\)_minmax\(0,1fr\)\]/);
  assert.match(source, /rounded-\[var\(--radius-in\)\]/);
});

test("the index's glosses wrap, never cut short", () => {
  assert.match(source, /<span className="min-w-0 text-muted"> \{gloss\(project\.summary\)\}<\/span>/);
  assert.doesNotMatch(source, /\btruncate\b|line-clamp/);
});

test("the extra screenshots open readable, as wide as the column, not thumbnails", () => {
  const list = row.slice(row.indexOf("More ${project.title} screenshots"));
  assert.match(list, /sizes=\{coverSizes\}/);
  assert.match(list, /"h-auto w-full"/);
  assert.doesNotMatch(source, /sizes="8rem"|h-28 w-auto|w-32/);
});

test("a picture that fails to load is a quiet framed box with its description (city.css)", () => {
  const css = read("app/city.css");
  assert.match(css, /\.project img::after \{[^}]*content: attr\(alt\);[^}]*background: var\(--ink-2\);[^}]*color: var\(--muted\);/);
});

test("Skills, the row's last panel, ends with the way on", () => {
  assert.match(source, /import \{ NextStop, StationHead, order \} from "\.\.\/Station"/);
  const skills = source.slice(source.indexOf('id="skills"'));
  assert.match(skills, /<NextStop section=\{section\("projects"\)\} \/>\s*<\/section>/);
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
