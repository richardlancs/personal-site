// The keyboard on the rows of choices (bench tabs, cabinets, timetable
// lines): see app/components/locations/selector.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { stepChoice } from "../app/components/locations/selector.ts";

test("arrows step along the row and wrap at its ends", () => {
  assert.equal(stepChoice("ArrowRight", 0, 3), 1);
  assert.equal(stepChoice("ArrowDown", 2, 3), 0);
  assert.equal(stepChoice("ArrowLeft", 0, 3), 2);
  assert.equal(stepChoice("ArrowUp", 1, 3), 0);
});

test("Home and End jump to the ends", () => {
  assert.equal(stepChoice("Home", 2, 4), 0);
  assert.equal(stepChoice("End", 0, 4), 3);
});

test("other keys, and an empty row, do nothing", () => {
  assert.equal(stepChoice("Enter", 1, 3), null);
  assert.equal(stepChoice("Tab", 1, 3), null);
  assert.equal(stepChoice("ArrowRight", 0, 0), null);
});
