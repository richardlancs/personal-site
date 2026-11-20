// The city's atmosphere (app/components/city3d/atmosphere/, Post.tsx): the
// hour and Richmond Hill's weather reach the neon, the lit windows, the
// fog and the bloom, by uniforms and intensities only (so a blend compiles
// nothing), with a fog that never hides a sign, and nothing lit bright
// enough to bloom.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { DAYLIGHTS, WEATHER_PRESETS } from "../app/lib/sky.ts";
import { SHARE_STEP, litShare } from "../app/lib/cityWindows.ts";
import { TIERS } from "../app/components/city3d/tiers.ts";
import {
  LIT_LIMIT,
  WORLD_LIGHTS,
  bloomStrength,
  daylightLook,
  fogColor,
  fogRange,
  hexToRGB,
  litShareNow,
  neonLevel,
  newDaylight,
  newWeather,
  weatherLook,
} from "../app/components/city3d/atmosphere/looks.ts";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(root + path, "utf8");
const noComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const atmo = "app/components/city3d/atmosphere";

// The twenty skies: five weathers by four times of day, each phase at its
// start, middle and end
const skies = WEATHER_PRESETS.flatMap((p) => DAYLIGHTS.flatMap((ph) => [0, 0.5, 1].map((progress) => ({ p, ph, progress }))));

test("the neon is 0.3 by day and 1 at night, and rain or snow never dims it", () => {
  assert.equal(daylightLook(newDaylight(), "night", 0).neon, 1);
  assert.equal(daylightLook(newDaylight(), "day", 0).neon, 0.3);
  for (const ph of DAYLIGHTS) {
    const d = daylightLook(newDaylight(), ph, 0.5);
    const clear = neonLevel(d, weatherLook(newWeather(), "clear"));
    assert.ok(neonLevel(d, weatherLook(newWeather(), "rain")) >= clear, ph);
    assert.ok(neonLevel(d, weatherLook(newWeather(), "snow")) >= clear, ph);
  }
  assert.ok(daylightLook(newDaylight(), "dusk", 1).neon > daylightLook(newDaylight(), "dusk", 0).neon, "the neon rises through dusk");
});

test("rain brings the fog in, and the fog never closes nearer than its floor", () => {
  assert.ok(weatherLook(newWeather(), "rain").fogNear < weatherLook(newWeather(), "clear").fogNear);
  const base = { near: 40, far: 160, keep: { near: 30, far: 112 } };
  for (const { p, ph, progress } of skies) {
    const r = fogRange({ near: 0, far: 0 }, base, daylightLook(newDaylight(), ph, progress), weatherLook(newWeather(), p));
    assert.ok(r.near >= base.keep.near && r.far >= base.keep.far && r.far > r.near, `${p}-${ph}-${progress}: ${r.near}–${r.far}`);
  }
});

test("the skies differ: the visibility script's six skies are six fogs, none over a sign", () => {
  // The riverside's fog (lujiazui.def.ts) and the script's skies
  // (docs/city/scripts/visibility.mjs); the signs stand 24 to 64 units off
  const base = { near: 70, far: 320, keep: { near: 66, far: 260 } };
  const air = hexToRGB("#141a24");
  const six = ["neutral-day", "cloudy-day", "rain-day", "snow-day", "clear-dusk", "neutral-night"].map((s) => {
    const [p, ph] = s.split("-");
    const d = daylightLook(newDaylight(), ph, 0.5);
    const w = weatherLook(newWeather(), p);
    const r = fogRange({ near: 0, far: 0 }, base, d, w);
    assert.ok(r.near > 64, `${s}: fog starts at ${r.near}, before the farthest sign`);
    const c = fogColor([0, 0, 0], air, d, w).map((x) => Math.round(x * 255));
    return `${c.join(",")} ${r.near.toFixed(1)}-${r.far.toFixed(1)}`;
  });
  assert.equal(new Set(six).size, 6, six.join(" | "));
});

test("nothing lit reaches the bloom's threshold: the world's two lights stay under LIT_LIMIT in every sky", () => {
  // The lights' base intensities are the ones WorldLights builds
  const common = read("app/components/city3d/common.tsx");
  assert.match(common, new RegExp(`<hemisphereLight args=\\{\\[[^\\]]*, ${WORLD_LIGHTS.hemi}\\]\\}`));
  assert.match(common, new RegExp(`<directionalLight [^>]*intensity=\\{${WORLD_LIGHTS.sun}\\}`));
  assert.ok(LIT_LIMIT / Math.PI < 1);
  for (const { p, ph, progress } of skies) {
    const d = daylightLook(newDaylight(), ph, progress);
    const w = weatherLook(newWeather(), p);
    const sum = WORLD_LIGHTS.sun * d.sunScale * w.sunScale + WORLD_LIGHTS.hemi * d.hemiScale * w.hemiScale;
    assert.ok(sum <= LIT_LIMIT, `${p}-${ph}-${progress}: ${sum.toFixed(3)}`);
  }
});

test("the windows follow the clock, never fewer than the daylight's least, in the clock's steps", () => {
  const night = daylightLook(newDaylight(), "night", 0);
  const day = daylightLook(newDaylight(), "day", 0);
  assert.equal(litShareNow(litShare(12), day, SHARE_STEP), litShare(12));
  assert.equal(litShareNow(litShare(21), night, SHARE_STEP), litShare(21));
  // A winter evening, dark at 17:30: more than the clock's share
  assert.ok(litShareNow(litShare(17.5), night, SHARE_STEP) > litShare(17.5));
  for (const { ph, progress } of skies) {
    const s = litShareNow(litShare(3), daylightLook(newDaylight(), ph, progress), SHARE_STEP);
    assert.equal(Math.round(s / SHARE_STEP) * SHARE_STEP, s);
  }
});

test("bloom: faint by day, full at night, a little less on the low tier", () => {
  assert.ok(bloomStrength(0.3, "high") < bloomStrength(1, "high"));
  assert.ok(bloomStrength(1, "low") < bloomStrength(1, "high"));
  assert.equal(bloomStrength(1.15, "high"), bloomStrength(1, "high"));
});

test("Atmosphere.tsx drives the shared uniforms and the lights' intensities, and never adds or disposes a light", () => {
  const src = noComments(read(`${atmo}/Atmosphere.tsx`));
  assert.match(src, /import \{[^}]*\bneonUniforms\b[^}]*\} from "\.\.\/kit\/uniforms"/);
  assert.match(src, /import \{[^}]*\bwindowUniforms\b[^}]*\} from "\.\.\/kit\/uniforms"/);
  assert.match(src, /import \{[^}]*\benvUniforms\b[^}]*\} from "\.\.\/kit\/uniforms"/);
  assert.match(src, /neonUniforms\.uNeon\.value =/);
  assert.match(src, /windowUniforms\.uLitShare\.value =/);
  assert.match(src, /litShare\(/);
  assert.doesNotMatch(src, /new THREE\.\w*Light\(/);
  assert.doesNotMatch(src, /<\w*[lL]ight[\s/>]/);
  assert.doesNotMatch(src, /\.dispose\(\)/);
  assert.doesNotMatch(src, /\bwaterUniforms\b|\bOUTDOORS\b|\bindoor\b/);
  // the light after dark that isn't a light: the lamps' beams, the signs'
  // wash and the light pools with the lamps; the day shade with the sun;
  // the sun's direction per place
  assert.match(src, /import \{[^}]*\bglowUniforms\b[^}]*\} from "\.\.\/kit\/glow"/);
  for (const u of ["glowUniforms.uLamps", "glowUniforms.uSigns", "glowUniforms.uHaze", "poolUniforms.uPoolsOn", "shadeUniforms.uShadeOn"]) assert.match(src, new RegExp(`${u.replace(".", "\\.")}\\.value =`), u);
  assert.match(src, /const sun = def\.sun \?\? DEFAULT_SUN;\s*l\.position\.set\(/);
});

test("Precipitation.tsx draws in the scene itself: no overlay, no depth hand-over, no wind", () => {
  const src = noComments(read(`${atmo}/Precipitation.tsx`));
  for (const gone of ["overlay", "sceneDepth", "windUniforms"]) assert.doesNotMatch(src, new RegExp(`\\b${gone}\\b`), gone);
  // Still view: the clock holds (half density, still strokes)
  assert.match(src, /still/);
  const state = noComments(read(`${atmo}/state.ts`));
  for (const gone of ["overlay", "sceneDepth", "waterUniforms"]) assert.doesNotMatch(state, new RegExp(`\\b${gone}\\b`), gone);
});

test("SkyDriver writes the hour from the same clock, or the preview's", () => {
  const src = read("app/components/weather/SkyDriver.tsx");
  assert.match(src, /localHour\(/);
  assert.match(src, /previewHour\(/);
  assert.match(src, /world\.set\(\{ hour \}\)/);
});

test("looks.ts has no indoor branch", () => {
  const src = noComments(read(`${atmo}/looks.ts`));
  assert.doesNotMatch(src, /\bOUTDOORS\b|\bindoor\b|INDOOR/);
});

test("Post.tsx: bloom's strength from the neon, one level count on both desktop tiers, and the renderer's exposure", () => {
  const src = noComments(read("app/components/city3d/Post.tsx"));
  assert.match(src, /bloomStrength\(/);
  assert.match(src, /neonUniforms\.uNeon\.value/);
  // A step from high to low changes the resolution scale and the
  // multisampling, never the level count (which would rebuild the blur)
  assert.match(src, /levels: BLOOM_LEVELS/);
  assert.match(src, /const BLOOM_LEVELS = TIERS\.high\.bloom!\.levels;/);
  assert.match(src, /resolution\.scale = /);
  assert.ok(TIERS.high.bloom && TIERS.low.bloom);
  // ToneMappingEffect reads the renderer's toneMappingExposure (three's
  // tonemapping_pars_fragment), so the desktop tiers set the mobile's 1.12
  assert.match(src, /gl\.toneMappingExposure = 1\.12;/);
  // Under prefers-contrast: more, no bloom at all
  assert.match(src, /prefers-contrast: more/);
});
