// The painted places' engine and the still camera
// (docs/superpowers/plans/2026-11-21-city-painted-25d.md, Task 1): the
// PlaceDef shape and its checks (scenes.ts), the masks' pure functions
// (scripts/city/make-masks.mjs), and at the source level the plate's
// material (kit/plate.ts), its component (PlatePlace.tsx) and a camera
// the mouse never moves (City3D.tsx).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { checkPlace, driftTravel, isPlace, scenes } from "../app/components/city3d/scenes.ts";
import { lightMask, plateArtSource, skyMask } from "../scripts/city/make-masks.mjs";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const noComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

const city = noComments(read("app/components/city3d/City3D.tsx"));
const plate = read("app/components/city3d/kit/plate.ts");
const place = read("app/components/city3d/PlatePlace.tsx");

// A sound place, on the riverside's poses
const fixture = () => ({
  ...scenes.lujiazui,
  focus: { board: scenes.lujiazui.home },
  plate: {
    painting: "rooftop",
    aspect: 16 / 9,
    depth: { kind: "layers", ground: { horizon: 0.4, near: 0.4 }, standing: 0.05, layers: [{ mask: [[0, 0.6], [0.4, 1], [0, 1]], z: 0.5 }] },
    regions: [
      { kind: "water", poly: [[0.2, 0.4], [0.9, 0.4], [0.9, 0.55], [0.2, 0.55]] },
      { kind: "sky", poly: [[0, 0], [1, 0], [1, 0.2], [0, 0.2]] },
    ],
    spots: { board: [[0.1, 0.1, 0.1], [0.2, 0.1, 0.1], [0.2, 0.2, 0.1], [0.1, 0.2, 0.1]] },
    drift: { amplitude: 0.003, period: 40 },
    movers: [
      { kind: "trail", path: [[0.7, 0.6], [0.9, 1]], period: 20, color: "#ffd9a0", size: 0.005 },
      { kind: "beacon", path: [[0.78, 0.02]], period: 3, color: "#ff6a6a", size: 0.005 },
    ],
  },
});

test("a sound PlaceDef passes checkPlace; each fault is named", () => {
  const ok = fixture();
  assert.ok(isPlace(ok));
  // Every place is painted now, and every one is sound
  for (const [id, def] of Object.entries(scenes)) {
    assert.ok(isPlace(def), `${id} is a painted place`);
    assert.deepEqual(checkPlace(def), [], id);
  }
  assert.deepEqual(checkPlace(ok), []);
  const bad = (change) => {
    const d = fixture();
    change(d);
    return checkPlace(d).join(" | ");
  };
  assert.match(bad((d) => (d.focus.screen = d.home)), /focus "screen" has no spot/);
  assert.match(bad((d) => (d.plate.spots.board[0] = [1.2, 0.1, 0])), /spot board: a corner outside/);
  assert.match(bad((d) => (d.plate.regions[0].poly = [[0, 0], [1, 1]])), /region 0 \(water\): a polygon needs 3 points/);
  assert.match(bad((d) => (d.plate.regions[0].kind = "lava")), /region 0: kind "lava"/);
  assert.match(bad((d) => (d.plate.depth = { kind: "gradient", strength: 0.4 })), /depth: kind is layers or map/);
  assert.match(bad((d) => (d.plate.depth.layers[0].z = 0.95)), /z 0\.95 outside/);
  assert.match(bad((d) => (d.plate.painting = "Rooftop Day")), /isn't an asset id/);
  assert.match(bad((d) => (d.plate.drift = { amplitude: 0.01, period: 20 })), /drift travels/);
  assert.match(bad((d) => (d.plate.movers[1].period = 0.5)), /never a blink/);
  assert.match(bad((d) => (d.plate.movers[0].color = "orange")), /colour "orange"/);
});

test("the rest drift stays under 1% of the view in any 10 s", () => {
  assert.equal(driftTravel({ amplitude: 0, period: 40 }), 0);
  // City3D's default (and the proof's): 0.003 of the distance, once round in 40 s
  const m = read("app/components/city3d/City3D.tsx").match(/const DEFAULT_DRIFT: PlateDef\["drift"\] = \{ amplitude: ([\d.]+), period: ([\d.]+) \};/);
  assert.ok(m, "City3D.tsx: DEFAULT_DRIFT");
  const travel = driftTravel({ amplitude: +m[1], period: +m[2] });
  assert.ok(travel > 0 && travel < 0.01, String(travel));
});

test("lightMask: lit at night, dark where dark, and a pale wall as bright by day isn't a light", () => {
  // 4 × 4 RGBA: row 0 a warm lit window, row 1 night sky, row 2 a pale
  // wall (bright night and day), row 3 a neon sign (saturated)
  const px = (rows) => new Uint8Array(rows.flatMap((c) => Array(4).fill([...c, 255]).flat()));
  const night = px([[255, 214, 150], [18, 26, 60], [200, 200, 200], [255, 40, 200]]);
  const day = px([[120, 140, 160], [90, 150, 230], [250, 250, 250], [200, 90, 160]]);
  const m = lightMask(night, day, 4, 4);
  assert.equal(m.length, 16);
  for (let x = 0; x < 4; x++) {
    assert.equal(m[x], 255, "the lit window");
    assert.equal(m[4 + x], 0, "the night sky");
    assert.ok(m[12 + x] > 200, `the neon (${m[12 + x]})`);
  }
  const alone = lightMask(night, null, 4, 4);
  assert.ok(m[8] < alone[8], "the pale wall counts less once the day painting says it's pale");
});

test("skyMask: open sky from the top, never a blue lower down, never past a roofline", () => {
  // 4 × 4: rows 0-1 blue sky, except column 3 a tower to the top; rows 2-3
  // brown, with a blue window at (1, 3)
  const sky = [90, 150, 230], brown = [120, 80, 50];
  const at = (x, y) => (x === 3 ? brown : y < 2 ? sky : x === 1 && y === 3 ? sky : brown);
  const day = new Uint8Array(16 * 4);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) day.set([...at(x, y), 255], (y * 4 + x) * 4);
  const m = skyMask(day, 4, 4, { lowest: 1, gap: [0, 0] });
  const rows = [0, 1, 2, 3].map((y) => [...m.slice(y * 4, y * 4 + 4)].map((v) => (v ? 1 : 0)).join(""));
  assert.deepEqual(rows, ["1110", "1110", "0000", "0000"]);
});

test("make-masks writes plateArt.ts as static imports of what exists", () => {
  const src = plateArtSource([{ id: "nanjing-road", light: true, sky: true, depthDay: false }]);
  assert.match(src, /import nanjingRoadDay from "\.\.\/\.\.\/\.\.\/assets\/city\/nanjing-road-day\.webp";/);
  assert.match(src, /import nanjingRoadSky from "\.\.\/\.\.\/\.\.\/assets\/city\/masks\/nanjing-road-sky\.webp";/);
  assert.match(src, /"nanjing-road": \{ day: nanjingRoadDay, night: nanjingRoadNight, light: nanjingRoadLight, sky: nanjingRoadSky \},/);
  assert.doesNotMatch(src, /depth\//);
  // The generated file in the tree is what the script makes
  assert.match(read("app/components/city3d/kit/plateArt.ts"), /Generated by scripts\/city\/make-masks\.mjs/);
  assert.match(read("package.json"), /"city:masks": "node scripts\/city\/make-masks\.mjs"/);
});

test("the mouse never moves the camera: no pointermove, no drag, no parallax", () => {
  assert.doesNotMatch(city, /pointermove/);
  assert.doesNotMatch(city, /pointerdown|pointerup/);
  assert.doesNotMatch(city, /s\.yaw|s\.pitch|parallax|dragging|rotateY|rotateX/);
});

test("the rest drift: desktop tiers only, never in still view or ?frame=plate", () => {
  assert.match(city, /const resting = !r && !s\.queue\.length && !reduce && !plate;\s*if \(resting && tier !== "mobile" && !holdingStill\(\)\) \{/);
  // Off at once otherwise, and when still view comes on mid-journey
  assert.match(city, /\} else \{\s*s\.drift = 0;\s*\}/);
  assert.match(city, /s\.iris = 0;\s*s\.drift = 0;/);
  // Only the eye moves; the aim holds
  assert.match(city, /camera\.position\.copy\(tmp\.p\);\s*camera\.lookAt\(tmp\.l\);/);
});

test("journeys and the first frame wait for a painted place's painting", () => {
  assert.match(city, /wantPlate\(to\);/);
  assert.match(city, /placePending\(place\)/);
  assert.match(city, /placePending\(scene\.getObjectByName\(`scene:\$\{active\}`\)\) && performance\.now\(\) - since < WAIT_FOR_FIRST_MS/);
});

test("the plate's material goes through materialKey() and the shared cache, one program for every plate", () => {
  assert.match(plate, /export function plateMaterial\(opts: \{ painting: string; quality: Quality; depth: PlateDef\["depth"\] \}\): THREE\.ShaderMaterial/);
  assert.match(plate, /return shared\(materialKey\("plate", `\$\{opts\.painting\}:\$\{tone\}`\), \(\) => \{/);
  assert.match(plate, /const key = materialKey\("plate", tone\);\s*m\.customProgramCacheKey = \(\) => key;/);
  assert.match(plate, /shared\(materialKey\("plate-movers", tone\)/);
  // No other material is made outside a factory, and nothing random
  assert.equal((noComments(plate).match(/new THREE\.\w*Material\(/g) ?? []).length, 2);
  assert.doesNotMatch(noComments(plate) + noComments(place), /Math\.random/);
  assert.doesNotMatch(noComments(place), /new THREE\.\w*Material\(/);
  // The uniforms the places get, all shared, none compiled in
  for (const u of ["uDay", "uGlow", "uRain", "uWet", "uTime", "uHour"]) assert.match(plate, new RegExp(`${u}: \\{ value: `));
  assert.match(plate, /\.\.\.plateUniforms,/);
  // The exports the places build on
  assert.match(plate, /export function buildPlate\(def: PlaceDef, quality: Quality\): Plate \{/);
  assert.match(plate, /export function buildMovers\(def: PlaceDef, quality: Quality = "high"\): PlateMovers \| null \{/);
});

test("pictures per tier: phones at most 1024 px on the painting's long edge, high up to 2560, let go when unmounted", () => {
  const edges = plate.match(/high: \{ painting: (\d+), mask: (\d+) \},\s*low: \{ painting: (\d+), mask: (\d+) \},\s*mobile: \{ painting: (\d+), mask: (\d+) \},/);
  assert.ok(edges);
  assert.equal(+edges[1], 2560);
  assert.ok(+edges[5] <= 1024);
  assert.match(plate, /dispose\(\) \{\s*generation\+\+;\s*freeMaps\(\);\s*regions\.texture\.dispose\(\);\s*geometry\.dispose\(\);/);
  assert.match(place, /useDisposeOnUnmount\(plate\);/);
  assert.match(place, /plate\.release\(\)/);
  // Movers parked in still view (useMovers), living light only while showing and not still
  // (the place's quiet life: ambient, drawn at rest at most 30 times a second)
  assert.match(place, /useMovers\(moverList, \{ active, still, ambient: true \}\);/);
  assert.match(place, /useLive\(active && !still && living\(def\), true\);/);
  assert.match(place, /if \(!still && last\.current\) clock \+=/);
});

test("power: at rest the place's quiet life draws at most 30 times a second, nothing after a minute with no input, nothing in still view", () => {
  const wake = noComments(read("app/components/city3d/Wake.tsx"));
  assert.match(wake, /const REST_FPS = 30;/);
  assert.match(wake, /const REST_IDLE_MS = 60_000;/);
  assert.match(wake, /if \(now - since > REST_IDLE_MS\) return;/);
  // the input only wakes it (the mouse never moves the camera)
  assert.match(wake, /const poke = \(\) => \{\s*since = performance\.now\(\);/);
  assert.doesNotMatch(wake, /camera/);
  // mounted off in still view, and on mobile only for something living
  assert.match(city, /<RestTicker on=\{!still && \(ambient \|\| tier !== "mobile"\)\} \/>/);
  // the drift no longer makes the Director draw every frame
  assert.doesNotMatch(city, /s\.driftT \+= dt;\s*busy = true;/);
  // a hidden tab draws nothing
  assert.match(city, /frameloop=\{!visible \|\| !warm \|\| covered \? "never" :/);
});

test("a flight's paintings are decoded off the main thread and uploaded between frames, from the press on the link", () => {
  assert.match(plate, /createImageBitmap\(blob, \{ imageOrientation: "flipY", resizeWidth: w, resizeHeight: h, resizeQuality: "high" \}\)/);
  assert.match(plate, /if \(upload\) for \(const t of all\) \{/);
  assert.match(place, /plate\.load\(uploadBetweenFrames\(gl\)\)/);
  assert.match(read("app/components/city3d/Flight.tsx"), /plate\.load\(uploadBetweenFrames\(gl\)\)/);
  assert.match(read("app/components/city3d/Wake.tsx"), /if \(href\) hintPlate\(placeFor\(href\)\);/);
  // one soft pass of cloud: the lift dissolves through the haze, only the descent through the veil
  assert.match(city, /const liftPass = p\.back \|\| \(p\.lift > 0 && t < p\.lift \+ p\.cruise\);/);
  assert.match(city, /: liftPass \? 0 : f\.veil;/);
});

test("night is the painting's: the lights' extra over 1.0 is small; dusk crosses over through its middle", () => {
  assert.match(plate, /col \+= lights \* n \* uGlow \* 0\.3;/);
  assert.match(plate, /vec3 col = mix\(day, night, smoothstep\(0\.3, 0\.7, n\)\);/);
});
