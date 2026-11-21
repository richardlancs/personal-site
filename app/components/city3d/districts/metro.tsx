"use client";

import { useThree } from "@react-three/fiber";
import { useContext, useEffect, useMemo } from "react";
import * as THREE from "three";
import { experience } from "../../../data/portfolio";
import { sortNewestFirst } from "../../../lib/experience";
import type { SceneProps } from "../common";
import { spotGeometry } from "../kit/plate";
import { screenMaterial } from "../kit/neon";
import { fit, fonts, fontsReady } from "../kit/textures";
import PlatePlace, { PlateContext } from "../PlatePlace";
import type { Quad } from "../scenes";
import { useWorld, world } from "../store";
import type { Quality } from "../tiers";
import metro, { METRO } from "./metro.def";

// Experience: the metro platform, as its painting (metro.def.ts; the
// engine: kit/plate.ts, PlatePlace.tsx). The paintings' lamps, the train's
// lit windows and the platform's edge lights come up steady with the night
// (the light mask); the paving darkens and mirrors them after rain; the
// sky past the railing drifts its clouds by day and keeps a few stars on a
// clear night; traffic runs on the two road decks, a far train glides
// across the city under the towers, and the towers' aircraft lights swell
// slowly (the def's movers; all parked in still view).
//
// The departures board is the one thing drawn on the painting: its three
// painted rows show the experience entries (role, organisation and dates,
// from app/data/portfolio.ts, newest first), one row each, every character
// on its own flap, the chosen line (store: sel.line, chosen with the
// panel's keys or by clicking its row here: the spots "line-<n>") in gold.
// No other words.

const LINES = sortNewestFirst(experience);
const dates = (e: (typeof LINES)[number]) => (e.endDate ? `${e.startDate} – ${e.endDate}` : e.startDate);

// The board's picture, per tier (px; the board's face is 3.3 : 1)
const FACE: Record<Quality, { w: number; h: number }> = {
  high: { w: 1536, h: 464 },
  low: { w: 1280, h: 388 },
  mobile: { w: 1024, h: 310 },
};

// The chosen line is module state, so whichever build painted the shared
// material repaints the same
const board = { line: 0 };

function flaps(g: CanvasRenderingContext2D, text: string, x: number, y: number, room: number, cellH: number, ink: string, tile: string) {
  const cell = Math.min(cellH * 0.62, room / Math.max(1, text.length));
  const display = fonts().display;
  g.textAlign = "center";
  g.textBaseline = "middle";
  fit(g, "W", (px) => `600 ${px}px ${display}`, Math.round(cellH * 0.8), cell * 1.05, 8);
  for (let i = 0; i < text.length; i++) {
    const cx = x + i * cell;
    g.fillStyle = tile;
    g.fillRect(cx + cell * 0.06, y, cell * 0.88, cellH);
    // the flap's hinge
    g.fillStyle = "rgba(0,0,0,0.5)";
    g.fillRect(cx + cell * 0.06, y + cellH / 2 - 1, cell * 0.88, 2);
    if (text[i] === " ") continue;
    g.fillStyle = ink;
    g.fillText(text[i], cx + cell / 2, y + cellH * 0.53);
  }
}

// One row per painted row (METRO.rows): its role over its organisation and
// dates, in the painting's amber; the chosen one in gold with a mark
function drawBoard(g: CanvasRenderingContext2D, w: number, h: number) {
  g.fillStyle = "#101318";
  g.fillRect(0, 0, w, h);
  const rowH = h / METRO.rows;
  const pad = rowH * 0.12;
  const room = w - pad * 4;
  LINES.slice(0, METRO.rows).forEach((e, i) => {
    const chosen = i === board.line;
    const y = i * rowH;
    if (chosen) {
      g.fillStyle = "rgba(255,186,90,0.16)";
      g.fillRect(pad * 0.5, y + pad * 0.4, w - pad, rowH - pad * 0.8);
      g.fillStyle = "#ffc24f";
      g.fillRect(pad * 0.7, y + rowH * 0.18, pad * 0.8, rowH * 0.64);
    }
    flaps(g, e.role, pad * 2.4, y + rowH * 0.1, room, rowH * 0.44, chosen ? "#ffd27a" : "#f4b04a", chosen ? "#2b2216" : "#191b20");
    flaps(g, `${e.organization} · ${dates(e)}`, pad * 2.4, y + rowH * 0.6, room, rowH * 0.3, chosen ? "#f6c578" : "#c99a52", chosen ? "#251e14" : "#15171b");
  });
}

function choose(line: number) {
  world.select("line", line);
  world.set({ focus: `line-${line}` });
}

// The board's face over its painted panel, in the plate's group
function Board({ quality }: { quality: Quality }) {
  const ctx = useContext(PlateContext);
  const invalidate = useThree((s) => s.invalidate);
  const line = useWorld((s) => s.sel.line);
  const face = FACE[quality];
  const material = useMemo(() => screenMaterial(drawBoard, { ...face, key: `metro:plate-board:${face.w}x${face.h}` }), [face]);
  const mesh = useMemo(() => {
    if (!ctx) return null;
    const b = METRO.board;
    const quad: Quad = [
      [b.u0, b.v0, b.depth],
      [b.u1, b.v0, b.depth],
      [b.u1, b.v1, b.depth],
      [b.u0, b.v1, b.depth],
    ];
    const m = new THREE.Mesh(spotGeometry(ctx.def, ctx.plate.frame, quad, 4), material);
    m.name = "metro-board";
    m.renderOrder = 1;
    return m;
  }, [ctx, material]);
  useEffect(() => () => mesh?.geometry.dispose(), [mesh]);
  // The board shows the chosen line (and again once the display face is in)
  useEffect(() => {
    let live = true;
    board.line = line;
    const redraw = () => {
      if (!live) return;
      (material.userData.redraw as () => void)();
      invalidate();
    };
    redraw();
    fontsReady().then(redraw, () => {});
    return () => {
      live = false;
    };
  }, [material, line, invalidate]);
  return mesh ? <primitive object={mesh} /> : null;
}

function ExperienceScene(props: SceneProps) {
  return (
    <PlatePlace {...props} id="metro" def={metro} onSpot={(key) => choose(Number(key.slice("line-".length)))}>
      <Board quality={props.quality} />
    </PlatePlace>
  );
}

export default ExperienceScene;
