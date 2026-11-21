"use client";

import { useThree } from "@react-three/fiber";
import { useContext, useEffect, useMemo } from "react";
import * as THREE from "three";
import { projects } from "../../../data/portfolio";
import { useDisposeOnUnmount, type SceneProps } from "../common";
import { SCENE_TONES, screenArt, screenMaterial } from "../kit/neon";
import { spotGeometry } from "../kit/plate";
import { fit, fonts, fontsReady, textureBytes } from "../kit/textures";
import PlatePlace, { PlateContext } from "../PlatePlace";
import type { Quad } from "../scenes";
import { useWorld, world } from "../store";
import { TIERS, type Quality } from "../tiers";
import towers, { WALL } from "./towers.def";

// Projects: the walkway ring under the three supertalls, its two paintings
// on the plate (towers.def.ts holds everything read off them; kit/plate.ts
// draws them: the lit windows steady into the night, the supertalls'
// glass, the sky, the beacons on their tops and a plane's light crossing).
//
// The one thing drawn over the painting is the projects' wall, on the
// right podium's big screen: a tile for each project in portfolio order,
// three over two (towers.def.ts: WALL), each its cover screenshot
// (screenshots[cover ?? 0], public/projects/), or before that's loaded a
// title card (the title over abstract light; the titles are the only
// words drawn). The chosen project's tile (sel.project) is lit and edged
// in gold, the others dimmed. The tiles are the place's spots: clicking
// one chooses its project (sel.project, focus "screen-<n>"), as the
// panel's keys do, and the camera pans to the wall.
//
// The screenshots are fetched only while the place shows and let go when
// it doesn't; on the phone tier only while the kit's textures fit its
// budget. The wall's canvas is let go (and its upload) when the place is
// left, painted again on the way back.

const TILES = Math.min(projects.length, WALL.tiles.length);

// The screenshots, module state (the wall's material is the kit's, shared
// and kept across mounts, and paints from here), and the chosen tile
const shots: (HTMLImageElement | null)[] = [];
let chosen = 0;

const cover = (n: number) => {
  const p = projects[n];
  return p.screenshots?.[p.cover ?? 0];
};

// The wall's ground: the painting's own screen, deep violet into rose and
// amber in soft diagonal bands, darkened so the tiles stand on it
function ground(g: CanvasRenderingContext2D, w: number, h: number) {
  const base = g.createLinearGradient(0, h, w, 0);
  base.addColorStop(0, "#3a1f5c");
  base.addColorStop(0.5, "#5a2468");
  base.addColorStop(1, "#6b3a3a");
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  g.globalAlpha = 0.35;
  for (const [k, c] of [[0.25, "#c2449e"], [0.55, "#e0628a"], [0.85, "#e89a4c"]] as const) {
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(w * (k - 0.35), h);
    g.bezierCurveTo(w * (k - 0.1), h * 0.55, w * (k + 0.02), h * 0.5, w * (k + 0.3), 0);
    g.lineTo(w * (k + 0.42), 0);
    g.bezierCurveTo(w * (k + 0.12), h * 0.5, w * (k + 0.02), h * 0.62, w * (k - 0.2), h);
    g.closePath();
    g.fill();
  }
  g.globalAlpha = 1;
  // a little darker overall, so the tiles carry the light
  g.fillStyle = "rgba(10, 8, 22, 0.3)";
  g.fillRect(0, 0, w, h);
}

// One tile: the screenshot, filling it (cropped to its shape), or the
// title card; dimmed unless chosen
function tile(g: CanvasRenderingContext2D, n: number, x: number, y: number, tw: number, th: number) {
  const title = projects[n].title;
  const shot = shots[n];
  g.save();
  g.beginPath();
  g.rect(x, y, tw, th);
  g.clip();
  if (shot) {
    g.fillStyle = "#0b0e14";
    g.fillRect(x, y, tw, th);
    const k = Math.max(tw / shot.naturalWidth, th / shot.naturalHeight);
    const dw = shot.naturalWidth * k;
    const dh = shot.naturalHeight * k;
    g.imageSmoothingQuality = "high";
    // (the top of the screenshot, where an app's header and title are)
    g.drawImage(shot, x + (tw - dw) / 2, y, dw, dh);
  } else {
    g.translate(x, y);
    screenArt(7919 * (n + 1))(g, tw, th);
    g.fillStyle = "rgba(8,9,12,0.35)";
    g.fillRect(0, 0, tw, th);
    g.fillStyle = "#e6e9ee";
    g.textAlign = "center";
    g.textBaseline = "middle";
    fit(g, title, (s) => `700 ${s}px ${fonts().display}`, Math.round(th * 0.2), tw * 0.84);
    g.fillText(title, tw / 2, th / 2);
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
  // a screen's white a little under paper white, so it never reaches the
  // bloom's threshold at night (kit/neon.ts: screens show exactly as
  // painted); the tiles not chosen dimmed further
  g.globalCompositeOperation = "multiply";
  g.fillStyle = n === chosen ? "#e0e0e0" : "#9a9aa6";
  g.fillRect(x, y, tw, th);
  g.globalCompositeOperation = "source-over";
  g.restore();
}

function paintWall(g: CanvasRenderingContext2D, w: number, h: number) {
  ground(g, w, h);
  for (let n = 0; n < TILES; n++) {
    const { s, t } = WALL.tiles[n];
    const x = s * w, y = t * h, tw = WALL.tileW * w, th = WALL.tileH * h;
    // a thin dark bezel round every tile
    g.fillStyle = "#0a0c14";
    g.fillRect(x - 2, y - 2, tw + 4, th + 4);
    tile(g, n, x, y, tw, th);
  }
  // the chosen tile's gold edge, glowing a little onto the wall
  if (chosen < TILES) {
    const { s, t } = WALL.tiles[chosen];
    const x = s * w, y = t * h, tw = WALL.tileW * w, th = WALL.tileH * h;
    const line = Math.max(3, Math.round(h * 0.016));
    g.save();
    g.strokeStyle = SCENE_TONES.gold;
    g.lineWidth = line;
    g.shadowColor = SCENE_TONES.gold;
    g.shadowBlur = line * 3;
    g.strokeRect(x - line / 2 - 1, y - line / 2 - 1, tw + line + 2, th + line + 2);
    g.restore();
  }
}

// The wall's canvas, as large as it ever shows on each tier: panned to,
// it is about 330 × 170 CSS px at 1440 × 900, so about 580 × 300 at the
// high tier's pixel ratio (1.75): 768 × 384 keeps the tiles' screenshots
// sharp; 512 × 256 at the low tier's; on the phone tier, a band over the
// sheet, 384 × 192
const wallSize = (quality: Quality) => (quality === "mobile" ? { w: 384, h: 192 } : quality === "low" ? { w: 512, h: 256 } : { w: 768, h: 384 });

// May the screenshots be shown? Always on the desktop tiers; on the phone
// tier only while the kit's textures are inside its budget
const shotsFit = (quality: Quality) => quality !== "mobile" || textureBytes() <= TIERS.mobile.textureMB * 2 ** 20;

// The wall's face, over the right screen of the painting
const WALL_QUAD: Quad = WALL.screen.map(([u, v]) => [u, v, WALL.depth]) as Quad;

function Wall({ active, quality }: { active: boolean; quality: Quality }) {
  const ctx = useContext(PlateContext);
  const invalidate = useThree((s) => s.invalidate);
  const built = useMemo(() => {
    if (!ctx) return null;
    const { w, h } = wallSize(quality);
    const geometry = spotGeometry(ctx.def, ctx.plate.frame, WALL_QUAD, 6);
    const material = screenMaterial(paintWall, { w, h, key: `towers:wall:${w}` });
    // (drawn over the painting wherever it is: the ring's railing comes a
    // little nearer than the screen just under its corner)
    material.depthTest = false;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "towers-wall";
    mesh.renderOrder = 1;
    return { mesh, material, dispose: () => geometry.dispose() };
  }, [ctx, quality]);
  useDisposeOnUnmount(built ?? NOTHING);

  // The chosen tile
  const selected = useWorld((s) => s.sel.project);
  useEffect(() => {
    if (!built || chosen === selected) return;
    chosen = selected;
    built.material.userData.redraw?.();
    invalidate();
  }, [built, selected, invalidate]);

  // The titles on the title cards wait for the display face
  useEffect(() => {
    if (!built) return;
    let live = true;
    fontsReady().then(() => {
      if (!live) return;
      built.material.userData.redraw?.();
      invalidate();
    });
    return () => {
      live = false;
    };
  }, [built, invalidate]);

  // The wall's picture exists only while the place is showing: released
  // (canvas and upload) when it's left, painted again on the way back
  useEffect(() => {
    if (!built) return;
    if (!active) {
      built.material.userData.release?.();
      return;
    }
    chosen = world.get().sel.project;
    built.material.userData.restore?.();
    built.material.userData.redraw?.();
    invalidate();
  }, [active, built, invalidate]);

  // The cover screenshots: fetched only while the place is showing, let
  // go (the title cards back) when it isn't
  useEffect(() => {
    if (!built || !active || !shotsFit(quality)) return;
    let live = true;
    const images: HTMLImageElement[] = [];
    for (let n = 0; n < TILES; n++) {
      const s = cover(n);
      if (!s) continue;
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        if (!live) return;
        shots[n] = img;
        built.material.userData.redraw?.();
        invalidate();
      };
      img.src = s.src;
      images.push(img);
    }
    return () => {
      live = false;
      for (const img of images) {
        img.onload = null;
        img.src = "";
      }
      let had = false;
      for (let n = 0; n < TILES; n++) {
        had ||= !!shots[n];
        shots[n] = null;
      }
      if (had) built.material.userData.redraw?.();
      invalidate();
    };
  }, [active, quality, built, invalidate]);

  return built ? <primitive object={built.mesh} /> : null;
}
const NOTHING = { dispose() {} };

// A tile clicked: its project chosen, the camera to the wall
function chooseTile(key: string) {
  const n = Number(key.slice("screen-".length));
  if (!Number.isInteger(n) || n < 0 || n >= TILES) return;
  world.select("project", n);
  world.set({ focus: `screen-${n}` });
}

function ProjectsScene(props: SceneProps) {
  return (
    <PlatePlace {...props} id="towers" def={towers} onSpot={chooseTile}>
      <Wall active={props.active} quality={props.quality} />
    </PlatePlace>
  );
}

export default ProjectsScene;
