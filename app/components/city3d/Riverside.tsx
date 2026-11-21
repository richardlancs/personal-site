"use client";

import { useFrame } from "@react-three/fiber";
import { useContext, useEffect, useMemo } from "react";
import * as THREE from "three";
import { cityPath } from "../../lib/cityRoutes";
import { section, type SectionId } from "../../sections/registry";
import { anchors, boardsIn } from "./anchors";
import { isFlat } from "./flat";
import { useDisposeOnUnmount, type SceneProps } from "./common";
import lujiazui, { groundDepth, HOME_SIGNS } from "./districts/lujiazui.def";
import { localPoint, plateFrame, spotPoint } from "./kit/plate";
import { buildSign, disposeSign } from "./kit/signs";
import PlatePlace, { PlateContext } from "./PlatePlace";
import type { Quality } from "./tiers";

// Home: the rooftop view over the city, its painting on the plate
// (districts/lujiazui.def.ts says what is where; PlatePlace.tsx and
// kit/plate.ts draw it, its living light and its movers: the second
// train on the metro line, the boats, the traffic, the aircraft lights).
//
// The five sections stand in the painting as places (HOME_SIGNS: the
// supertalls, the metro line, the old lane, the shopping street, the
// riverfront). Each one is:
// - a Hitbox on its spot, to its section (PlatePlace: onSpot), live
//   while its board shows (boardsLive, below);
// - the anchor "sign:<section>", the spot's middle, and its four edges'
//   middles ("sign:<section>:top", …), from which the page lays the
//   section's link over the spot (City3D.tsx: Tags, TagProjector);
// - a small board with the section's title from the registry
//   (kit/signs.ts: buildSign, the only words in the scene), standing on
//   the place, a hair in front of the painting at its depth, so it drifts
//   with what it names.

// Left to right across the painting
const SIGNED: Exclude<SectionId, "home">[] = ["contact", "about", "experience", "projects", "interests"];

// A board's width for its height (the riverside's boards' proportions);
// how far in front of the painting it stands (a share of the distance)
const BOARD_ASPECT = 1 / 0.34;
const LIFT = 0.015;
const NARROW_BOARD = 1.4;
const FACE_CLEAR = 0.05;
const FACE_Z = 0.07; // (kit/signs.ts: the face's own lift)
// On the narrow layout a board is at least this wide on screen, so its
// word (about 0.185 of the board's width, kit/signs.ts: paintWord) is 12 px
// or more (66 at 320 is about 2× the wide size); at most MAX_BOARD × its size
const MIN_BOARD_PX = 66;
const MAX_BOARD = 2.6;
const EDGES = [":top", ":foot", ":left", ":right"] as const;

type Built = {
  group: THREE.Group;
  // each sign's spot: its middle and edges, in the plate group's own
  // coordinates, and the same in the world (kept up to date per frame)
  signs: { id: Exclude<SectionId, "home">; local: Record<string, THREE.Vector3>; world: Record<string, THREE.Vector3> }[];
  // each board, its size and where it stands (for the narrow layout's
  // size), and its edges' middles in the world ("board:<section>:top", …:
  // the narrow layout lays the links over the boards, City3D.tsx)
  boards: { id: Exclude<SectionId, "home">; sign: THREE.Object3D; w: number; h: number; x: number; nx: number; y: number; z: number; world: Record<string, THREE.Vector3> }[];
  dispose: () => void;
};

function build(quality: Quality): Built {
  void quality; // (the boards' canvases follow the tier: kit/signs.ts)
  const frame = plateFrame(lujiazui);
  const group = new THREE.Group();
  group.name = "home-signs";
  const signs: Built["signs"] = [];
  const boards: Built["boards"] = [];
  const disposers: (() => void)[] = [];
  for (const id of SIGNED) {
    const s = HOME_SIGNS[id];
    // (in front of the nearest of what it covers: the ground comes nearer
    // row by row, and the board's bottom edge is its nearest row)
    const depth = Math.max(s.spot[0][2], groundDepth(s.label[1])) + LIFT;
    // the board: its bottom edge's middle at `label`, sized as a share of
    // the painting's height (shrunk with its pull, so it shows that size)
    const h = s.size * frame.height * (1 - depth);
    const w = h * BOARD_ASPECT;
    const title = section(id).title;
    const { group: sign, face: signFace } = buildSign({ text: title, tone: "cyan", w, h, kind: "board" });
    // The face and its lit edge stand clear of the dark back by a share of
    // the board's size: the kit's hundredth of a unit is under the depth
    // buffer's step this far out (the near plane at 0.1, the boards a few
    // hundred units away), so the back's triangles cut wedges into the word
    for (const o of sign.children) if (o.name !== "sign-frame") o.position.z += h * FACE_CLEAR;
    const [x, y, z] = localPoint(frame, s.label[0], s.label[1], depth);
    sign.position.set(x, y + h / 2, z);
    const nx = "narrow" in s && s.narrow ? localPoint(frame, s.narrow[0], s.narrow[1], depth)[0] : x;
    boards.push({ id, sign, w, h, x, nx, y: y + h / 2, z: z + h * FACE_CLEAR + FACE_Z, world: Object.fromEntries(EDGES.map((k) => [k, new THREE.Vector3()])) });
    signFace.name = `sign:${id}`;
    sign.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && o !== signFace) o.name = `mount:${id}`;
    });
    group.add(sign);
    disposers.push(() => disposeSign(sign));

    const pts = s.spot.map((c) => new THREE.Vector3(...spotPoint(lujiazui, frame, c)));
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y), pz = pts.reduce((a, p) => a + p.z, 0) / 4;
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const local: Record<string, THREE.Vector3> = {
      "": new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, pz),
      ":top": new THREE.Vector3((x0 + x1) / 2, y1, pz),
      ":foot": new THREE.Vector3((x0 + x1) / 2, y0, pz),
      ":left": new THREE.Vector3(x0, (y0 + y1) / 2, pz),
      ":right": new THREE.Vector3(x1, (y0 + y1) / 2, pz),
    };
    signs.push({ id, local, world: Object.fromEntries(Object.keys(local).map((k) => [k, new THREE.Vector3()])) });
  }
  return { group, signs, boards, dispose: () => disposers.forEach((d) => d()) };
}

// Whether the boards show, and their spots answer a pointer. Where the
// links stand over the boards (html[data-city-tags="over"]), both. Where
// they can't all (City3D.tsx: TagProjector), the boards give way to the
// dock, none drawn, so none is cut by the panel or the edge or looks like
// a control that does nothing (a 1024 or 1280 × 720 window, a phone on its
// side); except on a small phone held upright, where all five are in the
// strip, their words 12px or more, but five 44px links can't stand 8px
// apart: there the boards show and a tap on a place goes there (the dock
// is the keyboard's way and the list)
const boardsShown = () => document.documentElement.dataset.cityTags !== "row" || (isFlat() && boardsIn.value);
const boardsLive = () => !!document.documentElement.dataset.cityTags && boardsShown();

// The boards, inside the plate's group (so the cover's fit carries them),
// and the signs' anchors in the world, from the plate's matrix as it is
// this frame
function Signs({ built }: { built: Built }) {
  const context = useContext(PlateContext);
  const p = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    if (!context) return;
    // (the plate's own frame update may come after this one: fit it now)
    context.plate.cover(camera);
    context.plate.group.updateMatrixWorld();
    const m = context.plate.group.matrixWorld;
    built.group.visible = boardsShown();
    const flat = isFlat();
    const screenX = (x: number, b: Built["boards"][number]) => p.set(x, b.y, b.z).applyMatrix4(m).project(camera).x;
    for (const b of built.boards) {
      const x = flat ? b.nx : b.x;
      b.sign.position.x = x;
      // On the narrow layout the painting is smaller on screen (it fits
      // the strip above the sheet): the boards bigger there, standing on
      // the same foot, so their words stay 12 px or more (in steps of
      // 0.05, so the drift doesn't resize them every frame)
      let k = 1;
      if (flat) {
        const px = (Math.abs(screenX(x + b.w / 2, b) - screenX(x - b.w / 2, b)) * size.width) / 2;
        k = Math.min(MAX_BOARD, Math.max(NARROW_BOARD, Math.ceil((MIN_BOARD_PX / Math.max(px, 1)) * 20) / 20));
      }
      if (b.sign.scale.x !== k) {
        b.sign.scale.setScalar(k);
        b.sign.position.y = b.y + ((k - 1) * b.h) / 2;
      }
      const cy = b.sign.position.y;
      const [hw, hh] = [(b.w * k) / 2, (b.h * k) / 2];
      b.world[":top"].set(x, cy + hh, b.z).applyMatrix4(m);
      b.world[":foot"].set(x, cy - hh, b.z).applyMatrix4(m);
      b.world[":left"].set(x - hw, cy, b.z).applyMatrix4(m);
      b.world[":right"].set(x + hw, cy, b.z).applyMatrix4(m);
    }
    for (const s of built.signs) for (const k of Object.keys(s.local)) s.world[k].copy(s.local[k]).applyMatrix4(m);
  });
  return <primitive object={built.group} />;
}


export default function Riverside(props: SceneProps) {
  const { navigate, quality } = props;
  const built = useMemo(() => build(quality), [quality]);
  useDisposeOnUnmount(built);
  useEffect(() => {
    // "sign:<id>", the spot's middle, and its four edges' middles
    for (const s of built.signs) for (const [k, v] of Object.entries(s.world)) anchors.set(`sign:${s.id}${k}`, v);
    // and each board's four edges' middles
    for (const b of built.boards) for (const [k, v] of Object.entries(b.world)) anchors.set(`board:${b.id}${k}`, v);
    return () => {
      for (const s of built.signs) for (const k of Object.keys(s.world)) anchors.delete(`sign:${s.id}${k}`);
      for (const b of built.boards) for (const k of Object.keys(b.world)) anchors.delete(`board:${b.id}${k}`);
    };
  }, [built]);
  return (
    <PlatePlace {...props} id="lujiazui" def={lujiazui} onSpot={(key) => navigate(cityPath(key as SectionId))} spotEnabled={boardsLive}>
      <Signs built={built} />
    </PlatePlace>
  );
}
