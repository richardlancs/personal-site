// Figures in bold (lib/figures.ts, components/city2d/Figures.tsx): every
// number with what is attached to it, wherever content is shown; never a
// year, a date's day, a version or a number inside a name.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { about, experience, interests, projects } from "../app/data/portfolio.ts";
import { splitFigures } from "../app/lib/figures.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const figs = (t) => splitFigures(t).filter((p) => p.figure).map((p) => p.text);

test("counts, with their signs and separators", () => {
  assert.deepEqual(figs("Screened 6,000+ companies and sent 300+ emails."), ["6,000+", "300+"]);
  assert.deepEqual(figs("Cut load time by 40% for $7,500."), ["40%", "$7,500"]);
  assert.deepEqual(figs("100 puzzles across 15 repositories"), ["100", "15"]);
});

test("ratios, dimensions, decimals and ranges stay whole", () => {
  assert.deepEqual(figs("54/60 named, 0.885 mAP50, a 3×3 board, 10–12 players"), ["54/60", "0.885", "3×3", "10–12"]);
  assert.deepEqual(figs("3× faster, 5k users, 2M rows, a 4x4 grid"), ["3×", "5k", "2M", "4x4"]);
});

test("names, years and versions are not figures", () => {
  assert.deepEqual(figs("Built with YOLO11 and Next.js 16 for CS135 in 2026, v2.1."), []);
  assert.deepEqual(figs("GPT-4, Python 3, Line 2, team #20261, a 3D city, the 1st prize, Oct 12, 12 Oct 2026, Manifest V3"), []);
  assert.deepEqual(figs("Expected graduation: 2031. HackUMass XIV (November 2026)."), []);
});

test("a count at the start of a sentence, or before a hyphenated word, is a figure", () => {
  assert.deepEqual(figs("8 variants. About 95 US stocks. Wrote 15 of them."), ["8", "95", "15"]);
  assert.deepEqual(figs("tested on every 5-card hand"), ["5"]);
});

test("the pieces join back to the original text", () => {
  const t = "About 95 US stocks, tested on 100,000 hands.";
  assert.equal(splitFigures(t).map((p) => p.text).join(""), t);
  assert.deepEqual(splitFigures("No numbers here."), [{ text: "No numbers here.", figure: false }]);
  assert.deepEqual(splitFigures(""), []);
});

// Every content point the page shows, and the figures found in it:
// reviewed by hand (20 November 2026). A change to the data that adds a
// figure updates this list.
test("every figure in the real data is found, and nothing else", () => {
  const texts = [
    ...projects.flatMap((p) => [p.summary, p.role, ...p.features, ...(p.contributions ?? [])]),
    ...experience.flatMap((e) => e.highlights),
    ...about.flatMap((a) => a.points),
    ...interests.map((i) => i.description),
  ].filter(Boolean);
  const found = texts.flatMap((t) => figs(t).map((f) => `${f} | ${t.slice(0, 40)}`));
  assert.deepEqual(found, [
    "95 | Market dashboard and a screener covering",
    "4 | Led a team of 4 at HackUMass XIV (Novemb",
    "4 | Proposed the shared message contracts al",
    "5 | Added offline Piper voices in 5 language",
    "3 | Lead developer on a team of 3.",
    "100 | 100 puzzles across 15 TypeScript and Pyt",
    "15 | 100 puzzles across 15 TypeScript and Pyt",
    "15 | Wrote 15 of the puzzles, and the difficu",
    "8 | 8 variants, from Hold'em and Omaha to Sh",
    "5 | A pure TypeScript engine, tested on ever",
    "100,000 | A pure TypeScript engine, tested on ever",
    "3×3 | Designed and built Tic-Tac-Toe Hold'em: ",
    "6 | Not yet released: a product audit and 6 ",
    "3 | Scrollganizer, a Chrome extension for se",
  ]);
  // The years in the data stay plain
  assert.ok(texts.some((t) => t.includes("2031")) && !found.some((f) => f.startsWith("2031")));
});

test(".figure is bold in the text's own colour, with even-width figures", () => {
  const css = read("app/city.css");
  const rule = css.match(/\n\.figure \{([^}]*)\}/)?.[1] ?? "";
  assert.match(rule, /font-weight: 700;/);
  assert.match(rule, /font-variant-numeric: tabular-nums;/);
  for (const m of rule.matchAll(/color:\s*([^;]+);/g)) assert.equal(m[1].trim(), "var(--text)");
});

test("<Figures> wraps each figure in <strong className=\"figure\">, and is a server component", () => {
  const src = read("app/components/city2d/Figures.tsx");
  assert.doesNotMatch(src, /^["']use client["']/m);
  assert.match(src, /<strong key=\{i\} className="figure">/);
  assert.match(src, /splitFigures\(children\)/);
});

test("every section that shows content points wraps them in <Figures>; the hero and Experience's dates and organisation do not", () => {
  const uses = {
    "app/components/city2d/sections/Projects.tsx": ["project.summary", "project.role", "feature", "contribution"],
    "app/components/city2d/sections/Experience.tsx": ["highlight"],
    "app/components/city2d/sections/About.tsx": ["point"],
    "app/components/city2d/sections/Interests.tsx": ["interest.description"],
  };
  for (const [file, exprs] of Object.entries(uses)) {
    const src = read(file);
    assert.match(src, /import Figures from "\.\.\/Figures"/, file);
    for (const e of exprs) assert.match(src, new RegExp(`<Figures>\\{${e.replace(".", "\\.")}\\}</Figures>`), `${file}: ${e}`);
  }
  const exp = read("app/components/city2d/sections/Experience.tsx");
  assert.doesNotMatch(exp, /<Figures>\{entry\.(organization|startDate|endDate|location|role)\}/);
  assert.doesNotMatch(read("app/components/city2d/sections/Hero.tsx"), /Figures/);
});
