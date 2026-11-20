// The interests station (components/city2d/sections/Interests.tsx): one
// card per interest from app/data/portfolio.ts, written out, no game.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { interests } from "../app/data/portfolio.ts";

const root = new URL("../", import.meta.url).pathname;
const source = readFileSync(`${root}app/components/city2d/sections/Interests.tsx`, "utf8");

test("every interest is a card with its name in an h3 and its description", () => {
  assert.ok(interests.length > 0);
  assert.match(source, /import\s*\{[^}]*\binterests\b[^}]*\}\s*from\s*"[./]+\/data\/portfolio"/);
  assert.match(source, /interests\.map\(/);
  assert.match(source, /<h3[^>]*>\s*\{interest\.name\}\s*<\/h3>/);
  assert.match(source, /\{interest\.description\}/);
  assert.match(source, /^export default function Interests\(\)/m);
  assert.doesNotMatch(source, /^["']use client["']/m, "a server component");
});

test("no game, no canvas, no link to the 3D city", () => {
  assert.doesNotMatch(source, /canvas/i);
  assert.doesNotMatch(source, /<a\s[^>]*href=["'{`]*\/city/);
  assert.doesNotMatch(source, /three|@react-three/);
});

test("every mark is hidden from assistive technology", () => {
  const svgs = source.match(/<svg\b[^>]*>/g) ?? [];
  for (const svg of svgs) assert.match(svg, /aria-hidden="true"/, svg);
});

test("no fixed pixel widths and no emoji", () => {
  assert.doesNotMatch(source, /\bw-\[\d+(\.\d+)?px\]/);
  assert.doesNotMatch(source, /\bwidth:\s*\d+(\.\d+)?px/);
  assert.doesNotMatch(source, /\p{Extended_Pictographic}/u);
});

test("each card has an accent edge, alternating cyan and lantern from one list", () => {
  const list = source.match(/const accents = \[([\s\S]*?)\];/)?.[1] ?? "";
  assert.deepEqual([...list.matchAll(/colour: "([a-z]+)"/g)].map((m) => m[1]), ["cyan", "lantern"], "the one list of accents, in order");
  for (const colour of ["cyan", "lantern"]) assert.match(source, new RegExp(`border-t-${colour}\\b`));
  assert.match(source, /accents\[i % accents\.length\]/, "the rotation reads the list");
  assert.match(source, /bg-panel/);
});
