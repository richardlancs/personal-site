"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { projects } from "../../../data/portfolio";
import { anchors } from "../anchors";
import { anchorKey, Hitbox, SceneLights, type SceneProps } from "../common";
import { box, merge } from "../kit/geometry";
import { buildJinMao, buildShanghaiTower, buildWorldFinancialCenter, type Landmark } from "../kit/landmarks";
import { glowSprites, litSurface, neonMaterial, SCENE_TONES, screenArt, screenMaterial, type SceneTone } from "../kit/neon";
import type { LightStrip } from "../kit/reflection";
import { buildSkyDome } from "../kit/sky";
import { buildRailing, glowMaterial } from "../kit/street";
import { surface } from "../kit/surface";
import { fit, fonts, fontsReady, textureBytes } from "../kit/textures";
import { buildTowers, layoutTowers, type TowerSpec } from "../kit/towers";
import { buildStreetTrees } from "../kit/trees";
import { wetPaving } from "../kit/water";
import { windowMaterial } from "../kit/windows";
import { rng } from "../rng";
import type { V3 } from "../scenes";
import { useWorld, world } from "../store";
import { TIERS, type Quality } from "../tiers";
import { screenMiddle, TOWERS } from "./towers.def";

// Projects: the walkway ring under the three supertalls, composed as the
// paintings (app/assets/city/towers-day.webp, -night.webp); one unit is
// ten metres, the plaza's middle the origin (towers.def.ts: TOWERS holds
// where everything stands). From the eye, just inside the ring's south
// side at street level, looking up and north:
//
//   the sky dome;
//   the World Financial Center, Jin Mao and Shanghai Tower (kit
//   landmarks), left to right, rising out of the city's towers behind and
//   beside them, their lit parts glowing softly after dark;
//   the curved podiums round the plaza, glass and stone, trees on their
//   roofs, each with one big curved screen facing the plaza: one per
//   project, in portfolio order round the ring (the first two are the
//   paintings' left and right screens). Each shows the project's cover
//   screenshot (screenshots[cover ?? 0], public/projects/) under a title
//   bar with the project's title, the only words in the scene. The
//   screenshots load only while the place is showing and are let go when
//   it isn't (the screens then show a title card: the title over abstract
//   light); on the mobile tier only while the kit's textures fit its
//   budget. A frame round each screen is cyan, the chosen one's gold;
//   clicking a screen chooses it (sel.project, focus "screen-<n>"), as the
//   panel's keys do;
//   the elevated walkway ring on its pillars, a railing along each edge,
//   a gold strip of light along its sides and downlights under its deck
//   after dark, its two spot lights (SceneLights) under its far side;
//   trees round the ring;
//   the plaza's paving, which shines with the lights in the rain (kit
//   wetPaving, fake reflection on every tier).
//
// Nothing here moves on its own, so the canvas idles here.

const T = TOWERS;
const rad = (deg: number) => (deg * Math.PI) / 180;
const SCREENS = Math.min(projects.length, T.screens.az.length);

// Colours, from the plates
const PAVING = "#7b7e84";
const GROUND = "#3c4048";
const CONCRETE = "#c9c3b8";
const STONE = "#d2c7b4";
const ROOF = "#8d8a82";
const FRAME = "#20232a";

// A curved face round the plaza's middle: radius r from azimuth a0 to a1
// (degrees), y0 to y1. Facing the middle (`inward`) or away from it. Its
// uv is 0..1 across and up (`unit`, for a picture) or, for the window
// shader, the distance round and the height in world units.
function arcFace(r: number, a0: number, a1: number, y0: number, y1: number, segs: number, inward: boolean, unit = false) {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const az = rad(a0 + ((a1 - a0) * i) / segs);
    const s = Math.sin(az);
    const c = Math.cos(az);
    for (const [j, y] of [y0, y1].entries()) {
      pos.push(r * s, y, -r * c);
      nor.push(inward ? -s : s, 0, inward ? c : -c);
      uv.push(unit ? i / segs : r * (az - rad(a0)), unit ? j : y);
    }
  }
  for (let i = 0; i < segs; i++) {
    const bl = i * 2;
    const tl = bl + 1;
    const br = bl + 2;
    const tr = bl + 3;
    if (inward) index.push(bl, br, tr, bl, tr, tl);
    else index.push(bl, tr, br, bl, tl, tr);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  return g;
}

// A flat ring (part of one) at height y, from r0 to r1 and azimuth a0 to
// a1, facing up or down
function annulus(r0: number, r1: number, a0: number, a1: number, y: number, segs: number, up: boolean) {
  const g = up ? new THREE.RingGeometry(r0, r1, segs, 1, rad(90 - a1), rad(a1 - a0)).rotateX(-Math.PI / 2) : new THREE.RingGeometry(r0, r1, segs, 1, rad(a0 - 90), rad(a1 - a0)).rotateX(Math.PI / 2);
  return g.translate(0, y, 0);
}

const polar = (r: number, az: number, y = 0) => new THREE.Vector3(r * Math.sin(rad(az)), y, -r * Math.cos(rad(az)));

// ---------------------------------------------------------------------
// The screens' faces. Their pictures are module state (a screen's material
// is the kit's, shared and kept across mounts, and paints from here): the
// cover screenshot while the place is showing, otherwise nothing, and
// then the title card.

const shots: (HTMLImageElement | null)[] = [];

const cover = (n: number) => {
  const p = projects[n];
  return p.screenshots?.[p.cover ?? 0];
};

function paintScreen(n: number) {
  return (g: CanvasRenderingContext2D, w: number, h: number) => {
    const title = projects[n].title;
    const f = fonts();
    const bar = Math.round(h * 0.12);
    const shot = shots[n];
    if (shot) {
      // the screenshot, whole, on the screen's dark ground
      g.fillStyle = "#0b0e14";
      g.fillRect(0, 0, w, h);
      const room = { w, h: h - bar };
      const k = Math.min(room.w / shot.naturalWidth, room.h / shot.naturalHeight);
      const dw = shot.naturalWidth * k;
      const dh = shot.naturalHeight * k;
      g.imageSmoothingQuality = "high";
      g.drawImage(shot, (w - dw) / 2, bar + (room.h - dh) / 2, dw, dh);
      // a screen's white is a little under paper white, so it never
      // reaches the bloom's threshold at night (kit/neon.ts: screens show
      // exactly as painted)
      g.globalCompositeOperation = "multiply";
      g.fillStyle = "#e0e0e0";
      g.fillRect(0, bar, w, h - bar);
      g.globalCompositeOperation = "source-over";
    } else {
      // the title card: abstract light (no letters) and the title, large
      screenArt(7919 * (n + 1))(g, w, h);
      g.fillStyle = "rgba(8,9,12,0.35)";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#e6e9ee";
      g.textAlign = "center";
      g.textBaseline = "middle";
      fit(g, title, (s) => `700 ${s}px ${f.display}`, Math.round(h * 0.2), w * 0.8);
      g.fillText(title, w / 2, bar + (h - bar) / 2);
    }
    // the title bar
    g.fillStyle = "#101217";
    g.fillRect(0, 0, w, bar);
    g.fillStyle = SCENE_TONES.cyan;
    g.fillRect(0, bar - Math.max(2, Math.round(h * 0.006)), w, Math.max(2, Math.round(h * 0.006)));
    g.fillStyle = "#e6e9ee";
    g.textAlign = "left";
    g.textBaseline = "middle";
    fit(g, title, (s) => `600 ${s}px ${f.display}`, Math.round(bar * 0.62), w * 0.9);
    g.fillText(title, w * 0.04, bar / 2);
  };
}

// The screens' canvases: smaller on the phone tier
const screenSize = (quality: Quality) => (quality === "mobile" ? { w: 512, h: 360 } : { w: 1024, h: 720 });

function screenFace(n: number, quality: Quality) {
  const { w, h } = screenSize(quality);
  return screenMaterial(paintScreen(n), { w, h, key: `towers:screen:${n}:${w}` });
}

// ---------------------------------------------------------------------

type Built = {
  group: THREE.Group;
  screens: { center: THREE.Vector3; ry: number; size: [number, number, number] }[];
  frames: THREE.Mesh[];
  faces: THREE.Material[];
  dispose: () => void;
};

function build(quality: Quality): Built {
  const group = new THREE.Group();
  group.name = "towers";
  const geometries: THREE.BufferGeometry[] = [];
  const disposers: (() => void)[] = [];
  const mobile = quality === "mobile";
  const add = <T extends THREE.Object3D>(o: T) => {
    group.add(o);
    return o;
  };
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, name = "", shadow = false) => {
    geometries.push(geometry);
    const m = new THREE.Mesh(geometry, material);
    m.name = name;
    m.castShadow = m.receiveShadow = shadow;
    return add(m);
  };
  const glow: { pos: THREE.Vector3; color: string; size: number }[] = [];
  const lights: LightStrip[] = [];

  // ---- The sky, and the ground out to it
  const sky = add(buildSkyDome({ seed: 113, radius: 380 }));
  geometries.push(sky.geometry);
  mesh(new THREE.PlaneGeometry(760, 760).rotateX(-Math.PI / 2).translate(0, -0.02, 0), surface({ color: GROUND, grime: 0.4, snow: true }), "ground");

  // ---- The three supertalls (kit landmarks), as on the riverside
  const detail = mobile ? "far" : "near";
  type Maker = (d: "near" | "far", m: { body: THREE.Material; glass: THREE.Material; lit: THREE.Material }) => Landmark;
  const st = T.supertalls;
  const SUPERTALLS: [Maker, readonly [number, number], { body: THREE.Material; base: string; glass: string; lit: THREE.Material; tone: SceneTone }][] = [
    [buildWorldFinancialCenter, st.worldFinancialCenter, { body: surface({ color: "#7a93ad" }), base: "#5f7a95", glass: "#86aacb", lit: litSurface({ color: "#a7bfd4", tone: "cyan", strength: 1.05 }), tone: "cyan" }],
    [buildJinMao, st.jinMao, { body: surface({ color: "#9aa2ad" }), base: "#7f8896", glass: "#4f6f93", lit: litSurface({ color: "#b9ab8e", tone: "gold", strength: 0.95 }), tone: "gold" }],
    [buildShanghaiTower, st.shanghaiTower, { body: surface({ color: "#86a0b8" }), base: "#6b88a4", glass: "#8db3d3", lit: litSurface({ color: "#a9c0d4", tone: "cyan", strength: 1.0 }), tone: "cyan" }],
  ];
  for (const [builder, [x, z], c] of SUPERTALLS) {
    const landmark = builder(detail, { body: c.body, glass: windowMaterial({ base: c.base, glass: c.glass }), lit: c.lit });
    landmark.group.position.set(x, 0, z);
    // a little stouter than life, as the paintings draw them from below
    landmark.group.scale.set(1.2, 1, 1.2);
    landmark.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        geometries.push((o as THREE.Mesh).geometry);
        o.castShadow = !mobile;
      }
    });
    add(landmark.group);
    for (const m of landmark.lit) {
      m.geometry.computeBoundingSphere();
      const s = m.geometry.boundingSphere!;
      glow.push({ pos: s.center.clone().multiply(landmark.group.scale).add(landmark.group.position), color: SCENE_TONES[c.tone], size: Math.min(3, s.radius * 0.8) });
    }
    lights.push({ x, z: z + 3, w: 1.4, color: SCENE_TONES[c.tone], height: 30 });
  }

  // ---- The city round them: towers beside the plaza and behind the
  // supertalls, none in the plaza or on the supertalls' feet; lower
  // behind them, so their tops stand clear
  const keepOut = [{ x: 0, z: 0, r: T.podium.r + T.podium.depth + 2 }, ...Object.values(st).map(([x, z]) => ({ x, z, r: 8 }))];
  const city: TowerSpec[] = [
    ...layoutTowers(71, { x0: -80, x1: -22, z0: -80, z1: 30 }, 26, [8, 36], keepOut),
    ...layoutTowers(73, { x0: 30, x1: 85, z0: -80, z1: 30 }, 24, [8, 30], keepOut),
    ...layoutTowers(79, { x0: -60, x1: 60, z0: -140, z1: -62 }, 30, [10, 26], keepOut),
    ...layoutTowers(83, { x0: -40, x1: 40, z0: 28, z1: 70 }, 12, [8, 24], keepOut),
  ];
  for (const t of buildTowers(city, { far: false })) {
    geometries.push(t.geometry);
    if (mobile) t.castShadow = false;
    add(t);
  }
  const cr = rng(89);
  for (const t of city) if (cr() < 0.35) lights.push({ x: t.x, z: t.z, w: Math.max(0.4, t.w * 0.3), color: "#ffc98a", height: t.h * 0.5 });

  // ---- The podiums round the plaza: glass walls in and out, a stone
  // cap and band, roofs with trees; one curved screen on each inner face
  const P = T.podium;
  const walls: THREE.BufferGeometry[] = [];
  const stone: THREE.BufferGeometry[] = [];
  const roofs: THREE.BufferGeometry[] = [];
  const roofTrees: { x: number; z: number; s: number }[] = [];
  const tr = rng(97);
  const screens: Built["screens"] = [];
  const frames: THREE.Mesh[] = [];
  const faces: THREE.Material[] = [];
  const S = T.screens;
  const arc = (S.w / (P.r - 0.06)) * (180 / Math.PI);
  for (let n = 0; n < T.screens.az.length; n++) {
    const az = S.az[n];
    const a0 = az - P.span / 2;
    const a1 = az + P.span / 2;
    const segs = 16;
    const r0 = P.r;
    const r1 = P.r + P.depth;
    const h = P.height - (n % 2) * 1.2;
    walls.push(arcFace(r0, a0, a1, 0, h - 0.5, segs, true), arcFace(r1, a0, a1, 0, h - 0.5, segs, false));
    stone.push(
      arcFace(r0 - 0.02, a0, a1, h - 0.5, h, segs, true),
      arcFace(r1 + 0.02, a0, a1, h - 0.5, h, segs, false),
      arcFace(r0 - 0.03, a0, a1, 1.0, 1.25, segs, true),
      // the ends
      box(0.3, h, P.depth).translate(0, h / 2, -(r0 + r1) / 2).rotateY(-rad(a0)),
      box(0.3, h, P.depth).translate(0, h / 2, -(r0 + r1) / 2).rotateY(-rad(a1)),
    );
    roofs.push(annulus(r0, r1, a0, a1, h, segs, true));
    for (let k = 0; k < 5; k++) {
      const p = polar(r0 + tr.range(1, P.depth - 1), tr.range(a0 + 3, a1 - 3));
      roofTrees.push({ x: p.x, z: p.z, s: tr.range(0.45, 0.7) });
    }
    if (n >= SCREENS) continue;
    // The screen, a frame behind it a little larger, and its edge of light
    const sa0 = az - arc / 2;
    const sa1 = az + arc / 2;
    const y0 = S.y - S.h / 2;
    const y1 = S.y + S.h / 2;
    const face = screenFace(n, quality);
    faces.push(face);
    mesh(arcFace(P.r - 0.06, sa0, sa1, y0, y1, 12, true, true), face, `screen:${n}`);
    stone.push(arcFace(P.r - 0.04, sa0 - 0.8, sa1 + 0.8, y0 - 0.35, y1 + 0.35, 12, true));
    const edge = merge([
      arcFace(P.r - 0.08, sa0 - 0.35, sa1 + 0.35, y1 + 0.08, y1 + 0.16, 12, true),
      arcFace(P.r - 0.08, sa0 - 0.35, sa1 + 0.35, y0 - 0.16, y0 - 0.08, 12, true),
      arcFace(P.r - 0.08, sa0 - 0.35, sa0 - 0.1, y0 - 0.16, y1 + 0.16, 1, true),
      arcFace(P.r - 0.08, sa1 + 0.1, sa1 + 0.35, y0 - 0.16, y1 + 0.16, 1, true),
    ]);
    frames.push(mesh(edge, FRAME_TONES.cyan(), `screen-edge:${n}`));
    const mid = new THREE.Vector3(...screenMiddle(n));
    screens.push({ center: polar(P.r - 0.4, az, S.y), ry: -rad(az), size: [S.w * 0.96, S.h, 0.9] });
    lights.push({ x: mid.x * 0.97, z: mid.z * 0.97, w: S.w * 0.4, color: n % 2 ? SCENE_TONES.rose : SCENE_TONES.cyan, height: S.y });
  }
  mesh(merge(walls), windowMaterial({ base: STONE, glass: "#5d87b3" }), "podiums", !mobile);
  mesh(merge(stone), surface({ color: STONE, grime: 0.25 }), "podium-stone", !mobile);
  mesh(merge(roofs), surface({ color: ROOF, snow: true }), "podium-roofs");

  // ---- The walkway ring: deck, fascias, pillars (one mesh), a railing
  // along each edge, the gold strip along its sides, downlights under it
  const R = T.ring;
  const rin = R.r - R.width / 2;
  const rout = R.r + R.width / 2;
  const top = R.deck;
  const under = R.deck - R.thick;
  const ringParts = [
    annulus(rin, rout, 0, 360, top, 96, true),
    annulus(rin, rout, 0, 360, under, 96, false),
    arcFace(rin, 0, 360, under, top, 96, true),
    arcFace(rout, 0, 360, under, top, 96, false),
  ];
  const downlights: THREE.BufferGeometry[] = [];
  for (let az = 0; az < 360; az += R.pillarStep) {
    const p = polar(R.r, az);
    ringParts.push(new THREE.CylinderGeometry(0.1, 0.12, under, 10).translate(p.x, under / 2, p.z));
    const d = polar(R.r, az + R.pillarStep / 2, under - 0.004);
    downlights.push(new THREE.CircleGeometry(0.07, 10).rotateX(Math.PI / 2).translate(d.x, d.y, d.z));
    glow.push({ pos: d, color: "#ffd49a", size: 0.5 });
  }
  mesh(merge(ringParts), surface({ color: CONCRETE, grime: 0.2, snow: true }), "ring", !mobile);
  mesh(merge(downlights), glowMaterial({ day: "#d8d2c4", night: "#ffd49a" }), "ring-downlights");
  const strip = merge([arcFace(rout + 0.006, 0, 360, top - 0.045, top - 0.015, 96, false), arcFace(rin - 0.006, 0, 360, top - 0.045, top - 0.015, 96, true)]);
  mesh(strip, neonMaterial(SCENE_TONES.gold, { dayColor: "#d9d2c4" }), "ring-strip");
  const circle = (r: number) => Array.from({ length: 73 }, (_, i) => polar(r, i * 5, top));
  for (const r of [rin + 0.04, rout - 0.04]) {
    const rail = add(buildRailing(circle(r)));
    geometries.push(rail.geometry);
  }
  for (let az = -150; az <= 150; az += 10) {
    const p = polar(R.r, az);
    lights.push({ x: p.x, z: p.z, w: 0.5, color: SCENE_TONES.gold, height: top });
  }

  // ---- Trees: round the ring's outside (hiding the supertalls' feet, as
  // in the paintings), a few inside, one over the eye's left; and on the
  // podiums' roofs
  const tg = rng(101);
  const plazaTrees: { x: number; z: number; s: number }[] = [];
  for (let az = -170; az <= 170; az += 7) {
    const p = polar(tg.range(9.8, 13.5), az + tg.range(-3, 3));
    plazaTrees.push({ x: p.x, z: p.z, s: tg.range(1.8, 2.6) });
  }
  for (let az = -60; az <= 60; az += 8) {
    const p = polar(tg.range(15, 22), az + tg.range(-3, 3));
    plazaTrees.push({ x: p.x, z: p.z, s: tg.range(1.6, 2.4) });
  }
  // low trees inside the ring, under its deck from the eye
  for (let az = -84; az <= 84; az += 7) {
    const p = polar(tg.range(6.4, 7.4), az + tg.range(-2, 2));
    plazaTrees.push({ x: p.x, z: p.z, s: tg.range(0.8, 1.15) });
  }
  for (const az of [140, -140, 180]) {
    const p = polar(5.5, az);
    plazaTrees.push({ x: p.x, z: p.z, s: 1.2 });
  }
  plazaTrees.push({ x: -4.4, z: 2.9, s: 3.0 });
  for (const [spots, seed, y] of [
    [plazaTrees, 103, 0],
    [roofTrees, 107, null],
  ] as const) {
    const trees = buildStreetTrees(seed, [...spots]);
    for (const t of trees) {
      geometries.push(t.geometry);
      if (y === null) t.position.y = P.height - 1.2;
      if (mobile) t.castShadow = false;
      add(t);
    }
  }

  // ---- The plaza's paving: the lights streak it in the rain
  const paving = wetPaving({ w: 140, d: 140, x: 0, z: 0, y: 0, mode: "fake", color: PAVING, lights });
  add(paving.mesh);
  disposers.push(paving.dispose);

  // ---- The phone tier has no bloom: glow sprites stand in for it
  if (mobile) {
    const sprites = glowSprites(glow);
    add(sprites);
    geometries.push(sprites.geometry);
    disposers.push(() => sprites.dispose());
  }

  return {
    group,
    screens,
    frames,
    faces,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      disposers.forEach((d) => d());
    },
  };
}

// A screen's edge of light: cyan, and gold on the chosen one (both lit
// the same way, so the choice compiles nothing)
const FRAME_TONES = {
  cyan: () => neonMaterial(SCENE_TONES.cyan, { dayColor: FRAME }),
  gold: () => neonMaterial(SCENE_TONES.gold, { dayColor: "#c9a35e" }),
};

// The two spot lights, under the ring's deck either side of the view
const SPOTS: V3[] = T.spots.map((az) => {
  const p = polar(T.ring.r, az, T.ring.deck - T.ring.thick - 0.02);
  return [p.x, p.y, p.z];
});

// May the screenshots be shown? Always on the desktop tiers; on the phone
// tier only while the kit's textures are inside its budget
const shotsFit = (quality: Quality) => quality !== "mobile" || textureBytes() <= TIERS.mobile.textureMB * 2 ** 20;

function ProjectsScene({ quality, active }: SceneProps) {
  const built = useMemo(() => build(quality), [quality]);
  const invalidate = useThree((s) => s.invalidate);
  const chosen = useWorld((s) => s.sel.project);

  useEffect(() => {
    for (let n = 0; n < built.screens.length; n++) anchors.set(anchorKey("towers", `screen-${n}`), new THREE.Vector3(...screenMiddle(n)));
    return () => {
      for (let n = 0; n < built.screens.length; n++) anchors.delete(anchorKey("towers", `screen-${n}`));
      built.dispose();
    };
  }, [built]);

  // The words on the screens wait for the display face
  useEffect(() => {
    let live = true;
    fontsReady().then(() => {
      if (!live) return;
      for (const f of built.faces) f.userData.redraw?.();
      invalidate();
    });
    return () => {
      live = false;
    };
  }, [built, invalidate]);

  // The chosen screen's edge is gold
  useEffect(() => {
    built.frames.forEach((m, n) => (m.material = n === chosen ? FRAME_TONES.gold() : FRAME_TONES.cyan()));
    invalidate();
  }, [built, chosen, invalidate]);

  // The cover screenshots: fetched only while the place is showing, let
  // go (the title cards back) when it isn't
  useEffect(() => {
    if (!active || !shotsFit(quality)) return;
    let live = true;
    const images: HTMLImageElement[] = [];
    built.faces.forEach((face, n) => {
      const s = cover(n);
      if (!s) return;
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        if (!live) return;
        shots[n] = img;
        face.userData.redraw?.();
        invalidate();
      };
      img.src = s.src;
      images.push(img);
    });
    return () => {
      live = false;
      for (const img of images) {
        img.onload = null;
        img.src = "";
      }
      built.faces.forEach((face, n) => {
        if (!shots[n]) return;
        shots[n] = null;
        face.userData.redraw?.();
      });
      invalidate();
    };
  }, [active, quality, built, invalidate]);

  return (
    <>
      <primitive object={built.group} />
      <SceneLights id="towers" spots={SPOTS} distance={4} angle={0.9} />
      {built.screens.map((s, n) => (
        <Hitbox
          key={n}
          id={`towers:screen-${n}`}
          position={[s.center.x, s.center.y, s.center.z]}
          rotation={s.ry}
          size={s.size}
          onSelect={() => {
            world.select("project", n);
            world.set({ focus: `screen-${n}` });
          }}
        />
      ))}
    </>
  );
}

export default ProjectsScene;
