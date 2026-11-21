"use client";

import { Canvas, useFrame, useThree, type RootState } from "@react-three/fiber";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { cityPath, sectionForCityPath } from "../../lib/cityRoutes";
import { parseSkyParam } from "../../lib/skyParam";
import { listed, pageSections, section, type SectionId } from "../../sections/registry";
import { anchors, boardsIn } from "./anchors";
import { WorldLights } from "./common";
import Atmosphere from "./atmosphere/Atmosphere";
import Precipitation, { disposePrecipWarmers, precipWarmers } from "./atmosphere/Precipitation";
import { disposeShared } from "./kit/materials";
import { disposeTextures, textureBytes } from "./kit/textures";
import { glowOn } from "./kit/uniforms";
import { isFlat } from "./flat";
import { onIdle } from "./idle";
import Post from "./Post";
import { loadScene, loadedScene, type SceneComponent } from "./sceneChunks";
import { aimAt, coverMargin, placePending, plateUniforms, plateView, wantPlate } from "./kit/plate";
import { ProofPlace, proofWanted } from "./PlatePlace";
import Flight, { aerialPoint, aerialReady, flightView, keepOverAerial } from "./Flight";
import { AERIAL, crossAt, flightAt, flightFrom, flightLength, flightPlan, travelKind, type FlightPlan } from "./flight.def";
import type { SceneProps } from "./common";
import { focusTravel, isPlace, restingPose, sceneOrder, scenes, type PlateDef, type Pose, type SceneId, type V3 } from "./scenes";
import { HOME_SIGNS } from "./districts/lujiazui.def";
import { useWorld, world } from "./store";
import { RestTicker, useLinkHints } from "./Wake";
import { TIERS, type Quality } from "./tiers";

// The 3D city's canvas: one for every /city page, kept across their
// navigations (app/city/layout.tsx mounts the shell, CityShell.tsx, which
// loads this). The address picks the place; the Director moves the camera
// there, a flight over the city's aerial painting from one place to the
// next (flight.def.ts, Flight.tsx). Carried over from the park's
// World3D.tsx: the Director (cuts in still view), the frame loop that stops when nothing changes, the
// warm-up, and the tags pinned over the riverside's signs. The mouse never
// moves the camera (no parallax, no looking round by dragging: the
// painted places' plan, docs/superpowers/plans/2026-11-21-city-painted-
// 25d.md); at rest the camera only drifts, very slowly, by itself
// (restDrift, below).

const RIVERSIDE: SceneId = "lujiazui";

// R3F 9.8 still makes a THREE.Clock for every canvas, which three r183 and
// later report as deprecated, once per canvas: R3F's to change, not ours,
// and noise in every console check. That one message is dropped; every
// other message three sends goes to the console as before.
THREE.setConsoleFunction((type, message, ...params) => {
  if (type === "warn" && typeof message === "string" && message.startsWith("THREE.Clock: This module has been deprecated")) return;
  (console[type as "log" | "warn" | "error"] ?? console.log)(message, ...params);
});

// Which place an address shows: the section's district, the riverside for
// /city (and anything that isn't a section)
const placeFor = (pathname: string): SceneId => {
  const id = sectionForCityPath(pathname);
  return id ? section(id).district : RIVERSIDE;
};
const sectionOf = (place: SceneId): SectionId => pageSections.find((s) => s.district === place)!.id;

// A journey waits at the threshold, the view closed, for a place whose
// chunk (or painting, kit/plate.ts: placePending) hasn't landed yet, but
// never longer than this
const WAIT_FOR_PLACE_MS = 1500;
// The first place's painting holds the first frame (the band's painting
// stays on screen meanwhile) for at most this
const WAIT_FOR_FIRST_MS = 8000;

// The rest drift (desktop tiers, at rest, never in still view): the eye
// wanders on a slow figure, sideways `amplitude` of the distance to what
// it looks at and half that up and down, once round in `period` s, eased
// in over DRIFT_EASE s when the camera comes to rest and out at once when
// it moves. A painted place says its own (scenes.ts: PlateDef.drift); the
// rest take this. Under 1% of the view in any 10 s (scenes.ts:
// driftTravel).
const DEFAULT_DRIFT: PlateDef["drift"] = { amplitude: 0.003, period: 40 };
const DRIFT_EASE = 2.5;
const driftOf = (id: SceneId) => {
  const def = scenes[id];
  return isPlace(def) ? def.plate.drift : DEFAULT_DRIFT;
};

// Still view (app/lib/still.ts, store.ts): the camera cuts instead of
// travelling, and nothing moves
const holdingStill = () => world.get().still;

// Where the sheet's rounded top edge starts (it comes up 2rem over the band)
const SHEET_OVERLAP = 32;

// On narrow screens the panel is a sheet over the lower part of the
// screen, from --hero down (city-pages.css); the camera's subject is
// lifted into the part above it. Read once per resize or page change.
// Measured where the sheet really starts (the dock, the top of the sheet,
// or the panel: its top as laid out, not as scrolled, plus the rounded
// top's overlap), now and then (the page's words settle), else --hero.
let hero = { key: "", ticks: 0, px: 0 };
const heroHeight = (height: number) => {
  const key = `${height}|${location.pathname}`;
  if (hero.key !== key || ++hero.ticks > 120) {
    const sheet = isFlat() ? document.querySelector(".place-dock") ?? document.querySelector(".city-panel") : null;
    const top = sheet ? sheet.getBoundingClientRect().top + window.scrollY : 0;
    const css = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--hero")) || 0;
    hero = { key, ticks: 0, px: top > 0 ? Math.min(height, top + SHEET_OVERLAP) : css };
  }
  return hero.px || height * (height <= 480 ? 0.64 : 0.46);
};
const narrowLift = (height: number, ceiling: number) => {
  // The middle of the strip between the bar and the sheet
  const middle = (ceiling + heroHeight(height) - SHEET_OVERLAP) / 2;
  return 0.5 - middle / height;
};

// The lowest edge of the top bar, in the canvas's pixels; read on a resize
// and now and then (the time and weather fill in)
let bar = { key: "", ticks: 0, bottom: 0 };
const barBottom = (width: number, height: number) => {
  const key = `${width}x${height}`;
  if (bar.key !== key || ++bar.ticks > 120) {
    const el = document.querySelector(".top-bar");
    bar = { key, ticks: 0, bottom: el ? el.getBoundingClientRect().bottom : 0 };
  }
  return bar.bottom;
};

// The panel's edges on wide screens (0, 0 on the narrow layout): the tags
// stay clear of it, the place is framed beside it. The showing page's
// panel: the router may keep an earlier page, hidden.
let panel = { key: "", ticks: 0, left: 0, right: 0 };
const panelEdges = (width: number, height: number) => {
  const key = `${width}x${height}|${location.pathname}`;
  if (panel.key !== key || ++panel.ticks > 120) {
    const el = [...document.querySelectorAll<HTMLElement>(".city-panel")].find((p) => p.checkVisibility?.() ?? true);
    const r = el && !isFlat() ? el.getBoundingClientRect() : null;
    panel = { key, ticks: 0, left: r?.left ?? 0, right: r?.right ?? 0 };
  }
  return panel;
};
const panelRight = (width: number, height: number) => panelEdges(width, height).right;

// The place dock's top edge on wide screens (panels/PlaceDock.tsx): the
// tags stay above it; the screen's foot where there's none
let dock = { key: "", ticks: 0, top: 0 };
const dockTop = (width: number, height: number) => {
  const key = `${width}x${height}|${location.pathname}`;
  if (dock.key !== key || ++dock.ticks > 120) {
    const el = document.querySelector(".place-dock");
    const top = el ? el.getBoundingClientRect().top : 0;
    dock = { key, ticks: 0, top: top > 0 && top < height ? top : height };
  }
  return dock.top;
};

const add = (a: V3, b: V3) => new THREE.Vector3(a[0] + b[0], a[1] + b[1], a[2] + b[2]);
const inWorld = (scene: SceneId, pose: Pose) => ({ pos: add(pose.pos, scenes[scene].offset), target: add(pose.target, scenes[scene].offset) });
// Where the camera rests in a place: the focus pose the panel or a click
// chose (the store's `focus`, districts/<id>.def.ts: focus), else home
const restPose = (scene: SceneId) => inWorld(scene, restingPose(scene, world.get().focus));
const v3 = (v: THREE.Vector3): V3 => [v.x, v.y, v.z];

// The plates' usual shape (app/assets/city/*.webp, 2400 × 1032; ?frame=plate
// uses each place's own: PlateDef.aspect)
export const PLATE_ASPECT = 2400 / 1032;
// Development only, for matching a place to its painting: ?frame=plate
// holds the camera at the place's plateFrame (districts/<id>.def.ts), the
// view cut to the painting's shape, the panel and the bar hidden. The
// whole switch is behind NODE_ENV, so a production build has none of it.
const plateWanted = () => process.env.NODE_ENV === "development" && new URLSearchParams(location.search).get("frame") === "plate";

// The haze a flight lifts out through (the iris's colour while it does):
// the aerial painting's soft sky by day, the threshold's navy at night,
// never a bright flash
const HAZE_DAY = new THREE.Color("#9fb4c6");
const HAZE_NIGHT = new THREE.Color("#0c1526");
const haze = new THREE.Color();
const hazeColour = () => `#${haze.copy(HAZE_NIGHT).lerp(HAZE_DAY, plateUniforms.uDay.value).getHexString()}`;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

type Move = {
  kind: "move";
  dur: number;
  ease: (t: number) => number;
  to: { pos: THREE.Vector3; target: THREE.Vector3 }[];
  iris?: { to: number; from: number; until: number };
  focus?: boolean; // a turn toward (or back from) something chosen in the place
};
type Swap = { kind: "swap"; scene: SceneId; pose: { pos: THREE.Vector3; target: THREE.Vector3 } };
// A flight to another place (flight.def.ts): it stays at the head of the
// queue while it runs; `hold` is where the camera was in the place it
// leaves when it began
type Fly = { kind: "fly"; plan: FlightPlan; t: number; hold: { pos: THREE.Vector3; look: THREE.Vector3 } };
type Seg = Move | Swap | Fly;
type Running = { seg: Move; t: number; pos: THREE.CatmullRomCurve3; look: THREE.CatmullRomCurve3; irisFrom: number };


// The camera, and every journey it makes
function Director({
  target,
  active,
  onSwap,
  iris,
  still,
  tier,
  plate,
}: {
  target: SceneId;
  active: SceneId;
  onSwap: (scene: SceneId) => void;
  iris: React.RefObject<HTMLDivElement | null>;
  still: boolean;
  tier: Quality;
  plate: boolean;
}) {
  const { camera, gl, invalidate, scene } = useThree();
  const st = useRef({
    pos: new THREE.Vector3(),
    look: new THREE.Vector3(),
    queue: [] as Seg[],
    running: null as Running | null,
    iris: 1,
    active,
    started: false,
    drift: 0, // the drift's weight, 0 .. 1
    driftT: 0, // the drift's clock, s (runs only while it shows)
    shift: 0,
    shiftY: 0,
    framed: false,
    waitingSince: 0,
    roll: 0, // the flight's bank, radians
    flown: 0, // when the flight under way began (performance.now), for its measure
    scaled: null as SceneId | null, // the place whose picture a flight has pulled back
  });

  useEffect(() => {
    st.current.active = active;
  }, [active]);

  // Plan the journey whenever the address changes. A new choice in the
  // middle of a journey plans from wherever the camera is now.
  useEffect(() => {
    const s = st.current;
    const to = target;
    const from = s.started ? s.active : null;
    // (a focus belongs to the place it was chosen in)
    if (from !== to) world.set({ arrived: false, hover: null, focus: null });
    // (a painted place starts fetching its painting now)
    wantPlate(to);
    if (iris.current) iris.current.style.background = scenes[to === RIVERSIDE && from ? from : to].threshold;
    s.running = null;
    const final = restPose(to);
    invalidate();

    const kind = travelKind(from, to, holdingStill());
    if (kind === "cut") {
      // Still view: a cut, no travel
      s.queue = [{ kind: "swap", scene: to, pose: final }];
      s.iris = 0;
      s.started = true;
      return;
    }
    if (kind === "open" || !from) {
      // Arriving on the site (or a deep link): already there, the view
      // opening from the threshold's colour, no travel from anywhere
      s.queue = [{ kind: "swap", scene: to, pose: final }, { kind: "move", dur: 0.5, ease: easeOut, to: [final], iris: { to: 0, from: 0, until: 1 } }];
      s.started = true;
      return;
    }
    const hold = { pos: s.pos.clone(), look: s.look.clone() };
    const head = s.queue[0];
    if (head?.kind === "fly") {
      // Another choice in the middle of a flight: the new one starts from
      // wherever this one is (in the air, or in the clouds over a place)
      // and takes its place, never queued behind it (Review Focus 1)
      s.queue = [{ kind: "fly", plan: flightFrom(head.plan, head.t, s.active, to), t: 0, hold }];
      flightView.wanted = true;
      s.flown = performance.now();
      return;
    }
    if (kind === "stay") {
      s.queue = [];
      if (s.iris > 0) s.queue.push({ kind: "move", dur: 0.35, ease: easeOut, to: [final], iris: { to: 0, from: 0, until: 1 } });
      return;
    }
    // From one place to another: lift out, fly over the city, come down
    s.queue = [{ kind: "fly", plan: flightPlan(from, to), t: 0, hold }];
    flightView.wanted = true;
    s.flown = performance.now();
  }, [target, iris, invalidate]);

  // Something chosen in the place (a screen, a line, the machine), or the
  // choice let go: the camera turns to its focus pose, or back home, on a
  // short gentle arc, eased; a new choice on the way turns from wherever
  // the camera is. Never in the middle of a journey (the journey's end
  // settles on it); a cut in still view (the rest below takes it at once).
  // Keyboard focus stays where the visitor put it: nothing here touches
  // the page.
  useEffect(() => {
    let last = world.get().focus;
    const off = world.subscribe(() => {
      const key = world.get().focus;
      if (key === last) return;
      last = key;
      const s = st.current;
      invalidate();
      if (!s.started || holdingStill()) return;
      const journey = s.queue.length > 0 || (s.running && !s.running.seg.focus);
      if (journey) return;
      const to = restPose(s.active);
      const { mid, dur, distance } = focusTravel({ pos: v3(s.pos), target: v3(s.look) }, { pos: v3(to.pos), target: v3(to.target) });
      if (distance < 0.01) return;
      s.running = null;
      s.queue = [{ kind: "move", dur, ease: easeInOut, to: [{ pos: new THREE.Vector3(...mid.pos), target: new THREE.Vector3(...mid.target) }, to], focus: true }];
    });
    return () => {
      off();
    };
  }, [invalidate]);

  // Still view turned on in the middle of a journey: cut to where it was
  // going, at once
  useEffect(() => {
    const s = st.current;
    if (!still || !s.started) return;
    s.running = null;
    s.queue = [{ kind: "swap", scene: target, pose: restPose(target) }];
    s.iris = 0;
    s.drift = 0;
    invalidate();
  }, [still, target, invalidate]);

  const tmp = useMemo(() => ({ dir: new THREE.Vector3(), right: new THREE.Vector3(), p: new THREE.Vector3(), l: new THREE.Vector3() }), []);

  // A place's picture pulled back (scale under 1) toward where the camera
  // looks, as the flight lifts out of it or comes down into it; any other
  // place put back as it was
  const pullBack = (id: SceneId | null, scale: number) => {
    const s = st.current;
    if (s.scaled && s.scaled !== id) {
      const g = scene.getObjectByName(`scene:${s.scaled}`);
      g?.scale.setScalar(1);
      g?.position.set(...scenes[s.scaled].offset);
      s.scaled = null;
    }
    if (!id) return;
    const g = scene.getObjectByName(`scene:${id}`);
    if (!g) return;
    const [ox, oy, oz] = scenes[id].offset;
    g.scale.setScalar(scale);
    g.position.set(s.look.x - scale * (s.look.x - ox), s.look.y - scale * (s.look.y - oy), s.look.z - scale * (s.look.z - oz));
    s.scaled = scale === 1 ? null : id;
  };

  useFrame(({ size }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = st.current;
    const reduce = holdingStill();
    let busy = false;
    if (!s.framed) {
      s.framed = true;
      performance.mark("city:first-frame");
      // The band under the canvas can hide now (city-pages.css)
      gl.domElement.closest(".city3d")?.setAttribute("data-drawn", "");
    }

    // Next segment
    while (!s.running && s.queue.length) {
      const seg = s.queue[0];
      if (seg.kind === "fly") break;
      // Not into an empty place: hold at the threshold until it's built
      const place = seg.kind === "swap" ? scene.getObjectByName(`scene:${seg.scene}`) : undefined;
      if (seg.kind === "swap" && ((s.active !== seg.scene && !place?.children.length) || placePending(place))) {
        const now = performance.now();
        s.waitingSince ||= now;
        if (now - s.waitingSince < WAIT_FOR_PLACE_MS) {
          busy = true;
          break;
        }
      }
      s.waitingSince = 0;
      s.queue.shift();
      if (seg.kind === "swap") {
        s.pos.copy(seg.pose.pos);
        s.look.copy(seg.pose.target);
        if (s.active !== seg.scene) {
          s.active = seg.scene;
          onSwap(seg.scene);
        }
        if (reduce) s.iris = 0;
      } else {
        s.running = {
          seg,
          t: 0,
          pos: new THREE.CatmullRomCurve3([s.pos.clone(), ...seg.to.map((p) => p.pos)], false, "centripetal"),
          look: new THREE.CatmullRomCurve3([s.look.clone(), ...seg.to.map((p) => p.target)], false, "centripetal"),
          irisFrom: s.iris,
        };
      }
    }

    // A flight (flight.def.ts: flightAt says where it is at each moment)
    const head = s.queue[0];
    const fly = !s.running && head?.kind === "fly" ? head : null;
    if (fly) {
      busy = true;
      const p = fly.plan;
      let t = Math.min(flightLength(p), fly.t + dt);
      // The crossing into the next place, under the closed clouds, waits
      // for a place still being built or painted (never longer than
      // WAIT_FOR_PLACE_MS)
      if (!p.back && t >= crossAt(p) && s.active !== p.to) {
        const place = scene.getObjectByName(`scene:${p.to}`);
        const now = performance.now();
        if (!s.waitingSince) s.waitingSince = now;
        if ((!place?.children.length || placePending(place)) && now - s.waitingSince < WAIT_FOR_PLACE_MS) t = Math.min(t, crossAt(p) - 1e-4);
        else {
          s.waitingSince = 0;
          s.active = p.to;
          onSwap(p.to);
        }
      }
      fly.t = t;
      const f = flightAt(p, t);
      let pulled: SceneId | null = null;
      if (f.stage === "air") {
        aerialPoint(f.at, f.alt, s.pos);
        aerialPoint(f.look, 0, s.look);
        s.roll = f.roll;
      } else {
        // In a place: easing toward its exit while lifting out, from its
        // entrance to its rest while arriving; its picture pulled back
        s.roll = 0;
        pulled = f.stage === "from" ? p.from : p.to;
        if (f.stage === "from") {
          const to = p.back ? restPose(pulled) : inWorld(pulled, scenes[pulled].exit);
          s.pos.lerpVectors(fly.hold.pos, to.pos, f.progress);
          s.look.lerpVectors(fly.hold.look, to.target, f.progress);
        } else {
          const enter = inWorld(pulled, scenes[pulled].enter);
          const rest = restPose(pulled);
          s.pos.lerpVectors(enter.pos, rest.pos, f.progress);
          s.look.lerpVectors(enter.target, rest.target, f.progress);
        }
      }
      pullBack(pulled, f.scale);
      // One soft pass of cloud a flight: the lift out of a place is a
      // dissolve through the sky's haze (the iris, in its colour for the
      // hour: hazeColour), and only the descent into the next place
      // passes through the clouds (the veil). (Over the city before its
      // painting is here: cruising in cloud.)
      const liftPass = p.back || (p.lift > 0 && t < p.lift + p.cruise);
      flightView.air = f.stage === "air";
      flightView.veil = f.stage === "air" && !aerialReady() ? Math.max(f.veil, 0.95) : liftPass ? 0 : f.veil;
      flightView.look.copy(s.look);
      flightView.drift.set(f.at[0] * AERIAL.aspect, -f.at[1]).multiplyScalar(2.4 / Math.max(f.alt, 0.2));
      if (liftPass) {
        s.iris = f.veil;
        if (iris.current) iris.current.style.background = hazeColour();
      } else if (s.iris > 0) s.iris = Math.max(0, s.iris - dt * 3);
      if (f.done) {
        // (on the performance timeline: "city:flight", from the choice to
        // the arrival, any wait for the place included)
        performance.measure("city:flight", { start: s.flown, end: performance.now(), detail: { from: p.from, to: p.to, planned: flightLength(p) } });
        s.queue.shift();
        pullBack(null, 1);
        flightView.air = false;
        flightView.veil = 0;
        s.roll = 0;
      }
    } else if (flightView.air || flightView.veil || s.scaled || s.roll) {
      // (a flight cut short by still view: nothing of it stays)
      pullBack(null, 1);
      flightView.air = false;
      flightView.veil = 0;
      s.roll = 0;
    }

    const r = s.running;
    if (r) {
      busy = true;
      r.t = Math.min(1, r.t + dt / r.seg.dur);
      const e = r.seg.ease(r.t);
      r.pos.getPoint(e, s.pos);
      r.look.getPoint(e, s.look);
      const ir = r.seg.iris;
      if (ir) {
        const k = THREE.MathUtils.clamp((r.t - ir.from) / Math.max(ir.until - ir.from, 0.001), 0, 1);
        s.iris = THREE.MathUtils.lerp(r.irisFrom, ir.to, k * k * (3 - 2 * k));
      }
      if (r.t >= 1) s.running = null;
    } else if (!s.queue.length) {
      // At rest: settle on the place's home view
      const rest = restPose(s.active);
      const k = reduce ? 1 : 1 - Math.exp(-dt * 6);
      s.pos.lerp(rest.pos, k);
      s.look.lerp(rest.target, k);
      const settled = s.pos.distanceTo(rest.pos) < 0.02 && s.look.distanceTo(rest.target) < 0.05;
      if (!settled) busy = true;
      else {
        s.pos.copy(rest.pos);
        s.look.copy(rest.target);
        if (!world.get().arrived) world.set({ arrived: true });
      }
    }

    // The rest drift: desktop tiers, at rest, not in still view (and not
    // in ?frame=plate). Moving the eye with the aim held makes a painted
    // place's near layers slide over its far ones.
    tmp.p.copy(s.pos);
    tmp.l.copy(s.look);
    // (drawn at rest by the RestTicker, 30 times a second at most, not
    // every frame: it doesn't make the Director busy)
    const resting = !r && !s.queue.length && !reduce && !plate;
    if (resting && tier !== "mobile" && !holdingStill()) {
      s.drift = Math.min(1, s.drift + dt / DRIFT_EASE);
      s.driftT += dt;
    } else {
      s.drift = 0;
    }
    if (s.drift > 0) {
      const { amplitude, period } = driftOf(s.active);
      const reach = amplitude * tmp.p.distanceTo(tmp.l) * (s.drift * s.drift * (3 - 2 * s.drift));
      const w = (2 * Math.PI * s.driftT) / period;
      tmp.dir.subVectors(tmp.l, tmp.p).normalize();
      tmp.right.crossVectors(tmp.dir, camera.up).normalize();
      tmp.p.addScaledVector(tmp.right, reach * Math.sin(w));
      tmp.p.y += reach * 0.5 * Math.sin(w * 0.73 + 1);
    }
    camera.position.copy(tmp.p);
    camera.lookAt(tmp.l);
    if (s.roll) camera.rotateZ(s.roll);

    // Frame the place on its side on wide screens, leaving the panel its
    // half; on narrow screens in the strip between the bar and the sheet
    const cam = camera as THREE.PerspectiveCamera;
    const narrow = isFlat();
    const def = scenes[s.active];
    const aspect = size.width / size.height;
    const tan = (d: number) => Math.tan(THREE.MathUtils.degToRad(d));
    const lens = (halfTan: number) => 2 * THREE.MathUtils.radToDeg(Math.atan(halfTan));
    const ceiling = barBottom(size.width, size.height);
    let fov = def.fov;
    let want = 0;
    let wantY = 0;
    plateView.fill = 1;
    plateView.top = 0;
    plateView.painting = null;
    plateView.aim = null;
    const edge = narrow ? 0 : panelRight(size.width, size.height);
    if (narrow && isPlace(def)) {
      // The narrow layout: the painting framed to the strip between the
      // bar and the sheet (both opaque there), as much of it as the strip
      // holds (its full height on a portrait screen, its full width on a
      // phone on its side), the home axis in the strip's middle, and the
      // painting slid to put the place's subject there (kit/plate.ts:
      // plateView, cover)
      const bottom = Math.min(size.height, heroHeight(size.height));
      const top = Math.min(ceiling, bottom * 0.5);
      const strip = bottom - top;
      plateView.fill = bottom / size.height;
      plateView.top = top / size.height;
      const k = Math.min(size.height / strip, (def.plate.aspect * size.height) / size.width);
      fov = lens((tan(def.plateFrame.fov / 2) * k) / coverMargin(def.plate));
      wantY = narrowLift(size.height, ceiling);
      plateView.painting = def.plate.painting;
      const p = def.portrait;
      if (aspect < 1 && p) plateView.aim = p.aim ?? aimAt(def, p.yaw, p.lift ?? 0);
      else if (size.height <= 480 && def.short !== undefined) plateView.aim = def.short.aim ?? aimAt(def, 0, -def.short.under);
    } else if (narrow) {
      fov = aspect < 1 ? def.fov * 1.2 : def.fov;
      wantY = narrowLift(size.height, ceiling);
    } else if (def.frame !== "center" && edge > 0) {
      // A wide screen: the view's middle moves to the middle of the part
      // the panel leaves (the panel on the left, or on the right for a
      // place framed "left": city-pages.css), and the lens widens if it
      // must to show `span` degrees either side of it there
      const [l, r] = def.frame === "right" ? [edge + 12, size.width - 12] : [12, panelEdges(size.width, size.height).left - 12];
      want = 0.5 - (l + r) / 2 / size.width;
      if (def.span) fov = Math.max(fov, lens(tan(def.span) / (((r - l) / size.width) * aspect)));
    }
    // (in still view, and before the first arrival, the framing is simply there)
    const glide = reduce || !s.started || !world.get().arrived ? 1 : 1 - Math.exp(-dt * 4);
    s.shift += (want - s.shift) * glide;
    s.shiftY += (wantY - s.shiftY) * glide;
    if (Math.abs(want - s.shift) > 0.0005 || Math.abs(wantY - s.shiftY) > 0.0005) busy = true;
    // Over the aerial painting: the flight's own lens
    if (flightView.air) fov = AERIAL.fov * (aspect < 1 ? 1.2 : 1);
    if (plate) {
      // ?frame=plate (development): the painting's pose and lens, nothing else
      const pf = def.plateFrame;
      const p = inWorld(s.active, pf);
      camera.position.copy(p.pos);
      camera.lookAt(p.target);
      fov = pf.fov;
      s.shift = s.shiftY = 0;
    }
    if (cam.fov !== fov) cam.fov = fov;
    if (Math.abs(s.shift) > 0.001 || Math.abs(s.shiftY) > 0.001) cam.setViewOffset(size.width, size.height, s.shift * size.width, s.shiftY * size.height, size.width, size.height);
    else cam.clearViewOffset();
    cam.updateProjectionMatrix();
    if (flightView.air) keepOverAerial(cam);

    // The threshold
    const el = iris.current;
    if (el) {
      el.style.setProperty("--iris", s.iris.toFixed(3));
      el.style.visibility = s.iris > 0.002 ? "visible" : "hidden";
    }
    if (busy) invalidate();
  });

  return null;
}

// The riverside's boards as links (Tags, below): each link is laid over
// its board as the board's own hit area and focus ring, the board's painted
// title its visible label. A link is the board's screen rectangle, grown to
// 44×44 if the board is smaller; every link must keep 8px from the others
// and stay in the view (under the bar, beside the panel, above a phone's
// sheet). Where they can't all do that (a small phone, a phone on its
// side), none is over the scene: the same links stand as a row of keys at
// the top of the panel (CityPage.tsx: .city-keys; html[data-city-tags=
// "row"]), and the boards don't answer a pointer (Riverside.tsx).
const TAG_GAP = 8;
const TAG_MIN = 44;
type Box = { l: number; r: number; t: number; b: number };
const clash = (a: Box, b: Box) => a.l < b.r + TAG_GAP && a.r > b.l - TAG_GAP && a.t < b.b + TAG_GAP && a.b > b.t - TAG_GAP;

// The links, found once when the nav mounts (Tags), not every frame
let tagLinks: HTMLElement[] = [];
// Why the links last didn't fit (logged under ?perf, when it changes)
let lastWhy = "";
const perfWanted = () => new URLSearchParams(location.search).has("perf");

function TagProjector({ active }: { active: SceneId }) {
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    const nav = tagLinks[0]?.parentElement;
    if (!nav) return;
    const shown = active === RIVERSIDE && world.get().arrived;
    if (!shown) {
      if (!nav.hasAttribute("data-hidden")) nav.setAttribute("data-hidden", "");
      return;
    }
    nav.removeAttribute("data-hidden");
    const narrow = isFlat();
    const ceiling = barBottom(size.width, size.height) + 4;
    // (wide: over the place dock, 8px clear of it; narrow: over the sheet,
    // whose top the dock is)
    const floor = narrow ? heroHeight(size.height) - SHEET_OVERLAP - 4 : dockTop(size.width, size.height) - 8;
    // (4px from the screen's edges: room for the focus ring)
    const edge = panelRight(size.width, size.height);
    const left = edge ? edge + 8 : 4;
    let fits = true;
    let why = "";
    const project = (p: THREE.Vector3 | undefined) => {
      if (!p) {
        fits = false;
        why ||= "no anchor";
        return [0, 0];
      }
      v.copy(p).project(camera);
      if (v.z > 1) {
        fits = false;
        why ||= "behind";
      }
      return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height];
    };
    // What a link may cover: clear of the bar, the sheet or the dock, the
    // panel, and the screen's edges
    const area: Box = { l: left, r: size.width - 4, t: ceiling, b: floor };
    const extent = (id: string): Box => {
      const [, top] = project(anchors.get(`${id}:top`));
      const [, foot] = project(anchors.get(`${id}:foot`));
      const [l] = project(anchors.get(`${id}:left`));
      const [r] = project(anchors.get(`${id}:right`));
      return { l: Math.min(l, r), r: Math.max(l, r), t: Math.min(top, foot), b: Math.max(top, foot) };
    };
    const covers = (a: Box, b: Box) => a.l <= b.l && a.r >= b.r && a.t <= b.t && a.b >= b.b;
    const boxes: Box[] = [];
    boardsIn.value = true;
    for (const el of tagLinks) {
      const sign = el.dataset.anchor!;
      const boardId = sign.replace("sign:", "board:");
      // the board as drawn (Riverside.tsx), else the place
      const board = extent(anchors.has(`${boardId}:top`) ? boardId : sign);
      // At least 44×44 round the board, slid within its growth to stay in
      // the free area while it still covers all of the board
      const grow = (b: Box): Box => {
        const w = Math.max(TAG_MIN, b.r - b.l);
        const h = Math.max(TAG_MIN, b.b - b.t);
        const g = { l: (b.l + b.r - w) / 2, r: (b.l + b.r + w) / 2, t: (b.t + b.b - h) / 2, b: (b.t + b.b + h) / 2 };
        const dy = g.b > area.b && b.b <= area.b ? area.b - g.b : g.t < area.t && b.t >= area.t ? area.t - g.t : 0;
        const dx = g.r > area.r && b.r <= area.r ? area.r - g.r : g.l < area.l && b.l >= area.l ? area.l - g.l : 0;
        return { l: g.l + dx, r: g.r + dx, t: g.t + dy, b: g.b + dy };
      };
      if (!covers(area, board)) boardsIn.value = false;
      let box = grow(board);
      // Wide: the whole place is the link (a bigger target), trimmed to the
      // free area (the panel may cover a corner of it), as long as it still
      // covers its board. Narrow: the board only (bigger there), so the
      // five stand apart on a phone.
      if (!narrow) {
        const place = extent(sign);
        const trimmed = { l: Math.max(place.l, area.l), r: Math.min(place.r, area.r), t: Math.max(place.t, area.t), b: Math.min(place.b, area.b) };
        if (covers(trimmed, board) && trimmed.r - trimmed.l >= TAG_MIN && trimmed.b - trimmed.t >= TAG_MIN) box = trimmed;
      }
      const miss =
        box.t < area.t ? "ceiling" : box.b > area.b ? "floor" : box.l < area.l ? "left" : box.r > area.r ? "right" : boxes.some((o) => clash(box, o)) ? "clash" : "";
      if (miss) {
        fits = false;
        why ||= `${sign} ${miss}` + (perfWanted() ? ` board ${JSON.stringify(board, (_, n) => (typeof n === "number" ? Math.round(n) : n))} area ${JSON.stringify(area, (_, n) => (typeof n === "number" ? Math.round(n) : n))}` : "");
      }
      boxes.push(box);
    }
    const html = document.documentElement;
    if (why !== lastWhy && perfWanted()) console.debug("city:tags", why || "over");
    lastWhy = why;
    if (!fits) {
      if (html.dataset.cityTags !== "row") html.dataset.cityTags = "row";
      return;
    }
    if (html.dataset.cityTags !== "over") html.dataset.cityTags = "over";
    tagLinks.forEach((el, i) => {
      const b = boxes[i];
      el.style.transform = `translate3d(${Math.round(b.l)}px, ${Math.round(b.t)}px, 0)`;
      el.style.width = `${Math.round(b.r - b.l)}px`;
      el.style.height = `${Math.round(b.b - b.t)}px`;
    });
  });
  return null;
}

// The riverside's signs as links: one per board, laid over it (above), the
// keyboard's and screen reader's way to each section and the pointer's
// target. Every listed section but Home; each link's name is its section's
// title from the registry (the board shows the same word, painted).
// In the order they stand on screen, left to right by their spots' middles
// in the painting (districts/lujiazui.def.ts: HOME_SIGNS), so Tab goes
// across the view as the eye does.
const middle = (id: keyof typeof HOME_SIGNS) => HOME_SIGNS[id].spot.reduce((a, c) => a + c[0], 0) / 4;
const tagged = listed.filter((s) => s.id !== "home").sort((a, b) => middle(a.id as keyof typeof HOME_SIGNS) - middle(b.id as keyof typeof HOME_SIGNS));

function Tags({ show }: { show: boolean }) {
  useEffect(() => {
    if (!show) return;
    return () => {
      delete document.documentElement.dataset.cityTags;
    };
  }, [show]);
  const found = useCallback((nav: HTMLElement | null) => {
    tagLinks = nav ? [...nav.querySelectorAll<HTMLElement>("[data-anchor]")] : [];
  }, []);
  if (!show) return null;
  return (
    <nav aria-label="Signs" className="city-tags" data-hidden="" ref={found}>
      {tagged.map((s) => (
        <Link key={s.id} className="city-tag" href={cityPath(s.id)} data-anchor={`sign:${s.id}`}>
          <span className="city-tag-name">{section(s.id).title}</span>
        </Link>
      ))}
    </nav>
  );
}

// Under `prefers-contrast: more`, no added glow (kit/uniforms.ts: glowOn;
// Post.tsx drops the bloom itself), followed live
function Contrast() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const query = matchMedia("(prefers-contrast: more)");
    const apply = () => {
      glowOn.value = query.matches ? 0 : 1;
      invalidate();
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [invalidate]);
  return null;
}

// The loop draws on demand: a few frames whenever something the picture
// shows changes (the address, the store), and none in between. A change
// of sky alone draws nothing here: the atmosphere (atmosphere/
// Atmosphere.tsx) asks for its own frames while it blends.
function Demand({ pathname }: { pathname: string }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let last = world.get();
    const off = world.subscribe(() => {
      const now = world.get();
      const skyOnly = now.sky !== last.sky && (Object.keys(now) as (keyof typeof now)[]).every((k) => k === "sky" || now[k] === last[k]);
      last = now;
      if (!skyOnly) invalidate(2);
    });
    return () => {
      off();
    };
  }, [invalidate]);
  const frameloop = useThree((s) => s.frameloop);
  useEffect(() => {
    invalidate(2);
  }, [pathname, frameloop, invalidate]);
  return null;
}

// The shaders, compiled before they're needed (compileAsync), against the
// target the frame draws into: on the composer tiers a HalfFloat target
// with no tone mapping in the scene's programs; on mobile the screen,
// tone-mapped by the renderer. Mounted after <Post>, so the composer has
// already set the renderer's tone mapping. Each place alone, with fog.
function Warm({ mounted, active, tier, onReady }: { mounted: SceneId[]; active: SceneId; tier: Quality; onReady: () => void }) {
  const { gl, scene, camera } = useThree();
  const warmed = useRef(new Set<SceneId>());
  const target = useMemo(() => (tier === "mobile" ? null : new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType })), [tier]);
  useEffect(() => () => target?.dispose(), [target]);

  useEffect(() => {
    const compile = (id: SceneId, ready?: () => void) => {
      warmed.current.add(id);
      const group = scene.getObjectByName(`scene:${id}`);
      if (!group) return ready?.();
      const def = scenes[id];
      // Compiled against the scene the frame draws, so each program's key
      // matches the frame's: its lights (the world's sun and sky, and this
      // place's own; three keys every program, lit or not, on the counts),
      // with every other place hidden, as when this one shows; and fog. The
      // weather's drops are compiled with it (Precipitation.tsx:
      // precipWarmers), in this place's light, so the first rain or snow
      // compiles nothing (docs/city/scripts/city3d-perf.mjs, the blends).
      // (Synchronous: no frame is drawn in between.)
      const places = scene.children.filter((o) => o.name.startsWith("scene:"));
      const shown = places.map((o) => o.visible);
      for (const o of places) o.visible = o === group;
      const fog = scene.fog;
      if (!fog) scene.fog = new THREE.Fog(def.fog.color, def.fog.near, def.fog.far);
      const drops = new THREE.Group();
      for (const m of precipWarmers(tier === "mobile")) drops.add(m);
      group.add(drops);
      const previous = gl.getRenderTarget();
      gl.setRenderTarget(target);
      let pending: Promise<unknown>;
      try {
        // (the place's materials only; its lights are counted once, from
        // the scene, where it is the one place showing: three's compile
        // otherwise counts an object's own lights a second time)
        const place = { traverse: (fn: (o: THREE.Object3D) => void) => group.traverse(fn), traverseVisible: () => {} } as unknown as THREE.Object3D;
        pending = gl.compileAsync(place, camera, scene);
      } catch {
        pending = Promise.resolve();
      } finally {
        gl.setRenderTarget(previous);
        group.remove(drops);
        drops.clear();
        scene.fog = fog;
        places.forEach((o, i) => (o.visible = shown[i]));
      }
      if (ready) {
        const fallback = window.setTimeout(ready, 2500);
        pending.then(() => {
          window.clearTimeout(fallback);
          ready();
        }, ready);
      }
    };
    if (!warmed.current.size) {
      if (!mounted.includes(active)) return;
      let done = false;
      compile(active, () => {
        if (done) return;
        done = true;
        performance.mark("city:shaders-ready");
        // A painted place's painting before the first frame (kit/plate.ts:
        // placePending), so the band's painting gives way to it, not to
        // an empty view
        const since = performance.now();
        const check = () => {
          if (placePending(scene.getObjectByName(`scene:${active}`)) && performance.now() - since < WAIT_FOR_FIRST_MS) window.setTimeout(check, 50);
          else onReady();
        };
        check();
      });
      return;
    }
    const cancels = mounted.filter((id) => !warmed.current.has(id)).map((id) => onIdle(() => compile(id), 3000));
    return () => cancels.forEach((cancel) => cancel());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the first place is the one active at mount
  }, [mounted, gl, scene, camera, target]);
  return null;
}

type CityHandle = {
  tier: Quality;
  go: (id: SectionId | SceneId) => void;
  sky: (param: string) => void;
  scene: () => RootState;
  THREE: typeof THREE;
  frames: number; // frames drawn since the canvas started
  frameTimes: number[]; // the last 600 intervals between drawn frames, ms
  // The tiers' texture measure (kit/textures.ts), for city3d-perf.mjs:
  // bytes held by root's materials, or by every live kit texture
  textureBytes: (root?: THREE.Object3D) => number;
};

// For measuring scripts (docs/city/scripts/visibility.mjs) and the
// console: in development, or any build opened with ?perf
const handleWanted = () => process.env.NODE_ENV === "development" || new URLSearchParams(location.search).has("perf");

function DevHandle({ tier, navigate }: { tier: Quality; navigate: (href: string) => void }) {
  const get = useThree((s) => s.get);
  const handle = useRef<CityHandle | null>(null);
  const last = useRef(0);
  useEffect(() => {
    const h: CityHandle = {
      tier,
      go: (id) => navigate(cityPath((id in scenes ? sectionOf(id as SceneId) : id) as SectionId)),
      sky: (param) => {
        const sky = parseSkyParam(param);
        if (sky) world.set({ sky });
      },
      scene: () => get(),
      THREE,
      frames: 0,
      frameTimes: [],
      textureBytes,
    };
    handle.current = h;
    const w = window as unknown as { __city?: CityHandle };
    w.__city = h;
    // ?sky=… in development: the preview's sky (nothing draws it yet)
    h.sky(new URLSearchParams(location.search).get("sky") ?? "");
    return () => {
      // (it would keep the renderer alive after the canvas goes)
      if (w.__city === h) delete w.__city;
      handle.current = null;
    };
  }, [get, tier, navigate]);
  useFrame(() => {
    const h = handle.current;
    if (!h) return;
    const now = performance.now();
    if (last.current) {
      h.frameTimes.push(now - last.current);
      if (h.frameTimes.length > 600) h.frameTimes.shift();
    }
    last.current = now;
    h.frames++;
  });
  return null;
}

export default function City3D({ tier }: { tier: Quality }) {
  const pathname = usePathname();
  const router = useRouter();
  const target = placeFor(pathname);
  const [active, setActive] = useState<SceneId>(target);
  const [mounted, setMounted] = useState<SceneId[]>([target]);
  // The places whose chunks have landed; a place is built once it's both
  // wanted (mounted) and here
  const [modules, setModules] = useState<Partial<Record<SceneId, SceneComponent>>>(() =>
    Object.fromEntries(sceneOrder.flatMap((id) => (loadedScene(id) ? [[id, loadedScene(id)]] : []))),
  );
  useEffect(() => {
    let live = true;
    for (const id of mounted) {
      if (modules[id]) continue;
      loadScene(id).then(
        (Scene) => live && setModules((m) => (m[id] ? m : { ...m, [id]: Scene })),
        () => {}, // offline: the journey's wait runs out, and the next ask retries
      );
    }
    return () => {
      live = false;
    };
  }, [mounted, modules]);
  const built = sceneOrder.filter((id) => mounted.includes(id) && modules[id]);
  const [visible, setVisible] = useState(true);
  const still = useWorld((s) => s.still);
  // Under the résumé the canvas holds its last frame: ResumeViewer sets
  // html.resume-lock while it is open
  const [covered, setCovered] = useState(false);
  // The first frame waits for the first place's shaders
  const [warm, setWarm] = useState(false);
  const [handle] = useState(handleWanted);
  const [plate] = useState(plateWanted);
  // ?plate=<painting> (development, or ?perf): Home as that painting on
  // the plate engine, with stand-in data (PlatePlace.tsx: proofPlace), in
  // place of the code-built riverside
  const [proof] = useState(proofWanted);
  const Proof = useMemo(() => (proof ? (p: SceneProps) => <ProofPlace {...p} painting={proof} /> : null), [proof]);
  // ?frame=plate (development): the view at the painting's shape, the
  // page's words and the bar out of the way
  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !plate) return;
    // (the painting's own shape)
    const def = scenes[placeFor(location.pathname)];
    const aspect = isPlace(def) ? def.plate.aspect : PLATE_ASPECT;
    const style = document.createElement("style");
    style.dataset.cityPlate = "";
    style.textContent = `.city-page, .top-bar, .city-tags, .city-skip { visibility: hidden !important; }
html, body { background: #000 !important; }
.city3d { inset: 0 !important; margin: auto !important; width: min(100vw, calc(100vh * ${aspect})) !important; height: min(100vh, calc(100vw / ${aspect})) !important; z-index: 40 !important; }`;
    document.head.append(style);
    document.documentElement.dataset.cityPlate = "on";
    return () => {
      style.remove();
      delete document.documentElement.dataset.cityPlate;
    };
  }, [plate]);
  const iris = useRef<HTMLDivElement>(null);
  const arrived = useWorld((s) => s.arrived);
  // Something is moving (common.tsx: useLive, useMovers): only then, and
  // not in still view, does the loop draw every frame
  const live = useWorld((s) => s.live > 0);
  const ambient = useWorld((s) => s.ambient > 0);
  useEffect(() => world.set({ quality: tier }), [tier]);
  // The canvas is going away (leaving /city, a lost context): the kit's
  // shared materials and its textures go with it (kit/materials.ts,
  // kit/textures.ts)
  useEffect(() => () => disposeShared(), []);
  useEffect(() => () => disposeTextures(), []);
  useEffect(() => () => disposePrecipWarmers(), []);

  if (!mounted.includes(target)) setMounted([...mounted, target]);

  // After the first arrival, the other places in idle time: desktop tiers
  // build them; the mobile tier only fetches their chunks
  useEffect(() => {
    if (!arrived) return;
    if (tier === "mobile") {
      let cancelFetch = () => {};
      const fetchNext = () => {
        const id = sceneOrder.find((s) => !loadedScene(s));
        if (id) loadScene(id).then(() => (cancelFetch = onIdle(fetchNext, 4000)), () => {});
      };
      cancelFetch = onIdle(fetchNext, 6000);
      return () => cancelFetch();
    }
    let cancel = () => {};
    let cancelled = false;
    const next = () => {
      if (cancelled) return;
      setMounted((m) => {
        const missing = sceneOrder.find((s) => !m.includes(s));
        if (!missing) return m;
        cancel = onIdle(next, 4000);
        return [...m, missing];
      });
    };
    cancel = onIdle(next, 6000);
    return () => {
      cancelled = true;
      cancel();
    };
    // Once, after the first arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrived]);

  // Links to places fetch ahead (Wake.tsx)
  useLinkHints(placeFor);

  // (Escape back to the riverside is the panel's: panels/CityPanel.tsx)

  // The résumé covers the page: no frames under it
  useEffect(() => {
    const html = document.documentElement;
    const read = () => setCovered(html.classList.contains("resume-lock"));
    read();
    const observer = new MutationObserver(read);
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Stop drawing when the tab is hidden, and (narrow screens) once the
  // sheet has been scrolled up over the whole of the view
  useEffect(() => {
    let sheetOver = false;
    const update = () => setVisible(!sheetOver && document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", update);
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const next = isFlat() && window.scrollY > heroHeight(window.innerHeight) + 24;
        if (next !== sheetOver) {
          sheetOver = next;
          update();
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const navigate = useCallback((href: string) => router.push(href), [router]);
  const t = TIERS[tier];

  return (
    <div className="city3d" data-scene={active} data-tier={tier} data-arrived={arrived || undefined}>
      <Canvas
        className="city3d-canvas"
        shadows="percentage"
        dpr={t.dpr}
        frameloop={!visible || !warm || covered ? "never" : still || !live ? "demand" : "always"}
        gl={{ antialias: t.canvasAntialias, powerPreference: "high-performance" }}
        camera={{ fov: scenes[target].fov, near: 0.1, far: 1200, position: [0, 2, 20] }}
        onCreated={({ gl }) => {
          if (tier === "mobile") {
            gl.toneMapping = THREE.NeutralToneMapping;
            gl.toneMappingExposure = 1.12;
          }
        }}
        aria-hidden="true"
      >
        <Director target={target} active={active} onSwap={setActive} iris={iris} still={still} tier={tier} plate={plate} />
        <Demand pathname={pathname} />
        <RestTicker on={!still && (ambient || tier !== "mobile")} />
        <Contrast />
        <Atmosphere active={active} />
        <Precipitation quality={tier} active={active} />
        <WorldLights />
        <TagProjector active={active} />
        {built.map((id) => {
          const Scene = (id === RIVERSIDE && Proof) || modules[id]!;
          return (
            <group key={id} name={`scene:${id}`} position={scenes[id].offset} visible={id === active}>
              <Scene active={active === id} quality={tier} navigate={navigate} still={still} />
            </group>
          );
        })}
        <Flight tier={tier} />
        <Post tier={tier} />
        <Warm mounted={built} active={active} tier={tier} onReady={() => setWarm(true)} />
        {handle && <DevHandle tier={tier} navigate={navigate} />}
      </Canvas>
      <div ref={iris} className="city-iris" aria-hidden="true" />
      <Tags show={target === RIVERSIDE} />
    </div>
  );
}
