// Home, the rooftop view (districts/lujiazui.def.ts on the plate,
// Riverside.tsx): its data is sound, the five sections' spots stand on
// the places the painting shows, and on a 1440 × 900 screen they clear
// the card, the bar and the dock, 8 px apart, as City3D.tsx frames the
// view and kit/plate.ts (cover) fits the painting to it.
import assert from "node:assert/strict";
import { test } from "node:test";
import { checkPlace, driftTravel, isPlace, scenes } from "../app/components/city3d/scenes.ts";
import lujiazui, { groundDepth, HOME_SIGNS } from "../app/components/city3d/districts/lujiazui.def.ts";

const SECTIONS = ["about", "experience", "projects", "interests", "contact"];
const box = (quad) => {
  const us = quad.map((c) => c[0]), vs = quad.map((c) => c[1]);
  return { u0: Math.min(...us), u1: Math.max(...us), v0: Math.min(...vs), v1: Math.max(...vs) };
};

test("Home is a painted place on the rooftop painting, and its data is sound", () => {
  assert.equal(scenes.lujiazui, lujiazui);
  assert.ok(isPlace(lujiazui));
  assert.deepEqual(checkPlace(lujiazui), []);
  assert.equal(lujiazui.plate.painting, "rooftop");
  assert.equal(lujiazui.plate.aspect, 1672 / 941);
  // the home pose is the painting's frame, its lens the painting's
  assert.deepEqual(lujiazui.plateFrame.pos, lujiazui.home.pos);
  assert.deepEqual(lujiazui.plateFrame.target, lujiazui.home.target);
  assert.equal(lujiazui.plateFrame.fov, lujiazui.fov);
  assert.ok(driftTravel(lujiazui.plate.drift) < 0.01);
  assert.deepEqual(Object.keys(lujiazui.focus), [], "Home's panel has no picker");
  for (const kind of ["sky", "water", "glass", "wet"]) assert.ok(lujiazui.plate.regions.some((r) => r.kind === kind), kind);
});

test("the five sections' spots are the plate's spots, each on its place in the painting, its board inside it", () => {
  assert.deepEqual(Object.keys(lujiazui.plate.spots).sort(), [...SECTIONS].sort());
  assert.deepEqual(Object.keys(HOME_SIGNS).sort(), [...SECTIONS].sort());
  for (const id of SECTIONS) {
    const s = HOME_SIGNS[id];
    assert.equal(lujiazui.plate.spots[id], s.spot);
    const b = box(s.spot);
    assert.ok(b.u0 < s.label[0] && s.label[0] < b.u1 && b.v0 < s.label[1] && s.label[1] <= b.v1, `${id}: its board stands on its spot`);
    assert.ok(s.size >= 0.03 && s.size <= 0.05, `${id}: board size`);
  }
  // what each one is on (read off rooftop-day.webp)
  const at = (id, u, v) => {
    const b = box(HOME_SIGNS[id].spot);
    assert.ok(b.u0 <= u && u <= b.u1 && b.v0 <= v && v <= b.v1, `${id} covers (${u}, ${v})`);
  };
  at("projects", 0.689, 0.2); // Jin Mao
  at("projects", 0.728, 0.2); // the World Financial Center
  at("projects", 0.786, 0.2); // Shanghai Tower
  at("experience", 0.56, 0.69); // the train on the metro line
  at("about", 0.5, 0.8); // the old lane's roofs
  at("interests", 0.84, 0.72); // the shopping street
  at("contact", 0.4, 0.56); // the riverfront building right of the clock tower
  // no two overlap
  for (const a of SECTIONS)
    for (const b of SECTIONS) {
      if (a >= b) continue;
      const p = box(HOME_SIGNS[a].spot), q = box(HOME_SIGNS[b].spot);
      assert.ok(p.u1 <= q.u0 || q.u1 <= p.u0 || p.v1 <= q.v0 || q.v1 <= p.v0, `${a} and ${b} overlap`);
    }
  // spots sit at the depth of what they're on
  assert.equal(HOME_SIGNS.about.spot[0][2], +groundDepth((0.748 + 0.885) / 2).toFixed(3));
});

// Where a painting point lands on a wide screen: City3D.tsx's framing
// (the view's middle in the part the card leaves, the place's lens, no
// span) and kit/plate.ts's cover (the least growth that fills the view,
// then the least slide off the painting's middle)
function project(def, W, H, panelRight) {
  const tan = (d) => Math.tan((d * Math.PI) / 180);
  const hh = tan(def.fov / 2), hw = hh * (W / H);
  const [l, r] = [panelRight + 12, W - 12];
  const shift = 0.5 - (l + r) / 2 / W;
  const x0 = hw * (-1 + 2 * shift), x1 = hw * (1 + 2 * shift);
  const Hp = 2 * tan(def.plateFrame.fov / 2), Wp = Hp * def.plate.aspect;
  const m = 1.004 + 2.4 * def.plate.drift.amplitude;
  const ww = (x1 - x0) * m, wh = 2 * hh * m;
  const s = Math.max(1, ww / Wp, wh / Hp);
  const room = Math.max(0, (s * Wp - ww) / 2);
  const mid = (x0 + x1) / 2;
  const cx = Math.min(mid + room, Math.max(mid - room, 0));
  return (u, v) => [((cx + (u - 0.5) * Wp * s - x0) / (x1 - x0)) * W, ((hh - (0.5 - v) * Hp * s) / (2 * hh)) * H];
}

test("at 1440 × 900 every spot stands right of the card, under the bar, over the dock, 8 px from the others, at least 44 px", () => {
  // (as measured on the dev server: the card's right edge, the bar's
  // bottom, the dock's top)
  const [W, H, card, bar, dock] = [1440, 900, 568, 68, 818];
  const at = project(lujiazui, W, H, card);
  const rects = SECTIONS.map((id) => {
    const b = box(HOME_SIGNS[id].spot);
    const [l, t] = at(b.u0, b.v0), [r, f] = at(b.u1, b.v1);
    return { id, l, t, r, b: f };
  });
  for (const q of rects) {
    assert.ok(q.l >= card + 8, `${q.id}: left ${q.l.toFixed(0)} clears the card`);
    assert.ok(q.r <= W - 4, `${q.id}: right ${q.r.toFixed(0)}`);
    assert.ok(q.t >= bar + 4, `${q.id}: top ${q.t.toFixed(0)} under the bar`);
    assert.ok(q.b <= dock - 8, `${q.id}: foot ${q.b.toFixed(0)} over the dock`);
    assert.ok(q.r - q.l >= 44 && q.b - q.t >= 44, `${q.id}: 44 px`);
  }
  for (const p of rects)
    for (const q of rects) {
      if (p.id >= q.id) continue;
      const apart = p.r + 8 <= q.l || q.r + 8 <= p.l || p.b + 8 <= q.t || q.b + 8 <= p.t;
      assert.ok(apart, `${p.id} and ${q.id} 8 px apart`);
    }
  // the subject, right of the card: the Pearl and the supertalls, the
  // train, the shopping street's start
  for (const [u, v] of [[0.559, 0.2], [0.786, 0.2], [0.56, 0.69], [0.82, 0.7]]) assert.ok(at(u, v)[0] > card && at(u, v)[0] < W, `(${u}, ${v})`);
});

test("the movers: a train on the metro line, boats on the river, traffic, slow aircraft lights on the four tops", () => {
  const movers = lujiazui.plate.movers;
  const kinds = (k) => movers.filter((m) => m.kind === k);
  // the train: a row of lights along the viaduct, through the painted train
  const train = movers[0];
  assert.equal(train.kind, "boat");
  assert.ok(train.count >= 5);
  assert.ok(train.path.some(([u, v]) => u > 0.47 && u < 0.65 && v > 0.64 && v < 0.72));
  // boats on the water, traffic on the streets
  assert.ok(kinds("boat").length >= 3);
  assert.ok(kinds("trail").length >= 3);
  // a beacon on each of the four tops, swelling over seconds, never a blink
  const [beacon] = kinds("beacon");
  assert.equal(beacon.path.length, 4);
  assert.ok(beacon.period >= 4);
  // every one after dark only, and at most 60 lights in all
  for (const m of movers) assert.notEqual(m.night, false);
  const lights = movers.reduce((n, m) => n + (m.kind === "beacon" ? m.path.length : (m.count ?? (m.kind === "trail" ? 12 : 1))), 0);
  assert.ok(lights <= 60, `${lights} lights`);
});
