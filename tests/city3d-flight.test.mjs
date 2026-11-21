// The flight between places (docs/superpowers/plans/2026-11-21-city-
// painted-25d.md, Task 3): its plan and its moments (flight.def.ts, pure),
// and at the source level the Director that runs it (City3D.tsx) and what
// draws it (Flight.tsx, kit/flight.ts).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  AERIAL,
  AERIAL_PLACE,
  CROSS,
  FLIGHT_ORIGIN,
  CRUISE_ALT,
  LIFT_SCALE,
  LOW_ALT,
  MAP,
  crossAt,
  flightAt,
  flightFrom,
  flightLength,
  flightPlan,
  riseAt,
  travelKind,
} from "../app/components/city3d/flight.def.ts";
import { checkPlace, sceneOrder, scenes } from "../app/components/city3d/scenes.ts";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const noComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

const pairs = sceneOrder.flatMap((a) => sceneOrder.filter((b) => b !== a).map((b) => [a, b]));
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const sameUV = (a, b, eps = 1e-9) => near(a[0], b[0], eps) && near(a[1], b[1], eps);

test("every place has its point on the aerial painting, inside it, each its own", () => {
  assert.deepEqual(Object.keys(MAP).sort(), [...sceneOrder].sort());
  for (const [id, [u, v]] of Object.entries(MAP)) {
    assert.ok(u > 0.05 && u < 0.95 && v > 0.05 && v < 0.95, `${id}: ${u}, ${v}`);
  }
  const pts = Object.values(MAP);
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) assert.ok(!sameUV(pts[i], pts[j], 0.02));
  assert.equal(AERIAL.painting, "aerial");
  // the aerial is a sound plate, far from every place
  assert.deepEqual(checkPlace(AERIAL_PLACE), []);
  assert.equal(AERIAL_PLACE.plate.painting, "aerial");
  for (const id of sceneOrder) assert.ok(Math.hypot(...scenes[id].offset.map((x, i) => x - FLIGHT_ORIGIN[i])) > 1200 + 300, id);
  assert.ok(near(AERIAL.aspect, 1672 / 941));
});

test("a flight is 2 to 3 s, lift, cruise and descent, between any two places", () => {
  for (const [a, b] of pairs) {
    const p = flightPlan(a, b);
    const total = p.lift + p.cruise + p.descend;
    assert.ok(total >= 2 && total <= 3, `${a} → ${b}: ${total.toFixed(2)} s`);
    assert.ok(p.lift > 0 && p.cruise > 0 && p.descend > 0, `${a} → ${b}`);
    assert.equal(flightLength(p), total);
    assert.ok(riseAt(p) < crossAt(p) && crossAt(p) < total);
  }
});

test("the path starts at the place left and ends at the one arrived at", () => {
  for (const [a, b] of pairs) {
    const p = flightPlan(a, b);
    assert.ok(sameUV(p.path[0], MAP[a]), `${a} → ${b} starts`);
    assert.ok(sameUV(p.path.at(-1), MAP[b]), `${a} → ${b} ends`);
    // and the moments say the same
    assert.ok(sameUV(flightAt(p, 0).at, MAP[a]));
    assert.ok(sameUV(flightAt(p, flightLength(p)).at, MAP[b]));
    for (const q of p.path) assert.ok(q[0] >= 0 && q[0] <= 1 && q[1] >= 0 && q[1] <= 1, `${a} → ${b}: ${q}`);
  }
});

test("still view and reduced motion are a cut; arriving opens; the same place stays", () => {
  assert.equal(travelKind("lujiazui", "towers", true), "cut");
  assert.equal(travelKind(null, "towers", true), "cut");
  assert.equal(travelKind(null, "towers", false), "open");
  assert.equal(travelKind("towers", "towers", false), "stay");
  assert.equal(travelKind("towers", "bund", false), "fly");
  // (still view follows prefers-reduced-motion: lib/still.ts, store.ts)
  assert.match(read("app/components/city3d/store.ts"), /systemStill/);
  const city = noComments(read("app/components/city3d/City3D.tsx"));
  assert.match(city, /travelKind\(from, to, holdingStill\(\)\)/);
  assert.match(city, /if \(kind === "cut"\) \{\s*s\.queue = \[\{ kind: "swap", scene: to, pose: final \}\];/);
});

test("smooth: the clouds, the height and the point under the camera never jump", () => {
  for (const [a, b] of pairs) {
    const p = flightPlan(a, b);
    let last = flightAt(p, 0);
    assert.equal(last.veil, 0);
    assert.equal(last.scale, 1);
    for (let t = 1 / 120; t <= flightLength(p) + 1e-9; t += 1 / 120) {
      const s = flightAt(p, t);
      assert.ok(Math.abs(s.veil - last.veil) < 0.08, `${a} → ${b} veil at ${t.toFixed(3)}`);
      if (s.stage === last.stage) {
        assert.ok(Math.abs(s.scale - last.scale) < 0.02, `${a} → ${b} scale at ${t.toFixed(3)}`);
        assert.ok(Math.hypot(s.at[0] - last.at[0], s.at[1] - last.at[1]) < 0.02, `${a} → ${b} point at ${t.toFixed(3)}`);
        assert.ok(Math.abs(s.alt - last.alt) < 0.02, `${a} → ${b} height at ${t.toFixed(3)}`);
        assert.ok(Math.abs(s.roll - last.roll) < 0.01, `${a} → ${b} bank at ${t.toFixed(3)}`);
      } else {
        // a stage changes only under closed clouds
        assert.ok(s.veil > 0.97 && last.veil > 0.97, `${a} → ${b}: ${last.stage} → ${s.stage} at veil ${s.veil}`);
      }
      last = s;
    }
    const end = flightAt(p, flightLength(p));
    assert.ok(end.done && end.veil === 0 && end.scale === 1);
    assert.ok(last.veil < 0.02 && Math.abs(last.scale - 1) < 0.01);
  }
});

test("lift, cruise, descent: the picture pulls back, the flight climbs and banks gently, and comes down into the next place", () => {
  const p = flightPlan("lujiazui", "towers");
  const lifted = flightAt(p, p.lift - 1e-6);
  assert.equal(lifted.stage, "from");
  assert.ok(lifted.scale < 0.9 && near(lifted.scale, LIFT_SCALE, 0.01));
  const mid = flightAt(p, p.lift + p.cruise / 2);
  assert.equal(mid.stage, "air");
  assert.ok(near(mid.alt, CRUISE_ALT, 1e-6) && mid.veil === 0);
  assert.ok(Math.abs(mid.roll) > 0.05 && Math.abs(mid.roll) <= 0.15, `bank ${mid.roll}`);
  assert.ok(Math.abs(flightAt(p, p.lift).roll) < 1e-9);
  assert.ok(flightAt(p, p.lift).alt === LOW_ALT);
  const crossing = flightAt(p, crossAt(p) + 1e-6);
  assert.equal(crossing.stage, "to");
  assert.ok(crossing.veil > 0.99 && near(crossing.scale, LIFT_SCALE, 0.01));
  assert.ok(flightAt(p, crossAt(p) - 1e-6).alt < CRUISE_ALT);
  assert.ok(CROSS > 0 && CROSS < 1);
  // The bank turns into the curve: a flight and its way back bank opposite ways
  for (const [a, b] of pairs) {
    const there = flightPlan(a, b).bank, back = flightPlan(b, a).bank;
    assert.ok(Math.abs(there) > 0.05, `${a} → ${b} banks`);
    assert.equal(Math.sign(there), -Math.sign(back), `${a} ⇄ ${b}`);
  }
});

test("another choice mid-cruise starts the new flight where the camera is, replaces the old one, never goes back to its start", () => {
  const p = flightPlan("lujiazui", "towers");
  for (const k of [0.1, 0.35, 0.5, 0.8]) {
    const t = p.lift + p.cruise * k;
    const was = flightAt(p, t);
    const q = flightFrom(p, t, "lujiazui", "bund");
    assert.equal(q.lift, 0, "already up: no lift again");
    assert.ok(sameUV(q.path[0], was.at), `starts at the current point (k ${k})`);
    assert.ok(sameUV(q.path.at(-1), MAP.bund));
    const now = flightAt(q, 0);
    assert.ok(sameUV(now.at, was.at) && near(now.alt, was.alt) && near(now.veil, was.veil), `no jump (k ${k})`);
    const total = flightLength(q);
    assert.ok(total <= 3, `${total}`);
  }
  // Turned back toward the place it left: flies back from where it is
  const back = flightFrom(p, p.lift + p.cruise * 0.5, "lujiazui", "lujiazui");
  assert.equal(back.lift, 0);
  assert.ok(sameUV(back.path[0], flightAt(p, p.lift + p.cruise * 0.5).at));
  assert.ok(sameUV(back.path.at(-1), MAP.lujiazui));
  // In the descent, before crossing: still in the air, from there
  const d = flightFrom(p, crossAt(p) - 0.05, "lujiazui", "metro");
  assert.equal(d.lift, 0);
  assert.ok(near(flightAt(d, 0).veil, flightAt(p, crossAt(p) - 0.05).veil));
});

test("another choice while lifting out or arriving continues from the clouds as they are", () => {
  const p = flightPlan("towers", "bund");
  // Lifting out of Projects, then Projects again: the clouds part, nothing flies
  const t = p.lift * 0.5;
  const was = flightAt(p, t);
  const back = flightFrom(p, t, "towers", "towers");
  assert.ok(back.back && back.cruise === 0 && back.descend === 0);
  assert.ok(near(flightAt(back, 0).veil, was.veil) && near(flightAt(back, 0).scale, was.scale));
  const settled = flightAt(back, back.lift);
  assert.ok(settled.done && settled.veil === 0 && settled.scale === 1);
  // Lifting out, then somewhere else: the lift goes on from where it is, shorter
  const other = flightFrom(p, t, "towers", "metro");
  assert.ok(other.lift < p.lift && other.lift > 0);
  assert.ok(near(flightAt(other, 0).veil, was.veil) && near(flightAt(other, 0).scale, was.scale));
  // Arriving in Contact (crossed), then About: lifts out of Contact from the clouds as they are
  const tt = crossAt(p) + 0.1;
  const arriving = flightAt(p, tt);
  assert.equal(arriving.stage, "to");
  const on = flightFrom(p, tt, "bund", "longtang");
  assert.equal(on.from, "bund");
  assert.ok(near(flightAt(on, 0).veil, arriving.veil) && near(flightAt(on, 0).scale, arriving.scale));
});

test("the Director flies: one flight at a time, the swap waits for the place under the clouds, the aerial on the flight's own lens", () => {
  const city = noComments(read("app/components/city3d/City3D.tsx"));
  // a new choice replaces the flight (from where it is), never stacks one behind it
  assert.match(city, /s\.queue = \[\{ kind: "fly", plan: flightFrom\(/);
  assert.match(city, /s\.queue = \[\{ kind: "fly", plan: flightPlan\(from, to\)/);
  assert.doesNotMatch(city, /s\.queue\.push\(\{ kind: "fly"/);
  // the crossing waits (at most WAIT_FOR_PLACE_MS) for a place still building or painting
  assert.match(city, /placePending\(place\)/);
  assert.match(city, /if \(!p\.back && t >= crossAt\(p\) && s\.active !== p\.to\) \{/);
  // the old journeys are gone
  assert.doesNotMatch(city, /routesFromRiverside/);
  // the bank rolls the camera after it looks
  assert.match(city, /camera\.lookAt\(tmp\.l\);\s*if \(s\.roll\) camera\.rotateZ\(s\.roll\);/);
  assert.match(city, /<Flight tier=\{tier\} \/>/);
});

test("Flight.tsx: the aerial as a plate, clouds from the kit, one layer on phones, nothing drawn at rest", () => {
  const flight = noComments(read("app/components/city3d/Flight.tsx"));
  assert.match(flight, /buildPlate\(/);
  assert.match(flight, /buildPlate\(AERIAL_PLACE, tier\)/);
  assert.match(flight, /tier === "mobile" \? 1 : 2/);
  assert.match(flight, /veil\.visible = /);
  const kit = noComments(read("app/components/city3d/kit/flight.ts"));
  assert.match(kit, /shared\(materialKey\("flight-veil"/);
  assert.match(kit, /shared\(materialKey\("flight-cloud"/);
  assert.doesNotMatch(kit + flight, /Math\.random/);
});
