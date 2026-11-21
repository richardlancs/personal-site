// Interests, the pedestrian street, as a painted place
// (districts/nanjing-road.tsx wraps PlatePlace; its data is
// districts/nanjing-road.def.ts): the def is sound by checkPlace, the
// depth is a street (facades and paving come out, the sky and skyline
// stay back, the arcade's front one flat layer), the machine's screen is
// the one spot and lies on the painted screen in both paintings, the
// walk up to the machine keeps the painting filling a wide screen, and
// the component draws the live machine there, from the interests only.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const noComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const src = noComments(read("app/components/city3d/districts/nanjing-road.tsx"));
const defSrc = noComments(read("app/components/city3d/districts/nanjing-road.def.ts"));
const machine = noComments(read("app/components/city3d/arcade/arcadeMachine.ts"));
const plateSrc = read("app/components/city3d/kit/plate.ts");

const { scenes, isPlace, checkPlace, driftTravel } = await import("../app/components/city3d/scenes.ts");
const { streetDepth, SCREEN, NANJING } = await import("../app/components/city3d/districts/nanjing-road.def.ts");
const def = scenes["nanjing-road"];

test("the def is a painted place on the street's painting, and sound", () => {
  assert.ok(isPlace(def), "a plate");
  assert.deepEqual(checkPlace(def), []);
  assert.equal(def.plate.painting, "nanjing-road");
  assert.equal(def.plate.aspect, 2400 / 1032, "the paintings' shape");
  assert.ok(driftTravel(def.plate.drift) < 0.01, "drift under 1% in 10 s");
  assert.doesNotMatch(defSrc, /from "three"|portfolio/, "no three.js or content in the def");
  const art = read("app/components/city3d/kit/plateArt.ts");
  for (const f of ["nanjing-road-day.webp", "nanjing-road-night.webp", "masks/nanjing-road-light.webp", "masks/nanjing-road-sky.webp"]) assert.match(art, new RegExp(f.replace(".", "\\.")), f);
});

test("home is the painting's frame, its lens a little narrower (never grown on a wide screen); the arrival comes from in front", () => {
  assert.deepEqual(def.home.pos, def.plateFrame.pos);
  assert.deepEqual(def.home.target, def.plateFrame.target);
  assert.ok(def.fov < def.plateFrame.fov, "the painting stands larger than the wide lens");
  // a phone's lens (1.2 × the place's, City3D.tsx) is no wider than the painting's
  assert.ok(def.fov * 1.2 <= def.plateFrame.fov + 1e-9);
  const d = def.home.target.map((t, i) => t - def.home.pos[i]);
  const len = Math.hypot(...d);
  for (const pose of [def.enter, def.exit]) {
    const along = pose.pos.reduce((a, p, i) => a + (p - def.home.pos[i]) * d[i], 0) / len;
    assert.ok(along > 0 && along < 0.2 * len, `${along.toFixed(3)} ahead of home`);
    // looking the same way as home, so the painting stays square to the eye
    const dir = pose.target.map((t, i) => t - pose.pos[i]);
    assert.ok(Math.abs(dir[0]) < 1e-9 && Math.abs(dir[1]) < 1e-9 && dir[2] < 0);
  }
});

test("no riverside sign (Home's spot for Interests is Home's own data); framed on the left, its panel on the right, aimed at the machine", () => {
  assert.ok(!("sign" in def));
  assert.equal(def.frame, "left");
  assert.deepEqual(def.plate.look, [0.12, 0.5]);
  const css = read("app/city/city-pages.css");
  assert.match(css, /\.city-page\[data-section="interests"\] \.city-panel \{\s*margin: 1\.5rem 1\.5rem 6\.5rem auto;/);
});

test("the depth is a street: facades and paving come out, nearer toward the frame's edges; the sky stays back; the arcade is one layer", () => {
  // the sky between the roofs, the skyline, the street's far end
  assert.equal(streetDepth(0.6, 0.1), 0);
  assert.equal(streetDepth(0.597, 0.3), 0, "the Pearl");
  assert.ok(streetDepth(0.608, 0.66) < 0.02, "the vanishing point");
  // nearer toward the edges and the foot
  assert.ok(streetDepth(0.3, 0.5) > streetDepth(0.45, 0.5));
  assert.ok(streetDepth(0.95, 0.5) > streetDepth(0.75, 0.5));
  assert.ok(streetDepth(0.6, 0.99) > streetDepth(0.6, 0.8));
  // gentle: at most 0.32 anywhere
  for (let u = 0; u <= 1; u += 0.05) for (let v = 0; v <= 1; v += 0.05) assert.ok(streetDepth(u, v) <= 0.32);
  // the arcade's front, machine and all, at one depth
  assert.equal(streetDepth(0.05, 0.1), streetDepth(0.2, 0.7));
  assert.equal(streetDepth(0.118, 0.63), streetDepth(0.05, 0.1));
  assert.ok(def.plate.depth.layers.some((l) => l.z === streetDepth(0.118, 0.63)));
});

test("the machine's screen is the one spot and the one focus key; it lies on the painted screen in both paintings, at the arcade's depth", () => {
  assert.deepEqual(Object.keys(def.focus), ["machine"]);
  assert.deepEqual(Object.keys(def.plate.spots), ["machine"]);
  const z = streetDepth(0.118, 0.63);
  // read off the paintings (the night screen's glass, the day one's)
  const night = [[0.108, 0.603], [0.125, 0.604], [0.13, 0.643], [0.111, 0.643]];
  const day = [[0.103, 0.61], [0.1225, 0.61], [0.127, 0.655], [0.107, 0.655]];
  for (const [quad, want] of [[SCREEN.night, night], [SCREEN.day, day]])
    quad.forEach((c, i) => {
      assert.ok(Math.abs(c[0] - want[i][0]) < 0.003 && Math.abs(c[1] - want[i][1]) < 0.003, `${c} ~ ${want[i]}`);
      assert.equal(c[2], z);
    });
  // the spot holds both
  const spot = def.plate.spots.machine;
  const [u0, u1] = [Math.min(...spot.map((c) => c[0])), Math.max(...spot.map((c) => c[0]))];
  const [v0, v1] = [Math.min(...spot.map((c) => c[1])), Math.max(...spot.map((c) => c[1]))];
  for (const c of [...SCREEN.night, ...SCREEN.day]) assert.ok(c[0] >= u0 && c[0] <= u1 && c[1] >= v0 && c[1] <= v1);
});

test("the step toward the machine: square to the painting, gentle on a wide screen (its paint at most 1.5 screen px a painting px at 1920 × 1080); a phone walks up to it", () => {
  for (const pose of [def.focus.machine, def.narrowFocus.machine]) {
    const dir = pose.target.map((t, i) => t - pose.pos[i]);
    assert.ok(Math.abs(dir[0]) < 1e-9 && Math.abs(dir[1]) < 1e-9 && dir[2] < 0, "looking straight down -z, as home does");
  }
  // wide: the machine's plane grows 1 / (1 − nearer) over the rest, where
  // the painting is (tan 24° / tan 20°) × 1080 / 1032 screen px a painting px
  const z = streetDepth(0.118, 0.63);
  const m = NANJING.painted(0.119, 0.625, z);
  const grow = (NANJING.eye[2] - m[2]) / (def.focus.machine.pos[2] - m[2]);
  const rest = (Math.tan((24 * Math.PI) / 180) / Math.tan((20 * Math.PI) / 180)) * (1080 / 1032);
  assert.ok(grow > 1.1 && rest * grow <= 1.5, `${(rest * grow).toFixed(2)} at 1920 × 1080`);
  // a phone: the screen near the view's middle, every pulled point in front of the eye
  const pose = def.narrowFocus.machine;
  const tanHalf = Math.tan(((def.fov / 2) * Math.PI) / 180);
  const see = (u, v, pull) => {
    const p = NANJING.painted(u, v, pull);
    const d = pose.pos[2] - p[2];
    assert.ok(d > 0.5, "in front of the eye");
    return [(p[0] - pose.pos[0]) / d / tanHalf, (p[1] - pose.pos[1]) / d / tanHalf];
  };
  const [sx, sy] = see(0.119, 0.625, z);
  assert.ok(Math.abs(sx) < 0.3 && Math.abs(sy) < 0.4, `the screen at ${sx.toFixed(2)}, ${sy.toFixed(2)}`);
  for (let u = 0; u <= 1; u += 0.1) for (let v = 0; v <= 1; v += 0.1) see(u, v, streetDepth(u, v));
});

test("the component is a thin PlatePlace with the live machine on the spot, from the interests only", () => {
  assert.match(src, /<PlatePlace \{\.\.\.props\} id="nanjing-road" def=\{def\} onSpot=/);
  assert.match(src, /createMachine\(interests\)/);
  assert.match(src, /import \{ interests \} from "\.\.\/\.\.\/\.\.\/data\/portfolio"/);
  assert.match(src, /spotGeometry\(ctx\.def, ctx\.plate\.frame, SCREEN\.night/);
  assert.match(src, /spotGeometry\(ctx\.def, ctx\.plate\.frame, SCREEN\.day/);
  assert.match(src, /screenMaterial\(paintScreen, \{ w: 512, h: 400, key: "nanjing-road:arcade:screen" \}\)/);
  // no material, light or randomness of its own (the day signs are the
  // plate's own material, cloned into the kit's cache); nothing from another place
  assert.doesNotMatch(src, /new THREE\.\w*(Material|Light)\b|<\w*[lL]ight\b|Math\.random/);
  for (const m of src.matchAll(/from "([^"]+)"/g)) assert.ok(!/districts\/|Riverside|^\.\/(?!nanjing-road\.def)/.test(m[1]), `imports ${m[1]}`);
  // no words but the machine's (the interests and its rules)
  assert.doesNotMatch(src, /fillText|strokeText/);
  assert.doesNotMatch(machine, /[぀-ヿ㐀-鿿]/);
  assert.doesNotMatch(machine, /[Ss]canline|INSERT COIN|Nanjing|Shanghai/);
});

test("the machine: a mover (parked in still view), the store's mode and presses, a click on the screen plays there", () => {
  assert.match(src, /useMovers\(movers, \{ active: on, still, ambient: true \}\)/);
  assert.match(src, /useWorld\(\(s\) => s\.arcadePress\)/);
  assert.match(src, /useWorld\(\(s\) => s\.sel\.interest\)/);
  assert.match(src, /world\.set\(\{ arcadeStatus: status \}\)/);
  assert.match(src, /built\.machine\.press\(uv, t, s\)/);
  assert.match(src, /world\.set\(\{ focus: "machine" \}\)/);
  // a click's point on the spot, back to the screen's own uv
  assert.match(src, /inQuad\(mixQuad\(SCREEN\.night, SCREEN\.day, screenBlend\(\)\), u, v\)/);
  // the screen follows the day/night blend between the two paintings'
  // screens, as the night painting's lit screen comes up (night 0.15 .. 0.55)
  assert.match(src, /const k = screenBlend\(\);/);
  assert.match(src, /const screenBlend = \(\) => 1 - THREE\.MathUtils\.smoothstep\(1 - plateUniforms\.uDay\.value, 0\.15, 0\.55\);/);
  assert.match(plateSrc, /float early = smoothstep\(0\.15, 0\.55, n\);/);
  // softened to the painting round it: drawn small and grown back
  assert.match(src, /const SOFT = 0\.5;/);
});

test("the place rests on the street with the machine in view; nothing chooses the machine on arrival", () => {
  assert.doesNotMatch(src, /useArriveAtMachine|AT_INTERESTS/);
});

test("by day the signs are lit, in their night colours, on the day painting's boards, in the plate's own shader", async () => {
  const { DAY_SIGNS } = await import("../app/components/city3d/districts/nanjing-road.def.ts");
  assert.ok(DAY_SIGNS.length >= 8);
  for (const s of DAY_SIGNS) {
    assert.match(s.color, /^#[0-9a-f]{6}$/);
    assert.ok(s.poly.length >= 3);
    for (const [u, v] of s.poly) assert.ok(u >= 0 && u <= 1 && v >= 0 && v <= 1);
    // none over the machine, so the live screen is untouched
    assert.ok(Math.min(...s.poly.map((p) => p[1])) > 0.56 || Math.max(...s.poly.map((p) => p[1])) < 0.6 || Math.min(...s.poly.map((p) => p[0])) > 0.16);
  }
  // the lines go where the plate's shader has them go (if it changes, this says so)
  const anchor = src.match(/export const SIGN_ANCHOR = "([^"]+)";/)[1];
  assert.ok(plateSrc.includes(anchor), "the plate's shader still has the snow line the signs go before");
  assert.ok(plateSrc.includes("void main() {"));
  // gone with the night: the plate's crossover
  assert.match(src, /float shown = signPaint\.a \* board \* \(1\.0 - smoothstep\(0\.3, 0\.7, n\)\);/);
  // the plate's own uniforms, its material put back when the place goes
  assert.match(src, /shared\(materialKey\("plate-signs", `nanjing-road:\$\{tone\}`\), \(\) => \{/);
  assert.match(src, /m\.uniforms = \{ \.\.\.base\.uniforms, uSignMap: \{ value: texture \} \};/);
  assert.match(src, /mesh\.material = material;\s*return \(\) => \{\s*mesh\.material = base;/);
  assert.match(src, /<DaySigns \/>/);
});

test("living light: the paving wet, the glass, the sky; slow beacons on the towers; nothing fast", () => {
  const kinds = def.plate.regions.map((r) => r.kind).sort();
  assert.deepEqual(kinds, ["glass", "sky", "wet"]);
  const movers = def.plate.movers;
  assert.ok(movers.some((m) => m.kind === "beacon"));
  for (const m of movers) {
    if (m.kind === "beacon") assert.ok(m.period >= 4, "a slow swell");
    else assert.ok(m.period >= 60, "a slow crossing");
    assert.notEqual(m.night, false, "lights after dark only");
  }
  // no traffic: a pedestrian street
  assert.ok(!movers.some((m) => m.kind === "trail"));
});
