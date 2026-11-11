"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { SkyState } from "../../../lib/sky";
import { envUniforms } from "../environment";
import { glowUniforms } from "../glow";
import { scenes, type SceneId } from "../scenes";
import { world } from "../store";
import {
  OUTDOORS,
  clamp01,
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
  mixInto,
  newDaylight,
  newWeather,
  progressStep,
  skyColor,
  weatherLook,
  type RGB,
} from "./looks";
import { overlay, precip, waterUniforms } from "./state";

// Richmond Hill's weather and time of day, shown in the world
// (world.get().sky, lib/sky.ts). Nothing is rebuilt or remounted: the
// place's own lights, sky, fog and the shared surface uniforms
// (environment.ts) are moved from the values the place was built with,
// by the table in looks.ts.
//
// - Daylight and weather blend separately, over BLEND seconds each
// - The first state after load is snapped, not blended: a visitor
//   arriving shouldn't watch the sky change. So is a live reading that
//   replaces the fallback while the world is still opening, and every
//   change in still view
// - Indoors (the workshop, the arcade, the pavilion), the day and the
//   weather come in through the windows: the sky outside, the light
//   through the glass, a little of the room's air; no rain, nothing wet
// - At rest, nothing is done per frame (beyond a check that the place's
//   lights are still the ones it found)

const BLEND = 3; // seconds
const OPENING = 2500; // ms after the first frame in which a first reading still snaps

type Kind = "sun" | "hemi" | "sky" | "spot" | "sign" | "window" | "beam";
type Base = { color: RGB; ground: RGB; intensity: number; dir?: THREE.Vector3 };
type Tagged = { obj: THREE.Object3D; kind: Kind; base: Base };

// The places' own values, as built, read once per object
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
  } else if (kind === "sun" || kind === "window") {
    const l = obj as THREE.Light;
    b = { color: rgbOf(l.color), ground: [0, 0, 0], intensity: l.intensity };
  } else if (kind === "spot" || kind === "sign") {
    // At full night; a sign's light also has its own by day (`ground[0]`)
    b = { color: [0, 0, 0], ground: [(obj.userData.day as number) ?? 0, 0, 0], intensity: (obj.userData.night as number) ?? 6 };
  } else if (kind === "beam") {
    b = { color: [0, 0, 0], ground: [0, 0, 0], intensity: (obj.userData.strength as { value: number }).value };
  } else if (kind === "sky") {
    b = { color: [0, 0, 0], ground: [0, 0, 0], intensity: 1, dir: (obj.userData.sunDir as THREE.Vector3).clone() };
  } else {
    b = { color: [0, 0, 0], ground: [0, 0, 0], intensity: 1 };
  }
  bases.set(obj, b);
  return b;
}

// Where nothing falls, per place (its own coordinates): the station's
// canopy and the building behind it
const shelters: Partial<Record<SceneId, [THREE.Vector3, THREE.Vector3]>> = {
  station: [new THREE.Vector3(-13.4, -1, -14), new THREE.Vector3(13.6, 4.45, 2.15)],
};

const PAINTED_HORIZON_INV = (() => {
  const c = new THREE.Color("#fff1dc");
  return new THREE.Color(1 / c.r, 1 / c.g, 1 / c.b);
})();
const SNOW_BOUNCE: RGB = [0.78, 0.8, 0.85];
// Rain a little darker and bluer than the air, so it shows against the sky
const RAIN_TONE: RGB = [0.5, 0.56, 0.68];
const lost = (tagged: Tagged[]) => {
  for (const t of tagged) if (!t.obj.parent) return true;
  return false;
};

const smooth = (t: number) => t * t * (3 - 2 * t);
const step01 = (a: number, b: number, x: number) => smooth(Math.min(1, Math.max(0, (x - a) / (b - a))));

const sameTarget = (a: SkyState | null, b: SkyState) =>
  !!a && a.preset === b.preset && a.daylight === b.daylight && progressStep(a.progress) === progressStep(b.progress);

export default function Atmosphere({ active }: { active: SceneId }) {
  const { scene, gl, invalidate } = useThree();
  const fog = useMemo(() => new THREE.Fog("#d7e4ec", 20, 135), []);
  const background = useMemo(() => new THREE.Color("#d7e4ec"), []);
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
    framedAt: 0, // when the first frame was drawn (0: not yet)
    dirty: true,
    tagged: [] as Tagged[],
    taggedFor: "" as string,
    // scratch, so a frame allocates nothing
    c: [0, 0, 0] as RGB,
    c2: [0, 0, 0] as RGB,
    range: { near: 0, far: 0 },
    air: [0, 0, 0] as RGB, // the fog's colour now
    fogBase: new Map<SceneId, RGB>(),
  });

  // Follow the store. A change of sky retargets the blend; nothing else
  // in the store concerns the atmosphere.
  useEffect(() => {
    const s = st.current;
    const retarget = () => {
      const sky = world.get().sky;
      if (sameTarget(s.target, sky)) return;
      const previous = s.target;
      s.target = sky;
      const still = world.get().still;
      // Snap: nothing has been shown yet; still view; or the fallback
      // giving way to a reading while the world is still opening
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
      // For styles that want to know (the frame around the world)
      const box = gl.domElement.closest<HTMLElement>(".world3d");
      if (box) {
        box.dataset.skyPreset = sky.preset;
        box.dataset.skyDaylight = sky.daylight;
      }
      // In still view the frame loop runs on demand: a frame to show it
      invalidate(2);
    };
    retarget();
    const unsubscribe = world.subscribe(retarget);
    return () => void unsubscribe();
  }, [gl, invalidate]);

  // For looking at it from the browser console in development
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") Object.assign(window, { __scene: scene, __overlay: overlay, __gl: gl, __precip: precip, __env: envUniforms });
  }, [scene, gl]);

  // The fog and the background are the atmosphere's, for every place
  useEffect(() => {
    scene.fog = fog;
    scene.background = background;
    st.current.dirty = true;
  }, [scene, fog, background, active]);

  useFrame((_, rawDt) => {
    const s = st.current;
    if (!s.framedAt) s.framedAt = performance.now();
    const dt = Math.min(rawDt, 0.05);
    const still = world.get().still;

    // Blend
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

    // The place's tagged lights, found once; again if one has gone (a
    // light rebuilt by its scene)
    if (s.taggedFor !== active || lost(s.tagged)) {
      const group = scene.getObjectByName(`scene:${active}`);
      if (!group) return;
      s.tagged = [];
      group.traverse((obj) => {
        const kind = obj.userData.atmos as Kind | undefined;
        if (kind) s.tagged.push({ obj, kind, base: baseOf(obj, kind) });
      });
      s.taggedFor = active;
      s.dirty = true;
    }
    if (!s.dirty) return;
    s.dirty = false;
    apply(s, active);
  });

  function apply(s: typeof st.current, id: SceneId) {
    const { d, w, c, c2 } = s;
    const indoor = !OUTDOORS.has(id);
    const night = d.night;
    // The street lamps come on through dusk; the signs a little earlier,
    // and both rise smoothly with the evening (a 3 s blend moves them too)
    const lampsOn = step01(0.3, 0.85, night);
    const signsOn = step01(0.05, 0.8, night);
    // Rain, snow and mist outdoors: the air holds more of the lamps'
    // light, and glows spread a little wider and softer
    const haze = indoor ? 0 : clamp01(Math.max(w.rain, w.flakes * 0.75, w.fogGrey * 0.7));
    glowUniforms.uLamps.value = indoor ? 0 : lampsOn * (0.75 + 0.45 * haze);
    glowUniforms.uSigns.value = signsOn;
    glowUniforms.uHaze.value = haze;

    // Fog and background, from the place's own
    const def = scenes[id];
    let fogBase = s.fogBase.get(id);
    if (!fogBase) s.fogBase.set(id, (fogBase = hexToRGB(def.fog.color)));
    fogColor(s.air, fogBase, d, w, indoor);
    fog.color.setRGB(s.air[0], s.air[1], s.air[2], THREE.SRGBColorSpace);
    background.copy(fog.color);
    fogRange(s.range, def.fog, d, w, indoor);
    fog.near = s.range.near;
    fog.far = s.range.far;

    for (const { obj, kind, base } of s.tagged) {
      if (kind === "sun") {
        const l = obj as THREE.DirectionalLight;
        lightColor(c, base.color, d.sun, d.sunMix, w);
        l.color.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
        l.intensity = base.intensity * d.sunScale * w.sunScale;
      } else if (kind === "hemi") {
        const l = obj as THREE.HemisphereLight;
        const k = indoor ? 0.7 : 1;
        lightColor(c, base.color, d.hemiSky, d.hemiMix * k, w);
        l.color.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
        lightColor(c, base.ground, d.hemiGround, d.hemiMix * k, w);
        // Snow on the ground throws light back up
        if (!indoor && w.snow > 0) mixInto(c, c, SNOW_BOUNCE, w.snow * 0.35);
        l.groundColor.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
        l.intensity = base.intensity * d.hemiScale * w.hemiScale;
      } else if (kind === "sky") {
        const u = ((obj as THREE.Mesh).material as THREE.ShaderMaterial).uniforms;
        skyColor(c, d.top, w, night);
        u.uTop.value.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
        skyColor(c, d.horizon, w, night);
        u.uHorizon.value.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
        // The fountain holds this sky, against the one it was painted with
        waterUniforms.uSkyTint.value.copy(u.uHorizon.value).multiply(PAINTED_HORIZON_INV);
        waterUniforms.uSkyNow.value.copy(u.uHorizon.value);
        u.uSun.value.setRGB(d.glow[0], d.glow[1], d.glow[2], THREE.SRGBColorSpace);
        cloudColor(c, d.cloudLit, w, night);
        u.uCloudLit.value.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
        cloudColor(c, d.cloudShade, w, night);
        u.uCloudShade.value.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
        u.uHaze.value.copy(fog.color);
        u.uHazeAmt.value = indoor ? 0 : Math.max(0, w.fogGrey) * 0.9;
        u.uCover.value = w.cover;
        u.uSunDisc.value = w.sunDisc;
        u.uMoon.value = step01(0.6, 1, night);
        u.uStars.value = step01(0.5, 1, night) * (1 - step01(0.4, 0.85, w.cover));
        const dir = u.uSunDir.value as THREE.Vector3;
        dir.copy(base.dir!);
        dir.y *= d.sunHeight;
        dir.normalize();
      } else if (kind === "spot") {
        // A street lamp, straight down; a touch softer in rain and mist.
        // Its shadow (where it has one) is drawn only while it's lit.
        const l = obj as THREE.SpotLight;
        l.intensity = base.intensity * lampsOn * (1 - 0.15 * haze);
        if (l.castShadow) l.shadow.autoUpdate = l.intensity > 0.01;
      } else if (kind === "sign") {
        const day = base.ground[0];
        (obj as THREE.PointLight).intensity = day + (base.intensity - day) * signsOn;
      } else if (kind === "window") {
        (obj as THREE.PointLight).intensity = base.intensity * (1 + 0.9 * night);
      } else if (kind === "beam") {
        const sun = Math.min(1.1, d.sunScale * w.sunScale);
        (obj.userData.strength as { value: number }).value = base.intensity * sun * (1 - night);
      }
    }


    // The surfaces (paint.ts and the vegetation's materials)
    envUniforms.uWet.value = indoor ? 0 : w.wet;
    envUniforms.uSnow.value = indoor ? 0 : w.snow;
    envUniforms.uNight.value = night;
    waterUniforms.uLight.value = Math.min(1.1, Math.max(0.15, d.hemiScale * w.hemiScale * (0.6 + 0.4 * Math.min(1, d.sunScale * w.sunScale))));

    // What falls, and in what light: rain a pale grey from the air's own
    // colour, snow near white, both dimmer at night
    precip.rain = indoor ? 0 : w.rain;
    precip.snow = indoor ? 0 : w.flakes;
    mixInto(c2, s.air, RAIN_TONE, 0.55);
    precip.rainColor.setRGB(c2[0], c2[1], c2[2], THREE.SRGBColorSpace);
    const lit = 1 - 0.5 * night;
    precip.snowColor.setRGB(0.95 * lit, 0.96 * lit, Math.min(1, 1.0 * lit + 0.04 * night), THREE.SRGBColorSpace);
    const shelter = shelters[id];
    const offset = def.offset;
    if (shelter) {
      precip.shelterMin.set(shelter[0].x + offset[0], shelter[0].y + offset[1], shelter[0].z + offset[2]);
      precip.shelterMax.set(shelter[1].x + offset[0], shelter[1].y + offset[1], shelter[1].z + offset[2]);
    } else {
      precip.shelterMin.set(1, 1, 1);
      precip.shelterMax.set(-1, -1, -1);
    }
  }

  return null;
}
