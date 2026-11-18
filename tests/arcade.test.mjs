// The arcade machine's rules: app/components/world3d/scenes/arcadeLogic.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { deal, handName, knightMoves, nextKnightSquare, shotGoesIn } from "../app/components/world3d/scenes/arcadeLogic.ts";

const c = (s) => s.split(" ").map((t) => ({ rank: { J: 11, Q: 12, K: 13, A: 14 }[t.slice(0, -1)] ?? Number(t.slice(0, -1)), suit: "shdc".indexOf(t.slice(-1)) }));

test("the knight hops in an L and stays on the board", () => {
  assert.deepEqual(knightMoves([0, 0]).sort(), [
    [1, 2],
    [2, 1],
  ]);
  assert.equal(knightMoves([2, 2]).length, 8);
  for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) for (const [a, b] of knightMoves([x, y])) assert.ok(a >= 0 && b >= 0 && a < 5 && b < 5);
});

test("pressing on moves the knight to a square it hasn't visited while there is one", () => {
  let at = [0, 0];
  const seen = new Set(["0,0"]);
  for (let k = 0; k < 10; k++) {
    const next = nextKnightSquare(at, seen);
    assert.ok(knightMoves(at).some(([a, b]) => a === next[0] && b === next[1]), "a legal hop");
    assert.ok(!seen.has(next.join(",")), "a new square");
    seen.add(next.join(","));
    at = next;
  }
});

test("poker hands are named", () => {
  assert.equal(handName(c("10s Js Qs Ks As")), "Royal flush");
  assert.equal(handName(c("5h 6h 7h 8h 9h")), "Straight flush");
  assert.equal(handName(c("9s 9h 9d 9c 2s")), "Four of a kind");
  assert.equal(handName(c("3s 3h 3d Kc Ks")), "Full house");
  assert.equal(handName(c("2d 7d 9d Jd Kd")), "Flush");
  assert.equal(handName(c("As 2h 3d 4c 5s")), "Straight");
  assert.equal(handName(c("7s 7h 7d 2c 9s")), "Three of a kind");
  assert.equal(handName(c("4s 4h Jd Jc 9s")), "Two pair");
  assert.equal(handName(c("Qs Qh 3d 8c 9s")), "One pair");
  assert.equal(handName(c("2s 5h 9d Jc Ks")), "High card");
});

test("a deal is five different cards, the same for the same count", () => {
  const hand = deal(3);
  assert.equal(new Set(hand.map((x) => `${x.rank}${x.suit}`)).size, 5);
  assert.deepEqual(deal(3), hand);
  assert.notDeepEqual(deal(4), hand);
});

test("most shots go in, some rattle out", () => {
  const made = Array.from({ length: 60 }, (_, n) => shotGoesIn(n)).filter(Boolean).length;
  assert.ok(made > 30 && made < 55, `${made} of 60`);
});
