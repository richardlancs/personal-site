// The Experience station (components/city2d/sections/Experience.tsx): the
// departure board of work and education, and its date helper.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { experience } from "../app/data/portfolio.ts";
import { machineDate } from "../app/lib/machineDate.ts";

const root = new URL("../", import.meta.url).pathname;
const source = readFileSync(`${root}app/components/city2d/sections/Experience.tsx`, "utf8");

test("the board maps every experience entry into an article with an h3", () => {
  assert.match(source, /experience\.map\(/);
  assert.match(source, /<article[\s>]/);
  assert.match(source, /<h3[\s>][\s\S]*?entry\.role/);
  assert.match(source, /entry\.organization/);
  assert.match(source, /import \{ machineDate \} from "..\/..\/..\/lib\/machineDate"/);
  assert.match(source, /entry\.highlights\.map\(/);
  assert.match(source, /<ul[\s>]/);
  assert.doesNotMatch(source, /<h2[\s>]/, "the station supplies the h2");
  assert.doesNotMatch(source, /"use client"/);
});

test("dates are <time>, and the end date and location are conditional", () => {
  assert.match(source, /<time[\s>]/);
  assert.match(source, /entry\.endDate &&/);
  assert.match(source, /entry\.location &&/);
  assert.match(source, /tabular-nums/);
  assert.doesNotMatch(source, />\s*Present\s*<|\?\?\s*"Present"|\|\|\s*"Present"/, "no 'Present' invented; it only comes from the data");
});

test("no fixed pixel widths", () => {
  assert.doesNotMatch(source, /\bw-\[\d+px\]|min-w-\[\d+px\]|max-w-\[\d+px\]|width:\s*\d+px/);
  assert.doesNotMatch(source, /grid-cols-\[[^\]]*\d+px/);
});

test("machineDate gives machine values for the data's dates and undefined otherwise", () => {
  for (const entry of experience) {
    for (const value of [entry.startDate, entry.endDate].filter(Boolean)) {
      const m = /^([A-Za-z]+)\.?\s+(\d{4})$/.exec(value);
      if (m) assert.match(machineDate(value), /^\d{4}-(0[1-9]|1[0-2])$/, value);
    }
  }
  assert.equal(machineDate("Oct. 2026"), "2026-10");
  assert.equal(machineDate("May 2025"), "2025-05");
  assert.equal(machineDate("Sept. 2024"), "2024-09");
  assert.equal(machineDate("September 2024"), "2024-09");
  assert.equal(machineDate("2024"), "2024");
  assert.equal(machineDate("Present"), undefined);
  assert.equal(machineDate(""), undefined);
  assert.equal(machineDate("Summer 2025"), undefined);
  assert.equal(machineDate("Mayday 2025"), undefined);
});
