"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SHARE_STEP, litShare } from "../../../lib/cityWindows";
import type { SkyState } from "../../../lib/sky";
import { glowUniforms } from "../kit/glow";
import { envUniforms, neonUniforms, poolUniforms, shadeUniforms, windowUniforms } from "../kit/uniforms";
import { scenes, type SceneId } from "../scenes";
import { world } from "../store";
import {
  cityGlowLevel,
  cloudColor,
  copyDaylight,
  copyWeather,
  daylightLook,
  fogColor,
  fogRange,
  hexToRGB,
  lerpDaylight,
  lerpWeather,
  lightColor,
  litShareNow,
  mixInto,
  neonLevel,
  newDaylight,
  newWeather,
  progressStep,
  skyColor,
  weatherLook,
  type RGB,
} from "./looks";
import { precip } from "./state";

// Richmond Hill's weather, time of day and hour, shown in the city
// (the store's `sky` and `hour`, written by weather/SkyDriver.tsx).
// Nothing is built, rebuilt or removed: the world's two lights, the
// place's spot lights, its sky dome, the fog and the city's shared
// uniforms (kit/uniforms.ts) are moved from the values they were built
// with, by the table in looks.ts. So no light is added and no material
// changes, and a blend compiles no shader.
//
// What it drives:
// - the fog (one THREE.Fog for every place, from the place's def: its
//   colour, near, far and `keep` floor) and the background behind it
// - the lights tagged `userData.atmos` (common.tsx): "sun" and "hemi"
//   (WorldLights, the same everywhere), and the place's "spot" lights
//   (SceneLights), dark by day, up through dusk; at full night a spot
//   gives `userData.night` (SPOT_NIGHT if unset)
// - a sky dome tagged `userData.atmos === "sky"` (kit/sky.ts): whichever of
//   uTop, uHorizon, uSun, uCloudLit, uCloudShade, uHaze, uHazeAmt, uCover,
//   uSunDisc, uMoon, uStars, uCityGlow and uSunDir (from its own
//   `userData.sunDir`) its material has
// - the sun's direction, per place (its def's `sun`; WorldLights' own
//   where it sets none), so a place is lit from the side its plate is
// - the light after dark that isn't a light (kit/glow.ts): the lamps'
//   beams and the signs' wash (glowUniforms), and the light pools on the
//   surfaces (poolUniforms.uPoolsOn), with the lamps; the day shade
//   (shadeUniforms.uShadeOn), with the sun
// - neonUniforms.uNeon (the look's neon), windowUniforms.uLitShare (the
//   hour's share, lib/cityWindows.ts, never under the daylight's least),
//   envUniforms (uWet, uSnow, uNight), and `precip` (Precipitation.tsx)
//
// - Daylight and weather blend separately, over BLEND seconds each,
//   drawing every frame while they do (the loop is otherwise on demand)
// - The first state after load is snapped, not blended: a visitor
//   arriving shouldn't watch the sky change. So is a live reading that
//   replaces the fallback while the city is still opening, and every
//   change in still view
// - At rest, nothing is done per frame beyond a check that the place's
//   tagged objects are still the ones it found

const BLEND = 3; // seconds
const OPENING = 2500; // ms after the first frame in which a first reading still snaps
// A spot light's intensity at full night when its scene sets none: a lamp
// head h units up lights the ground under it to albedo × I / (π h^1.6)
// (SceneLights' decay), under 1.0 for a lamp at 0.6 units (6 m) and up
export const SPOT_NIGHT = 2;
// Where the sun stands when a place's def doesn't say (WorldLights')
const DEFAULT_SUN = [-40, 80, 30] as const;

type Kind = "sun" | "hemi" | "sky" | "spot";
type Base = { color: RGB; ground: RGB; intensity: number; dir?: THREE.Vector3 };
type Tagged = { obj: THREE.Object3D; kind: Kind; base: Base };

// The objects' own values, as built, read once per object
const bases = new WeakMap<THREE.Object3D, Base>();
const rgbOf = (c: THREE.Color): RGB => {
  const o = { r: 0, g: 0, b: 0 };
  c.getRGB(o, THREE.SRGBColorSpace);
  return [o.r, o.g, o.b];
};
function baseOf(obj: THREE.Object3D, kind: Kind): Base {
  let b = bases.get(obj);
  if (b) return b;
  if (kind === "hemi") {
    const l = obj as THREE.HemisphereLight;
    b = { color: rgbOf(l.color), ground: rgbOf(l.groundColor), intensity: l.intensity };
  } else if (kind === "sun") {
    const l = obj as THREE.DirectionalLight;
    b = { color: rgbOf(l.color), ground: [0, 0, 0], intensity: l.intensity };
  } else if (kind === "spot") {
    b = { color: [0, 0, 0], ground: [0, 0, 0], intensity: (obj.userData.night as number) ?? SPOT_NIGHT };
  } else {
    const dir = obj.userData.sunDir as THREE.Vector3 | undefined;
    b = { color: [0, 0, 0], ground: [0, 0, 0], intensity: 1, dir: dir ? dir.clone() : undefined };
  }
  bases.set(obj, b);
  return b;
}

const KINDS = new Set<string>(["sun", "hemi", "sky", "spot"]);

// The world's own tagged objects (outside every place's group) and the
// showing place's; never another place's
function collect(scene: THREE.Scene, active: SceneId): Tagged[] {
  const out: Tagged[] = [];
  const own = `scene:${active}`;
  const walk = (obj: THREE.Object3D) => {
    if (obj.name.startsWith("scene:") && obj.name !== own) return;
    const kind = obj.userData.atmos as string | undefined;
    if (kind && KINDS.has(kind)) out.push({ obj, kind: kind as Kind, base: baseOf(obj, kind as Kind) });
    for (const child of obj.children) walk(child);
  };
  walk(scene);
  return out;
}
const lost = (tagged: Tagged[]) => {
  for (const t of tagged) if (!t.obj.parent) return true;
  return false;
};

const SNOW_BOUNCE: RGB = [0.78, 0.8, 0.85];
// Rain a little darker and bluer than the air, so it shows against the sky
const RAIN_TONE: RGB = [0.5, 0.56, 0.68];

const smooth = (t: number) => t * t * (3 - 2 * t);
const step01 = (a: number, b: number, x: number) => smooth(Math.min(1, Math.max(0, (x - a) / (b - a))));

const sameTarget = (a: SkyState | null, b: SkyState) =>
  !!a && a.preset === b.preset && a.daylight === b.daylight && progressStep(a.progress) === progressStep(b.progress);

// Sets a uniform's colour if the material has that uniform
type Uniforms = Record<string, THREE.IUniform | undefined>;
const setColor = (u: Uniforms, name: string, c: RGB) => {
  const v = u[name]?.value as THREE.Color | undefined;
  if (v && (v as THREE.Color).isColor) v.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
};
const setNumber = (u: Uniforms, name: string, n: number) => {
  const x = u[name];
  if (x && typeof x.value === "number") x.value = n;
};

export default function Atmosphere({ active }: { active: SceneId }) {
  const { scene, gl, invalidate } = useThree();
  const fog = useMemo(() => new THREE.Fog("#141a24", 70, 320), []);
  const background = useMemo(() => new THREE.Color("#10141c"), []);
  const st = useRef({
    d: newDaylight(),
    dFrom: newDaylight(),
    dTo: newDaylight(),
    dT: 1,
    w: newWeather(),
    wFrom: newWeather(),
    wTo: newWeather(),
    wT: 1,
    target: null as SkyState | null,
    hour: world.get().hour,
    framedAt: 0, // when the first frame was drawn (0: not yet)
    dirty: true,
    tagged: [] as Tagged[],
    taggedFor: "" as string,
    // scratch, so a frame allocates nothing
    c: [0, 0, 0] as RGB,
    range: { near: 0, far: 0 },
    air: [0, 0, 0] as RGB, // the fog's colour now
    fogBase: new Map<SceneId, RGB>(),
  });

  // Follow the store. A change of sky retargets the blend; a change of
  // hour moves the lit windows; nothing else in the store concerns it.
  useEffect(() => {
    const s = st.current;
    const follow = () => {
      const { sky, hour, still } = world.get();
      if (hour !== s.hour) {
        s.hour = hour;
        s.dirty = true;
        invalidate();
      }
      if (sameTarget(s.target, sky)) return;
      const previous = s.target;
      s.target = sky;
      // Snap: nothing has been shown yet; still view; or the fallback
      // giving way to a reading while the city is still opening
      const snap = !previous || !s.framedAt || still || (previous.source === "fallback" && performance.now() - s.framedAt < OPENING);
      if (!previous || previous.daylight !== sky.daylight || progressStep(previous.progress) !== progressStep(sky.progress)) {
        daylightLook(s.dTo, sky.daylight, sky.progress);
        if (snap) {
          copyDaylight(s.d, s.dTo);
          s.dT = 1;
        } else {
          copyDaylight(s.dFrom, s.d);
          s.dT = 0;
        }
      }
      if (!previous || previous.preset !== sky.preset) {
        weatherLook(s.wTo, sky.preset);
        if (snap) {
          copyWeather(s.w, s.wTo);
          s.wT = 1;
        } else {
          copyWeather(s.wFrom, s.w);
          s.wT = 0;
        }
      }
      s.dirty = true;
      // For styles that want to know (the panels over the city)
      const box = gl.domElement.closest<HTMLElement>(".city3d");
      if (box) {
        box.dataset.skyPreset = sky.preset;
        box.dataset.skyDaylight = sky.daylight;
      }
      invalidate(2);
    };
    follow();
    const unsubscribe = world.subscribe(follow);
    return () => void unsubscribe();
  }, [gl, invalidate]);

  // The fog and the background are the atmosphere's, for every place
  useEffect(() => {
    scene.fog = fog;
    scene.background = background;
    st.current.dirty = true;
    invalidate();
  }, [scene, fog, background, active, invalidate]);

  useFrame((_, rawDt) => {
    const s = st.current;
    if (!s.framedAt) s.framedAt = performance.now();
    const dt = Math.min(rawDt, 0.05);
    const still = world.get().still;

    // Blend, drawing the next frame while it runs
    if (s.dT < 1) {
      s.dT = still ? 1 : Math.min(1, s.dT + dt / BLEND);
      lerpDaylight(s.d, s.dFrom, s.dTo, smooth(s.dT));
      s.dirty = true;
    }
    if (s.wT < 1) {
      s.wT = still ? 1 : Math.min(1, s.wT + dt / BLEND);
      lerpWeather(s.w, s.wFrom, s.wTo, smooth(s.wT));
      s.dirty = true;
    }
    if (s.dT < 1 || s.wT < 1) invalidate();

    // The tagged objects, found once per place; again if one has gone (a
    // light or a dome rebuilt by its scene)
    if (s.taggedFor !== active || lost(s.tagged)) {
      s.tagged = collect(scene, active);
      s.taggedFor = active;
      s.dirty = true;
    }
    if (!s.dirty) return;
    s.dirty = false;
    apply(s, active);
  });

  function apply(s: typeof st.current, id: SceneId) {
    const { d, w, c } = s;
    const night = d.night;
    // The street lamps come on through dusk, softer in rain and mist
    const lampsOn = step01(0.3, 0.85, night);
    const haze = Math.min(1, Math.max(w.rain, w.flakes * 0.75, w.fogGrey * 0.7));

    // Fog and background, from the place's own
    const def = scenes[id];
    let fogBase = s.fogBase.get(id);
    if (!fogBase) s.fogBase.set(id, (fogBase = hexToRGB(def.fog.color)));
    fogColor(s.air, fogBase, d, w);
    fog.color.setRGB(s.air[0], s.air[1], s.air[2], THREE.SRGBColorSpace);
    background.copy(fog.color);
    fogRange(s.range, def.fog, d, w);
    fog.near = s.range.near;
    fog.far = s.range.far;

    for (const { obj, kind, base } of s.tagged) {
      if (kind === "sun") {
        const l = obj as THREE.DirectionalLight;
        lightColor(c, base.color, d.sun, d.sunMix, w);
        l.color.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
        l.intensity = base.intensity * d.sunScale * w.sunScale;
        const sun = def.sun ?? DEFAULT_SUN;
        l.position.set(sun[0], sun[1], sun[2]);
      } else if (kind === "hemi") {
        const l = obj as THREE.HemisphereLight;
        lightColor(c, base.color, d.hemiSky, d.hemiMix, w);
        l.color.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
        lightColor(c, base.ground, d.hemiGround, d.hemiMix, w);
        // Snow on the ground throws light back up
        if (w.snow > 0) mixInto(c, c, SNOW_BOUNCE, w.snow * 0.35);
        l.groundColor.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
        l.intensity = base.intensity * d.hemiScale * w.hemiScale;
      } else if (kind === "spot") {
        // Straight down; its shadow (where it has one) drawn only while lit
        const l = obj as THREE.SpotLight;
        l.intensity = base.intensity * lampsOn * (1 - 0.15 * haze);
        if (l.castShadow) l.shadow.autoUpdate = l.intensity > 0.01;
      } else {
        const material = (obj as THREE.Mesh).material as THREE.ShaderMaterial | undefined;
        const u = (material?.uniforms ?? {}) as Uniforms;
        setColor(u, "uTop", skyColor(c, d.top, w, night));
        setColor(u, "uHorizon", skyColor(c, d.horizon, w, night));
        setColor(u, "uSun", d.glow);
        setColor(u, "uCloudLit", cloudColor(c, d.cloudLit, w, night));
        setColor(u, "uCloudShade", cloudColor(c, d.cloudShade, w, night));
        setColor(u, "uHaze", s.air);
        setNumber(u, "uHazeAmt", Math.max(0, w.fogGrey) * 0.9);
        setNumber(u, "uCover", w.cover);
        setNumber(u, "uSunDisc", w.sunDisc);
        setNumber(u, "uMoon", step01(0.6, 1, night));
        setNumber(u, "uStars", step01(0.5, 1, night) * (1 - step01(0.4, 0.85, w.cover)));
        setNumber(u, "uCityGlow", cityGlowLevel(d, w));
        const dir = u.uSunDir?.value as THREE.Vector3 | undefined;
        if (dir && base.dir) {
          dir.copy(base.dir);
          dir.y *= d.sunHeight;
          dir.normalize();
        }
      }
    }

    // The city's shared uniforms
    glowUniforms.uLamps.value = lampsOn * (1 + 0.4 * haze);
    glowUniforms.uSigns.value = lampsOn;
    glowUniforms.uHaze.value = haze;
    poolUniforms.uPoolsOn.value = lampsOn * (1 + 0.25 * w.wet);
    // The day's shade: as much as the sun has of the light
    shadeUniforms.uShadeOn.value = (1 - step01(0.2, 0.7, night)) * Math.min(1, d.sunScale / 0.75) * Math.min(1, w.sunScale) * w.sunDisc;
    neonUniforms.uNeon.value = neonLevel(d, w);
    windowUniforms.uLitShare.value = litShareNow(litShare(s.hour), d, SHARE_STEP);
    envUniforms.uWet.value = w.wet;
    envUniforms.uSnow.value = w.snow;
    envUniforms.uNight.value = night;

    // What falls, and in what light: rain from the air's own colour, a
    // little darker and bluer; snow near white, dimmer at night
    precip.rain = w.rain;
    precip.snow = w.flakes;
    mixInto(c, s.air, RAIN_TONE, 0.55);
    precip.rainColor.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
    const lit = 1 - 0.45 * night;
    precip.snowColor.setRGB(0.93 * lit, 0.95 * lit, Math.min(1, lit + 0.04 * night), THREE.SRGBColorSpace);
  }

  return null;
}
