// The Experience section (components/city2d/sections/Experience.tsx):
// plain dated rows, newest first, work and education apart; its order and
// grouping (lib/experience.ts) and its date helper (lib/machineDate.ts).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";

// lib/experience.ts imports "./machineDate" without an extension (the
// bundler's way); let Node find the .ts file for this test
registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (error?.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".")) return next(`${specifier}.ts`, context);
      throw error;
    }
  },
});

const { experience } = await import("../app/data/portfolio.ts");
const { machineDate } = await import("../app/lib/machineDate.ts");
const { sortNewestFirst, groupByKind, isCurrent } = await import("../app/lib/experience.ts");

const root = new URL("../", import.meta.url).pathname;
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

test("the section: two labelled groups of ordered rows, sorted and grouped by the helpers", () => {
  assert.match(source, /label: "Work"/);
  assert.match(source, /label: "Education"/);
  assert.ok(source.indexOf('"Work"') < source.indexOf('"Education"'), "Work comes before Education");
  assert.match(source, /aria-labelledby=\{group\.id\}/);
  assert.match(source, /groupByKind\(sortNewestFirst\(experience\)\)/);
  assert.match(source, /\.filter\(\(group\) => group\.entries\.length > 0\)/, "an empty group is not rendered");
  assert.match(source, /<ol[\s>]/);
  assert.match(source, /<article[\s>]/);
  assert.match(source, /<h3[\s>][\s\S]*?entry\.role/);
  assert.match(source, /entry\.highlights\.map\(/);
  assert.match(source, /entry\.location &&/);
  assert.doesNotMatch(source, /<h2[\s>]/, "the station supplies the h2");
  assert.doesNotMatch(source, /"use client"/);
  assert.match(source, /sm:grid-cols-\[10rem_minmax\(0,1fr\)\]/);
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
  assert.doesNotMatch(source, /\bpoints\b|<details/);
  assert.doesNotMatch(source, /Line \d|Lujiazui|Longtang|Century Avenue|Nanjing Road|The Bund/);
  assert.doesNotMatch(source, /\bw-\[\d+px\]|min-w-\[\d+px\]|max-w-\[\d+px\]|width:\s*\d+px/);
  assert.doesNotMatch(source, /grid-cols-\[[^\]]*\d+px/);
  assert.doesNotMatch(source, /animate-|transition/);
});

test("the résumé through ResumeLink, as a 44px text link", () => {
  assert.match(source, /import ResumeLink from "..\/..\/resume\/ResumeLink"/);
  assert.match(source, /<ResumeLink className="text-link text-link-solo">/);
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
