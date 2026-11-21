"use client";

import { Canvas, useFrame, useThree, type RootState } from "@react-three/fiber";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { cityPath, sectionForCityPath } from "../../lib/cityRoutes";
import { parseSkyParam } from "../../lib/skyParam";
import { listed, pageSections, section, type SectionId } from "../../sections/registry";
import { anchors } from "./anchors";
import { WorldLights } from "./common";
import Atmosphere from "./atmosphere/Atmosphere";
import Precipitation from "./atmosphere/Precipitation";
import { disposeShared } from "./kit/materials";
import { disposeTextures, textureBytes } from "./kit/textures";
import { glowOn } from "./kit/uniforms";
import { isFlat } from "./flat";
import { onIdle } from "./idle";
import Post from "./Post";
import { loadScene, loadedScene, type SceneComponent } from "./sceneChunks";
import { focusTravel, restingPose, routesFromRiverside, sceneOrder, scenes, type Pose, type SceneId, type V3 } from "./scenes";
import { useWorld, world } from "./store";
import { TIERS, type Quality } from "./tiers";

// The 3D city's canvas: one for every /city page, kept across their
// navigations (app/city/layout.tsx mounts the shell, CityShell.tsx, which
// loads this). The address picks the place; the Director moves the camera
// there. Carried over from the park's World3D.tsx: the Director (journeys,
// drag-to-look on fine pointers, cuts in still view), the frame loop that
// stops when nothing changes, the warm-up, and the tags pinned over the
// riverside's signs.

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
// chunk hasn't landed yet, but never longer than this
const WAIT_FOR_PLACE_MS = 1500;

// Still view (app/lib/still.ts, store.ts): the camera cuts instead of
// travelling, and nothing moves
const holdingStill = () => world.get().still;

// On narrow screens the panel is a sheet over the lower part of the
// screen, from --hero down (city-pages.css); the camera's subject is
// lifted into the part above it. Read once per resize or page change.
let hero = { key: "", px: 0 };
const heroHeight = (height: number) => {
  const key = `${height}|${location.pathname}`;
  if (hero.key !== key) hero = { key, px: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--hero")) || 0 };
  return hero.px || height * (height <= 480 ? 0.64 : 0.46);
};
// Where the sheet's rounded top edge starts (it comes up 2rem over the band)
const SHEET_OVERLAP = 32;
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

// The panel's right edge on wide screens: the tags stay clear of it
let panel = { key: "", ticks: 0, right: 0 };
const panelRight = (width: number, height: number) => {
  const key = `${width}x${height}|${location.pathname}`;
  if (panel.key !== key || ++panel.ticks > 120) {
    const el = document.querySelector(".city-panel");
    panel = { key, ticks: 0, right: el && !isFlat() ? el.getBoundingClientRect().right : 0 };
  }
  return panel.right;
};

const add = (a: V3, b: V3) => new THREE.Vector3(a[0] + b[0], a[1] + b[1], a[2] + b[2]);
const inWorld = (scene: SceneId, pose: Pose) => ({ pos: add(pose.pos, scenes[scene].offset), target: add(pose.target, scenes[scene].offset) });
// Where the camera rests in a place: the focus pose the panel or a click
// chose (the store's `focus`, districts/<id>.def.ts: focus), else home
const restPose = (scene: SceneId) => inWorld(scene, restingPose(scene, world.get().focus));
const v3 = (v: THREE.Vector3): V3 => [v.x, v.y, v.z];

// The plates' shape (app/assets/city/*.webp, 2400 × 1032)
export const PLATE_ASPECT = 2400 / 1032;
// Development only, for matching a place to its painting: ?frame=plate
// holds the camera at the place's plateFrame (districts/<id>.def.ts), the
// view cut to the painting's shape, the panel and the bar hidden. The
// whole switch is behind NODE_ENV, so a production build has none of it.
const plateWanted = () => process.env.NODE_ENV === "development" && new URLSearchParams(location.search).get("frame") === "plate";

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number) => t * t * t;

type Move = {
  kind: "move";
  dur: number;
  ease: (t: number) => number;
  to: { pos: THREE.Vector3; target: THREE.Vector3 }[];
  iris?: { to: number; from: number; until: number };
  focus?: boolean; // a turn toward (or back from) something chosen in the place
};
type Swap = { kind: "swap"; scene: SceneId; pose: { pos: THREE.Vector3; target: THREE.Vector3 } };
type Seg = Move | Swap;
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
    yaw: 0,
    pitch: 0,
    dragging: false,
    lastDrag: 0,
    pointer: new THREE.Vector2(),
    parallax: new THREE.Vector2(),
    shift: 0,
    shiftY: 0,
    framed: false,
    waitingSince: 0,
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
    if (iris.current) iris.current.style.background = scenes[to === RIVERSIDE && from ? from : to].threshold;
    s.running = null;
    const final = restPose(to);
    invalidate();

    if (holdingStill()) {
      // Still view: a cut, no travel
      s.queue = [{ kind: "swap", scene: to, pose: final }];
      s.iris = 0;
      s.started = true;
      return;
    }
    if (!from) {
      // Arriving on the site (or a deep link): already there, the view
      // opening from the threshold's colour, no travel from anywhere
      s.queue = [{ kind: "swap", scene: to, pose: final }, { kind: "move", dur: 0.5, ease: easeOut, to: [final], iris: { to: 0, from: 0, until: 1 } }];
      s.started = true;
      return;
    }
    if (from === to) {
      s.queue = [];
      if (s.iris > 0) s.queue.push({ kind: "move", dur: 0.35, ease: easeOut, to: [final], iris: { to: 0, from: 0, until: 1 } });
      return;
    }
    const arrive: Seg[] = [
      { kind: "swap", scene: to, pose: inWorld(to, scenes[to].enter) },
      { kind: "move", dur: 0.55, ease: easeOut, to: [final], iris: { to: 0, from: 0, until: 0.5 } },
    ];
    if (from === RIVERSIDE) {
      // Fly toward the section's sign on a gentle arc; the threshold closes
      // over the last part
      const route = routesFromRiverside[to as Exclude<SceneId, "lujiazui">];
      const look = add(route.look, scenes[RIVERSIDE].offset);
      const pts = route.path.map((p, i) => {
        const t = (i + 1) / route.path.length;
        return { pos: add(p, scenes[RIVERSIDE].offset), target: s.look.clone().lerp(look, t * t) };
      });
      pts[pts.length - 1].target = look;
      s.queue = [{ kind: "move", dur: 0.7, ease: easeInOut, to: pts, iris: { to: 1, from: 0.55, until: 1 } }, ...arrive];
    } else if (to === RIVERSIDE) {
      // Back out of the place, then pull back from the sign to the view
      const route = routesFromRiverside[from as Exclude<SceneId, "lujiazui">];
      const door = add(route.path[route.path.length - 1], scenes[RIVERSIDE].offset);
      const look = add(route.look, scenes[RIVERSIDE].offset);
      const back = [...route.path]
        .reverse()
        .slice(1)
        .map((p) => ({ pos: add(p, scenes[RIVERSIDE].offset), target: look.clone().lerp(final.target, 0.5) }));
      s.queue = [
        { kind: "move", dur: 0.4, ease: easeIn, to: [inWorld(from, scenes[from].exit)], iris: { to: 1, from: 0.3, until: 1 } },
        { kind: "swap", scene: RIVERSIDE, pose: { pos: door, target: look } },
        { kind: "move", dur: 0.8, ease: easeInOut, to: [...back, final], iris: { to: 0, from: 0, until: 0.35 } },
      ];
    } else {
      // From one section's place straight to another's
      s.queue = [{ kind: "move", dur: 0.4, ease: easeIn, to: [inWorld(from, scenes[from].exit)], iris: { to: 1, from: 0.3, until: 1 } }, ...arrive];
    }
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
    s.yaw = s.pitch = 0;
    s.parallax.set(0, 0);
    invalidate();
  }, [still, target, invalidate]);

  // Look around by dragging; a little parallax follows the mouse. Not on
  // touch screens or the mobile tier: there a drag is a scroll, and the
  // camera must never catch it. Not in still view either.
  useEffect(() => {
    if (tier === "mobile" || matchMedia("(pointer: coarse)").matches) return;
    const el = gl.domElement;
    let last: [number, number] | null = null;
    const down = (e: PointerEvent) => {
      last = [e.clientX, e.clientY];
    };
    const move = (e: PointerEvent) => {
      const s = st.current;
      s.pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
      if (holdingStill()) return;
      invalidate();
      if (!last || !(e.buttons & 1)) return;
      const dx = e.clientX - last[0];
      const dy = e.clientY - last[1];
      last = [e.clientX, e.clientY];
      if (Math.abs(dx) + Math.abs(dy) > 1) {
        s.dragging = true;
        s.lastDrag = performance.now();
        s.yaw = THREE.MathUtils.clamp(s.yaw - dx * 0.0035, -0.5, 0.5);
        s.pitch = THREE.MathUtils.clamp(s.pitch - dy * 0.0025, -0.22, 0.22);
      }
    };
    const up = () => {
      last = null;
      st.current.dragging = false;
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [gl, invalidate, tier]);

  const tmp = useMemo(() => ({ dir: new THREE.Vector3(), right: new THREE.Vector3(), p: new THREE.Vector3(), l: new THREE.Vector3() }), []);

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
      // Not into an empty place: hold at the threshold until it's built
      if (seg.kind === "swap" && s.active !== seg.scene && !scene.getObjectByName(`scene:${seg.scene}`)?.children.length) {
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
        s.yaw = s.pitch = 0;
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

    // Parallax and looking around, at rest and not in still view
    tmp.p.copy(s.pos);
    tmp.l.copy(s.look);
    const resting = !r && !s.queue.length && !reduce;
    if (resting && tier !== "mobile") {
      const before = s.parallax.clone();
      s.parallax.lerp(s.pointer, 1 - Math.exp(-dt * 3));
      if (before.distanceTo(s.parallax) > 0.0005) busy = true;
      tmp.dir.subVectors(tmp.l, tmp.p).normalize();
      tmp.right.crossVectors(tmp.dir, camera.up).normalize();
      tmp.p.addScaledVector(tmp.right, s.parallax.x * 0.25);
      tmp.p.y += -s.parallax.y * 0.1;
      if (!s.dragging && performance.now() - s.lastDrag > 2500) {
        s.yaw *= Math.exp(-dt * 1.2);
        s.pitch *= Math.exp(-dt * 1.2);
      }
    } else if (reduce) {
      s.yaw = s.pitch = 0;
    } else if (!s.dragging) {
      s.yaw *= Math.exp(-dt * 4);
      s.pitch *= Math.exp(-dt * 4);
    }
    if (Math.abs(s.yaw) + Math.abs(s.pitch) > 0.0005) busy = true;
    else s.yaw = s.pitch = 0;
    camera.position.copy(tmp.p);
    camera.lookAt(tmp.l);
    camera.rotateY(s.yaw);
    camera.rotateX(s.pitch);

    // Frame the place on its side on wide screens, leaving the panel its
    // half; on narrow screens in the strip between the bar and the sheet
    const cam = camera as THREE.PerspectiveCamera;
    const narrow = isFlat();
    const def = scenes[s.active];
    const aspect = size.width / size.height;
    const tan = (d: number) => Math.tan(THREE.MathUtils.degToRad(d));
    const lens = (halfTan: number) => 2 * THREE.MathUtils.radToDeg(Math.atan(halfTan));
    // A portrait screen at a place's home view: a wider lens if needed to
    // show `half` degrees either side, the middle turned by `yaw`
    const portrait = narrow && aspect < 1 ? def.portrait : undefined;
    let fov = aspect < 1 ? def.fov * 1.2 : def.fov;
    const ceiling = barBottom(size.width, size.height);
    if (portrait) fov = Math.max(fov, lens(tan(portrait.half) / aspect));
    // …and on a portrait tablet (a phone's lens is already wide from its
    // narrowness) at least `cover` degrees top to bottom in the strip
    // between the bar and the sheet
    if (portrait?.cover && size.width >= 600) fov = Math.max(fov, lens(tan(portrait.cover / 2) / Math.max(0.36, (heroHeight(size.height) - SHEET_OVERLAP - ceiling) / size.height)));
    let want = 0;
    const edge = narrow ? 0 : panelRight(size.width, size.height);
    if (!narrow && def.frame !== "center" && edge > 0) {
      // A wide screen: the view's middle moves to the middle of the part
      // the panel leaves, and the lens widens if it must to show `span`
      // degrees either side of it there
      const [l, r] = def.frame === "right" ? [edge + 12, size.width - 12] : [12, size.width - edge - 12];
      want = 0.5 - (l + r) / 2 / size.width;
      if (def.span) fov = Math.max(fov, lens(tan(def.span) / (((r - l) / size.width) * aspect)));
    } else if (portrait) {
      want = tan(portrait.yaw) / (2 * tan(fov / 2) * aspect);
    }
    let wantY = narrow ? narrowLift(size.height, ceiling) : 0;
    // A phone on its side: the place's fronts (`short`, degrees under the
    // aim) go to the middle of the strip; a portrait one: the point
    // `portrait.lift` degrees over the aim does
    const under = narrow && aspect >= 1 && size.height <= 480 ? def.short : portrait?.lift !== undefined ? -portrait.lift : undefined;
    if (under !== undefined) {
      const fronts = (Math.tan(THREE.MathUtils.degToRad(under)) * size.height) / 2 / Math.tan(THREE.MathUtils.degToRad(fov / 2));
      const aim = (ceiling + heroHeight(size.height) - SHEET_OVERLAP) / 2 - fronts;
      wantY = 0.5 - aim / size.height;
    }
    // (in still view, and before the first arrival, the framing is simply there)
    const glide = reduce || !s.started || !world.get().arrived ? 1 : 1 - Math.exp(-dt * 4);
    s.shift += (want - s.shift) * glide;
    s.shiftY += (wantY - s.shiftY) * glide;
    if (Math.abs(want - s.shift) > 0.0005 || Math.abs(wantY - s.shiftY) > 0.0005) busy = true;
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
    const floor = narrow ? heroHeight(size.height) - SHEET_OVERLAP - 4 : size.height - 8;
    // (4px from the screen's edges: room for the focus ring)
    const edge = panelRight(size.width, size.height);
    const left = edge ? edge + 8 : 4;
    let fits = true;
    const project = (p: THREE.Vector3 | undefined) => {
      if (!p) {
        fits = false;
        return [0, 0];
      }
      v.copy(p).project(camera);
      if (v.z > 1) fits = false;
      return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height];
    };
    const boxes: Box[] = [];
    for (const el of tagLinks) {
      const id = el.dataset.anchor!;
      const [, top] = project(anchors.get(`${id}:top`));
      const [, foot] = project(anchors.get(`${id}:foot`));
      const [l] = project(anchors.get(`${id}:left`));
      const [r] = project(anchors.get(`${id}:right`));
      const cx = (l + r) / 2;
      const cy = (top + foot) / 2;
      const w = Math.max(TAG_MIN, Math.abs(r - l));
      const h = Math.max(TAG_MIN, Math.abs(foot - top));
      const box = { l: cx - w / 2, r: cx + w / 2, t: cy - h / 2, b: cy + h / 2 };
      if (box.t < ceiling || box.b > floor || box.l < left || box.r > size.width - 4 || boxes.some((o) => clash(box, o))) fits = false;
      boxes.push(box);
    }
    const html = document.documentElement;
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
// In the order they stand, left to right, so Tab goes along the river.
const tagged = listed.filter((s) => s.id !== "home").sort((a, b) => scenes[a.district].sign!.bearing - scenes[b.district].sign!.bearing);

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
      const alone = new THREE.Scene();
      alone.fog = new THREE.Fog(def.fog.color, def.fog.near, def.fog.far);
      const wasVisible = group.visible;
      group.visible = true;
      const previous = gl.getRenderTarget();
      gl.setRenderTarget(target);
      let pending: Promise<unknown>;
      try {
        pending = gl.compileAsync(group, camera, alone);
      } catch {
        pending = Promise.resolve();
      } finally {
        gl.setRenderTarget(previous);
        group.visible = wasVisible;
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
        onReady();
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
  // ?frame=plate (development): the view at the painting's shape, the
  // page's words and the bar out of the way
  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !plate) return;
    const style = document.createElement("style");
    style.dataset.cityPlate = "";
    style.textContent = `.city-page, .top-bar, .city-tags, .city-skip { visibility: hidden !important; }
html, body { background: #000 !important; }
.city3d { inset: 0 !important; margin: auto !important; width: min(100vw, calc(100vh * ${PLATE_ASPECT})) !important; height: min(100vh, calc(100vw / ${PLATE_ASPECT})) !important; z-index: 40 !important; }`;
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
  useEffect(() => world.set({ quality: tier }), [tier]);
  // The canvas is going away (leaving /city, a lost context): the kit's
  // shared materials and its textures go with it (kit/materials.ts,
  // kit/textures.ts)
  useEffect(() => () => disposeShared(), []);
  useEffect(() => () => disposeTextures(), []);

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

  // A link to a place, pointed at or focused anywhere on the page: its
  // chunk is fetched now, so the journey there doesn't wait for it
  useEffect(() => {
    const want = (e: Event) => {
      const href = (e.target as Element | null)?.closest?.("a[href^='/city']")?.getAttribute("href");
      if (href) loadScene(placeFor(href.split("#")[0])).catch(() => {});
    };
    document.addEventListener("pointerover", want, { passive: true });
    document.addEventListener("focusin", want);
    return () => {
      document.removeEventListener("pointerover", want);
      document.removeEventListener("focusin", want);
    };
  }, []);

  // Escape in a section's place goes back to the riverside, unless a
  // dialog or menu is open (they take Escape themselves)
  useEffect(() => {
    if (target === RIVERSIDE) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (document.documentElement.classList.contains("resume-lock") || document.querySelector(":popover-open, dialog[open]")) return;
      router.push(cityPath("home"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, router]);

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
        <Contrast />
        <Atmosphere active={active} />
        <Precipitation quality={tier} active={active} />
        <WorldLights />
        <TagProjector active={active} />
        {built.map((id) => {
          const Scene = modules[id]!;
          return (
            <group key={id} name={`scene:${id}`} position={scenes[id].offset} visible={id === active}>
              <Scene active={active === id} quality={tier} navigate={navigate} still={still} />
            </group>
          );
        })}
        <Post tier={tier} />
        <Warm mounted={built} active={active} tier={tier} onReady={() => setWarm(true)} />
        {handle && <DevHandle tier={tier} navigate={navigate} />}
      </Canvas>
      <div ref={iris} className="city-iris" aria-hidden="true" />
      <Tags show={target === RIVERSIDE} />
    </div>
  );
}
