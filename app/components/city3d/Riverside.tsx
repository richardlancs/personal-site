"use client";

import { useFrame } from "@react-three/fiber";
import { useContext, useEffect, useMemo } from "react";
import * as THREE from "three";
import { cityPath } from "../../lib/cityRoutes";
import { section, type SectionId } from "../../sections/registry";
import { anchors } from "./anchors";
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
// - a Hitbox on its spot, to its section (PlatePlace: onSpot), live only
//   while the links stand over the scene (html[data-city-tags="over"]);
//   where they're a row instead the dock lists the places;
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

type Built = {
  group: THREE.Group;
  // each sign's spot: its middle and edges, in the plate group's own
  // coordinates, and the same in the world (kept up to date per frame)
  signs: { id: Exclude<SectionId, "home">; local: Record<string, THREE.Vector3>; world: Record<string, THREE.Vector3> }[];
  dispose: () => void;
};

function build(quality: Quality): Built {
  void quality; // (the boards' canvases follow the tier: kit/signs.ts)
  const frame = plateFrame(lujiazui);
  const group = new THREE.Group();
  group.name = "home-signs";
  const signs: Built["signs"] = [];
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
    const [x, y, z] = localPoint(frame, s.label[0], s.label[1], depth);
    sign.position.set(x, y + h / 2, z);
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
  return { group, signs, dispose: () => disposers.forEach((d) => d()) };
}

// The boards, inside the plate's group (so the cover's fit carries them),
// and the signs' anchors in the world, from the plate's matrix as it is
// this frame
function Signs({ built }: { built: Built }) {
  const context = useContext(PlateContext);
  useFrame(({ camera }) => {
    if (!context) return;
    // (the plate's own frame update may come after this one: fit it now)
    context.plate.cover(camera);
    context.plate.group.updateMatrixWorld();
    const m = context.plate.group.matrixWorld;
    for (const s of built.signs) for (const k of Object.keys(s.local)) s.world[k].copy(s.local[k]).applyMatrix4(m);
  });
  return <primitive object={built.group} />;
}

// The spots answer a pointer only while their links stand over them
const boardsLive = () => document.documentElement.dataset.cityTags === "over";

export default function Riverside(props: SceneProps) {
  const { navigate, quality } = props;
  const built = useMemo(() => build(quality), [quality]);
  useDisposeOnUnmount(built);
  useEffect(() => {
    // "sign:<id>", the spot's middle, and its four edges' middles
    for (const s of built.signs) for (const [k, v] of Object.entries(s.world)) anchors.set(`sign:${s.id}${k}`, v);
    return () => {
      for (const s of built.signs) for (const k of Object.keys(s.world)) anchors.delete(`sign:${s.id}${k}`);
    };
  }, [built]);
  return (
    <PlatePlace {...props} id="lujiazui" def={lujiazui} onSpot={(key) => navigate(cityPath(key as SectionId))} spotEnabled={boardsLive}>
      <Signs built={built} />
    </PlatePlace>
  );
}
