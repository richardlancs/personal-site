// Which of the 3D city's windows are lit at what hour
// (app/lib/cityWindows.ts), so the 3D city agrees with the 2D paintings.
import assert from "node:assert/strict";
import { test } from "node:test";
import { FLOOR_WEIGHT, litShare, localHour, previewHour, SHARE_STEP, WINDOW_HASH_GLSL, WINDOW_LIT_GLSL, windowHash, windowLit, windowScore } from "../app/lib/cityWindows.ts";

test("Richmond Hill's hour, as a number", () => assert.equal(localHour(Date.UTC(2026, 10, 20, 17, 30), "America/Toronto"), 12.5));
test("few windows by day, most in the evening, fewer before dawn", () => {
  assert.ok(litShare(12) <= 0.08);
  assert.ok(litShare(21) >= 0.45 && litShare(21) <= 0.55);
  assert.ok(litShare(4) <= 0.3 && litShare(4) >= 0.15);
});
test("the share moves in steps of 1/16, at most one step per quarter hour", () => {
  for (let h = 0; h < 24; h += 0.25) {
    const a = litShare(h), b = litShare((h + 0.25) % 24);
    assert.equal(Math.round(a * 16), a * 16);
    assert.ok(Math.abs(a - b) <= 1 / 16 + 1e-9, `${h}`);
  }
});
test("a window's state is its own hash: stable, and lit windows only grow with the share", () => {
  for (let f = 0; f < 40; f++) for (let b = 0; b < 12; b++) {
    assert.equal(windowLit(f, b, 7, 0.5), windowLit(f, b, 7, 0.5));
    if (windowLit(f, b, 7, 0.25)) assert.ok(windowLit(f, b, 7, 0.5));
  }
});
test("a wild hour is wrapped, not NaN", () => { for (const h of [NaN, -1, 25, Infinity]) assert.ok(Number.isFinite(litShare(h))); });
test("a previewed night has night windows", () => assert.ok(litShare(previewHour({ preset: "clear", daylight: "night", progress: 0.5, source: "preview" })) >= 0.4));

// Beyond the brief's cases

test("the local hour follows daylight saving and runs 0 up to 24", () => {
  // July: Toronto is UTC-4; midnight is 0, not 24
  assert.equal(localHour(Date.UTC(2026, 6, 1, 4, 0), "America/Toronto"), 0);
  assert.equal(localHour(Date.UTC(2026, 6, 1, 3, 45), "America/Toronto"), 23.75);
  assert.equal(localHour(NaN, "America/Toronto"), 0);
});

test("the curve passes through its points, and wraps", () => {
  const q = (s) => Math.round(s * 16) / 16;
  assert.equal(litShare(6), q(0.2));
  assert.equal(litShare(13), q(0.06));
  assert.equal(litShare(21), 0.5);
  assert.equal(litShare(1), q(0.32));
  assert.equal(litShare(-1), litShare(23));
  assert.equal(litShare(25), litShare(1));
  assert.equal(litShare(24), litShare(0));
  assert.equal(SHARE_STEP, 1 / 16);
});

test("the hash is deterministic, in 0..1, and spread evenly", () => {
  assert.equal(windowHash(3, 4, 7), windowHash(3, 4, 7));
  assert.notEqual(windowHash(3, 4, 7), windowHash(3, 4, 8));
  let lit = 0, n = 0;
  for (let f = 0; f < 80; f++) for (let b = 0; b < 25; b++) {
    const h = windowHash(f, b, 11);
    assert.ok(h >= 0 && h < 1);
    n++;
    if (windowLit(f, b, 11, 0.3)) lit++;
  }
  assert.ok(Math.abs(lit / n - 0.3) < 0.03, `${lit / n}`);
  // Nothing lit at 0, everything at 1
  assert.equal(windowLit(5, 5, 1, 0), false);
  assert.equal(windowLit(5, 5, 1, 1), true);
});

test("the GLSL twin uses the same constants and shifts", () => {
  for (const c of ["0x27d4eb2du", "0x165667b1u", "0x9e3779b9u", "0x7feb352du", "0x846ca68bu", "h >> 16u", "h >> 15u", "h >> 8u", "16777216.0"])
    assert.ok(WINDOW_HASH_GLSL.includes(c), c);
});

test("previewed phases stand for their hours: day plates almost dark, night plates lit", () => {
  assert.equal(previewHour({ daylight: "day", progress: 0.5 }), 12);
  assert.equal(previewHour({ daylight: "dawn", progress: 0.5 }), 5.5);
  assert.equal(previewHour({ daylight: "dusk", progress: 1 }), 20);
  assert.equal(previewHour({ daylight: "dusk", progress: NaN }), 18);
  assert.ok(litShare(previewHour({ daylight: "day", progress: 0 })) <= 0.08);
});

test("windows light by floors: most floors mostly lit or mostly dark, the share still exact", () => {
  // At a night's share, a floor's windows are mostly one way: the floors
  // read as lit bands, not as static
  const share = 0.5;
  let banded = 0;
  const floors = 200;
  for (let f = 0; f < floors; f++) {
    let lit = 0;
    for (let b = 0; b < 20; b++) if (windowLit(f, b, 5, share)) lit++;
    if (lit <= 4 || lit >= 16) banded++;
  }
  assert.ok(banded / floors > 0.7, `${banded / floors}`);
  // The score is spread evenly: a share lights that share
  let n = 0, under = 0;
  for (let f = 0; f < 120; f++) for (let b = 0; b < 30; b++) {
    const s = windowScore(f, b, 3);
    assert.ok(s >= 0 && s <= 1);
    n++;
    if (s < 0.2) under++;
  }
  assert.ok(Math.abs(under / n - 0.2) < 0.04, `${under / n}`);
});

test("the GLSL score uses the same weight and the floor's hash", () => {
  assert.ok(WINDOW_LIT_GLSL.includes(FLOOR_WEIGHT.toFixed(4)));
  assert.match(WINDOW_LIT_GLSL, /windowHash\(floorIndex, -7, seed\)/);
  assert.match(WINDOW_LIT_GLSL, /windowHash\(floorIndex, bay, seed\)/);
});
