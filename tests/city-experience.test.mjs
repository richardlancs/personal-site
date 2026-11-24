// The Experience section (components/city2d/sections/Experience.tsx):
// plain dated rows, newest first, work and education apart; its order and
// grouping (lib/experience.ts) and its date helper (lib/machineDate.ts).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { experience } from "../app/data/portfolio.ts";
import { machineDate } from "../app/lib/machineDate.ts";
import { sortNewestFirst, groupByKind, isCurrent } from "../app/lib/experience.ts";

const root = new URL("../", import.meta.url).pathname;
const read = (f) => readFileSync(`${root}${f}`, "utf8");
const source = readFileSync(`${root}app/components/city2d/sections/Experience.tsx`, "utf8");

const entry = (role, startDate, endDate, kind) => ({ role, organization: "Org", startDate, endDate, kind, highlights: [] });
const roles = (list) => list.map((e) => e.role);

test("sortNewestFirst puts the real data in date order", () => {
  const sorted = sortNewestFirst(experience);
  assert.deepEqual(
    sorted.map((e) => e.organization),
    ["FlyRank AI", "University of Waterloo", "Drive Gears #20261, FIRST Tech Challenge"],
  );
  const { work, education } = groupByKind(sorted);
  assert.deepEqual(work.map((e) => e.organization), ["FlyRank AI", "Drive Gears #20261, FIRST Tech Challenge"]);
  assert.deepEqual(education.map((e) => e.organization), ["University of Waterloo"]);
});

test("a running entry sorts above a finished one that started the same year", () => {
  const done = entry("done", "Sept 2026", "Dec 2026");
  const running = entry("running", "2026", "Present");
  assert.deepEqual(roles(sortNewestFirst([done, running])), ["running", "done"]);
  // no end date is a single date, not a running one: the month then decides
  const single = entry("single", "2026");
  assert.deepEqual(roles(sortNewestFirst([single, done])), ["done", "single"]);
});

test("months order within a year, years order across, equal starts keep their order", () => {
  const list = [entry("may", "May 2025"), entry("y2024", "2024"), entry("oct", "Oct 2025"), entry("jan", "Jan 2025"), entry("y2026", "2026")];
  assert.deepEqual(roles(sortNewestFirst(list)), ["y2026", "oct", "may", "jan", "y2024"]);
  assert.deepEqual(roles(sortNewestFirst([entry("a", "2024"), entry("b", "2024"), entry("c", "2024")])), ["a", "b", "c"]);
});

test("sortNewestFirst returns a new array and leaves its input alone", () => {
  const list = [entry("old", "2020"), entry("new", "2025")];
  const before = [...list];
  const sorted = sortNewestFirst(list);
  assert.notEqual(sorted, list);
  assert.deepEqual(list, before);
  const real = [...experience];
  sortNewestFirst(experience);
  assert.deepEqual(experience, real);
});

test("groupByKind: no kind is work; education apart; order kept", () => {
  const list = [entry("w1", "2025"), entry("e1", "2024", undefined, "education"), entry("w2", "2023", undefined, "work")];
  const { work, education } = groupByKind(list);
  assert.deepEqual(roles(work), ["w1", "w2"]);
  assert.deepEqual(roles(education), ["e1"]);
  assert.deepEqual(groupByKind([]), { work: [], education: [] });
});

test("isCurrent is only an end of \"Present\"", () => {
  assert.equal(isCurrent(entry("a", "2026", "Present")), true);
  assert.equal(isCurrent(entry("b", "2024")), false);
  assert.equal(isCurrent(entry("c", "2024", "2025")), false);
});

test("the section: one stop, every entry at once, newest first, on one timeline; work or education in words", () => {
  assert.match(source, /sortNewestFirst\(experience\)\.map\(/);
  assert.match(source, /<ol[\s>]/);
  assert.match(source, /aria-label="Work and education, newest first"/);
  assert.match(source, /<article[\s>]/);
  assert.match(source, /<Heading level=\{3\}[\s\S]*?entry\.role/);
  assert.match(source, /entry\.highlights\.map\(/);
  assert.match(source, /entry\.location &&/);
  // The kind in words, not colour alone
  assert.match(source, /entry\.kind === "education" \? "Education" : "Work"/);
  // Three columns once the panel is wide enough, a line down the side before that
  assert.match(source, /@min-\[45\.5rem\]:grid-cols-3/);
  assert.match(source, /border-l border-accent-2\/60 pl-6/);
  assert.match(source, /data-current=\{isCurrent\(entry\) \|\| undefined\}/);
  assert.doesNotMatch(source, /<h2[\s>]/, "StationHead supplies the h2");
  assert.doesNotMatch(source, /"use client"/);
  // Not a row of panels any more (the metro line stays at the foot map)
  assert.doesNotMatch(source, /exp-stop|exp-label|exp-group|className="panel/);
  assert.doesNotMatch(read("app/page.tsx"), /section\("experience"\)\} row/);
});

test("dates: <time>, tabular figures, \"Present\" never in a <time>, \"Current\" only when running", () => {
  assert.match(source, /<time[\s>]/);
  assert.match(source, /tabular-nums/);
  assert.match(source, /entry\.endDate &&/);
  assert.match(source, /return date \? <time dateTime=\{date\}>\{value\}<\/time> : <>\{value\}<\/>/);
  assert.doesNotMatch(source, /<time[^>]*>\s*Present/);
  assert.doesNotMatch(source, />\s*Present\s*<|\?\?\s*"Present"|\|\|\s*"Present"/, "'Present' only comes from the data");
  assert.match(source, /\{isCurrent\(entry\) && \([\s\S]*?Current[\s\S]*?\)\}/);
  assert.equal(source.match(/>\s*Current\s*</g)?.length, 1);
});

test("no panel, no warm or retired colours, no place names, no fixed pixel widths", () => {
  for (const tag of source.matchAll(/<(ol|ul|article)\b[^>]*>/g)) assert.doesNotMatch(tag[0], /rounded|bg-panel/, tag[0]);
  assert.doesNotMatch(source, /rounded-\[var\(--radius/);
  assert.doesNotMatch(source, /lantern|amber|magenta/);
  assert.doesNotMatch(source, /<details/);
  assert.doesNotMatch(source, /Line \d|Lujiazui|Longtang|Century Avenue|Nanjing Road|The Bund/);
  assert.doesNotMatch(source, /\bw-\[\d+px\]|min-w-\[\d+px\]|max-w-\[\d+px\]|width:\s*\d+px/);
  assert.doesNotMatch(source, /grid-cols-\[[^\]]*\d+px/);
  assert.doesNotMatch(source, /animate-|transition/);
});

test("the résumé through ResumeLink, a glass key beside the heading", () => {
  assert.match(source, /import ResumeLink from "..\/..\/resume\/ResumeLink"/);
  assert.match(source, /export function ExperienceHead\(\)[\s\S]*<StationHead section=\{section\("experience"\)\} \/>[\s\S]*<ResumeLink className="glass">Résumé<\/ResumeLink>/);
  assert.doesNotMatch(source, /resumeUrl/);
});

test("machineDate gives machine values for the data's dates and undefined otherwise", () => {
  for (const e of experience) {
    for (const value of [e.startDate, e.endDate].filter(Boolean)) {
      const m = /^([A-Za-z]+)\.?\s+(\d{4})$/.exec(value);
      if (m) assert.match(machineDate(value), /^\d{4}-(0[1-9]|1[0-2])$/, value);
    }
  }
  assert.equal(machineDate("Oct 2026"), "2026-10");
  assert.equal(machineDate("Oct. 2026"), "2026-10");
  assert.equal(machineDate("Sept 2024"), "2024-09");
  assert.equal(machineDate("September 2024"), "2024-09");
  assert.equal(machineDate("2024"), "2024");
  assert.equal(machineDate("Present"), undefined);
  assert.equal(machineDate(""), undefined);
  assert.equal(machineDate("Summer 2025"), undefined);
});

test("the label is plain words: no box, no capitals; \"Current\" a word, with a comma for a screen reader", () => {
  const label = source.match(/<p className="-order-1[^"]*">[\s\S]*?<\/p>/)?.[0] ?? "";
  assert.ok(label, "the label line");
  assert.doesNotMatch(label, /uppercase|tracking-|exp-kind|border/);
  assert.match(label, /<span aria-hidden="true"> · <\/span>\s*<span className="sr-only">, <\/span>/);
  assert.doesNotMatch(read("app/city.css"), /\.exp-kind/, "the badge's box is gone");
});
