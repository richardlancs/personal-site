"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useContext, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { interests } from "../../../data/portfolio";
import { createMachine } from "../arcade/arcadeMachine";
import { useDisposeOnUnmount, useMovers, type Hit, type Mover, type SceneProps } from "../common";
import { screenMaterial } from "../kit/neon";
import { plateUniforms, spotGeometry } from "../kit/plate";
import PlatePlace, { PlateContext } from "../PlatePlace";
import type { Quad } from "../scenes";
import { useWorld, world } from "../store";
import def, { SCREEN } from "./nanjing-road.def";

// Interests: the pedestrian street, drawn as its paintings (the data,
// read off them: nanjing-road.def.ts; the engine: kit/plate.ts,
// PlatePlace.tsx). The paintings' lit shopfronts, signs and lamps hold
// steady and glow into the night, the paving shimmers and takes the rain,
// the towers' aircraft lights swell slowly; nothing else moves on its own.
//
// The arcade machine (arcade/arcadeMachine.ts) is the one thing to use:
// every interest is a mode of it, and it plays live on the painted
// machine's screen (the spot "machine"). A click on the screen plays the
// mode's one thing (what the panel's Play key does) and walks the eye up
// to it; the panel's keys choose the mode (store: sel.interest) and count
// presses (arcadePress); the machine says how each turned out
// (arcadeStatus), read out by the panel. The screen runs as a mover
// (common.tsx: useMovers): parked in still view and while the place isn't
// showing. The two paintings draw the screen a little apart, so the live
// picture follows the day/night blend from one to the other.

// The machine's canvas, read by the screen's paint (its material is shared
// and outlives a rebuild, so it reads whichever machine is current)
const current: { canvas: HTMLCanvasElement | null } = { canvas: null };
const paintScreen = (g: CanvasRenderingContext2D, w: number, h: number) => {
  if (current.canvas) g.drawImage(current.canvas, 0, 0, w, h);
  else {
    g.fillStyle = "#08090c";
    g.fillRect(0, 0, w, h);
  }
};

const seconds = () => performance.now() / 1000;

// A point in a quad's plane (the painting's u, v) as the quad's own
// (s across from its left, t down from its top), from three of its corners
function inQuad(q: Quad, u: number, v: number): [number, number] {
  const [tl, tr, , bl] = q;
  const ax = tr[0] - tl[0], ay = tr[1] - tl[1], bx = bl[0] - tl[0], by = bl[1] - tl[1];
  const px = u - tl[0], py = v - tl[1];
  const det = ax * by - ay * bx;
  return [(px * by - py * bx) / det, (ax * py - ay * px) / det];
}
const mixQuad = (a: Quad, b: Quad, k: number): Quad => a.map((c, i) => c.map((x, j) => x + (b[i][j] - x) * k)) as Quad;

// The live screen, laid on the painted one: its own mesh inside the
// plate's group (PlateContext), the machine drawn on it 12 times a second
// while it's on and the place shows
function Screen({ active, still }: { active: boolean; still: boolean }) {
  const ctx = useContext(PlateContext)!;
  const built = useMemo(() => {
    const machine = createMachine(interests);
    const material = screenMaterial(paintScreen, { w: 512, h: 400, key: "nanjing-road:arcade:screen" });
    const night = spotGeometry(ctx.def, ctx.plate.frame, SCREEN.night, 4);
    const day = spotGeometry(ctx.def, ctx.plate.frame, SCREEN.day, 4);
    const geometry = night.clone();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "arcade:screen";
    mesh.renderOrder = 1;
    // (the canvas the shared material paints is this machine's: set at
    // each paint, as a rebuild, or development's double render, may have
    // made another meanwhile)
    const repaint = () => {
      current.canvas = machine.canvas;
      (material.userData.redraw as () => void)();
    };
    return {
      machine,
      mesh,
      repaint,
      // (between the two paintings' screens, as the day blends with the night)
      blend: { k: -1, night, day },
      dispose: () => {
        night.dispose();
        day.dispose();
        geometry.dispose();
        machine.tex.dispose();
        machine.marquee.dispose();
        if (current.canvas === machine.canvas) current.canvas = null;
      },
    };
  }, [ctx]);
  useDisposeOnUnmount(built);
  const invalidate = useThree((s) => s.invalidate);
  const interest = useWorld((s) => s.sel.interest);
  const arrived = useWorld((s) => s.arrived);
  const press = useWorld((s) => s.arcadePress);
  const on = active && arrived;

  // The screen as a mover: it plays at 12 frames a second while it's on;
  // parked, it holds a frame
  const movers = useMemo<Mover[]>(() => {
    let last = -Infinity;
    const isOn = () => world.get().arrived;
    return [
      {
        object: built.mesh,
        update(t) {
          if (t - last < 1 / 12 && t >= last) return;
          last = t;
          built.machine.draw(t, isOn(), false);
          built.repaint();
        },
        park() {
          built.machine.draw(seconds(), isOn(), true);
          built.repaint();
        },
      },
    ];
  }, [built]);
  useMovers(movers, { active: on, still });

  // Where the screen sits: the night painting's, the day one's, or between
  // (the blend is the plate's own, uDay)
  useFrame(() => {
    if (!active) return;
    const k = plateUniforms.uDay.value;
    const b = built.blend;
    if (Math.abs(k - b.k) < 0.002) return;
    b.k = k;
    const out = built.mesh.geometry.attributes.position as THREE.BufferAttribute;
    const n = b.night.attributes.position.array, d = b.day.attributes.position.array;
    for (let i = 0; i < out.array.length; i++) out.array[i] = n[i] + (d[i] - n[i]) * k;
    out.needsUpdate = true;
    built.mesh.geometry.computeBoundingSphere();
  });

  // A mode chosen (a key in the panel, or the idle cycle there): the
  // machine boots into it (in still view it cuts); off until arrival
  useEffect(() => {
    const m = built.machine;
    if (on && m.mode() !== interest) m.setMode(interest, seconds(), still);
    m.draw(seconds(), on, true);
    built.repaint();
    invalidate();
  }, [built, on, interest, still, invalidate]);

  // The panel's Play key: the mode's one thing, as a click on the screen
  const seen = useRef(press);
  useEffect(() => {
    if (press === seen.current) return;
    seen.current = press;
    if (on) play(built, null, invalidate);
  }, [press, on, built, invalidate]);

  // A click on the screen (PlatePlace's Hitbox on the spot): plays there
  useEffect(() => {
    clicked = (uv) => play(built, uv, invalidate);
    return () => {
      clicked = null;
    };
  }, [built, invalidate]);

  return <primitive object={built.mesh} />;
}

// (`uv`: where on the screen a click landed, for the modes that aim; the
// Play key presses without aiming)
function play(built: { machine: ReturnType<typeof createMachine>; repaint: () => void }, uv: THREE.Vector2 | null, invalidate: () => void) {
  const t = seconds();
  const s = world.get().still;
  const status = built.machine.press(uv, t, s);
  if (status) world.set({ arcadeStatus: status });
  if (s) {
    built.machine.draw(t, true, true);
    built.repaint();
  }
  invalidate();
}
let clicked: ((uv: THREE.Vector2 | null) => void) | null = null;

// The spot's box, in the painting's measure, for turning a click on it
// (its Hitbox's point, -0.5..0.5 across and up) back into the painting's
// u, v (every corner of the spot is at one depth, so the box is flat)
const spot = def.plate.spots.machine;
const [u0, u1] = [Math.min(...spot.map((c) => c[0])), Math.max(...spot.map((c) => c[0]))];
const [v0, v1] = [Math.min(...spot.map((c) => c[1])), Math.max(...spot.map((c) => c[1]))];

function onScreen(hit: Hit) {
  world.set({ focus: "machine" });
  const u = (u0 + u1) / 2 + hit.point.x * (u1 - u0);
  const v = (v0 + v1) / 2 - hit.point.y * (v1 - v0);
  // the live screen where it is now (between the two paintings')
  const [s, t] = inQuad(mixQuad(SCREEN.night, SCREEN.day, plateUniforms.uDay.value), u, v);
  clicked?.(s >= 0 && s <= 1 && t >= 0 && t <= 1 ? new THREE.Vector2(s, 1 - t) : null);
}

export default function InterestsScene(props: SceneProps) {
  const { active } = props;
  const spotEnabled = useCallback(() => active && world.get().arrived, [active]);
  return (
    <PlatePlace {...props} id="nanjing-road" def={def} onSpot={(_, hit) => onScreen(hit)} spotEnabled={spotEnabled}>
      <Screen active={props.active} still={props.still} />
    </PlatePlace>
  );
}
