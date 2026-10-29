import type { StaticImageData } from "next/image";
import boxes from "../../assets/park/layers/layers.json";
import canopy from "../../assets/park/layers/canopy.webp";
import clouds from "../../assets/park/layers/clouds.webp";
import far from "../../assets/park/layers/far.webp";
import ginkgo from "../../assets/park/layers/ginkgo.webp";
import grassLeft from "../../assets/park/layers/grass-left.webp";
import leaf1 from "../../assets/park/layers/leaf-1.webp";
import leaf2 from "../../assets/park/layers/leaf-2.webp";
import leaf3 from "../../assets/park/layers/leaf-3.webp";
import leaf4 from "../../assets/park/layers/leaf-4.webp";
import leavesRight from "../../assets/park/layers/leaves-right.webp";
import receiver from "../../assets/park/layers/receiver.webp";
import sign from "../../assets/park/layers/sign.webp";
import swing from "../../assets/park/layers/swing.webp";
import treeLeft from "../../assets/park/layers/tree-left.webp";
import type { Box } from "../../data/world";

export { default as plate } from "../../assets/park/layers/plate.webp";
export const leafSprites = [leaf1, leaf2, leaf3, leaf4];

// How each layer of the park moves.
// - depth: how much it follows the pointer (0 = the horizon, 1 = close)
// - push: how much more it grows than the rest when the camera moves in,
//   so near things pass the camera faster than far ones
// - sway: its idle movement in the wind (globals.css), turning around
//   `pivot` (painting pixels); `amp` scales it, `period` in seconds
// - gust: how far it bends when a gust comes through (degrees)
export type Layer = {
  id: keyof typeof boxes;
  src: StaticImageData;
  box: Box;
  depth: number;
  push: number;
  sway?: { kind: "bough" | "grass" | "drift" | "chain"; pivot: [number, number]; amp: number; period: number };
  gust?: number;
};

const box = (id: keyof typeof boxes) => boxes[id] as Box;

// Back to front. Everything not listed stays in the plate.
export const layers: Layer[] = [
  { id: "far", src: far, box: box("far"), depth: 0.12, push: -0.04 },
  {
    id: "clouds",
    src: clouds,
    box: box("clouds"),
    depth: 0.1,
    push: -0.04,
    sway: { kind: "drift", pivot: [450, 150], amp: 1, period: 140 },
  },
  {
    id: "ginkgo",
    src: ginkgo,
    box: box("ginkgo"),
    depth: 0.42,
    push: 0,
    sway: { kind: "bough", pivot: [455, 600], amp: 0.5, period: 9.7 },
    gust: 0.9,
  },
  {
    id: "sign",
    src: sign,
    box: box("sign"),
    depth: 0.45,
    push: 0,
    sway: { kind: "bough", pivot: [898, 440], amp: 1.4, period: 7.3 },
    gust: 3.5,
  },
  {
    id: "swing",
    src: swing,
    box: box("swing"),
    depth: 0.45,
    push: 0,
    sway: { kind: "chain", pivot: [538, 548], amp: 0.9, period: 3.4 },
    gust: 4,
  },
  { id: "receiver", src: receiver, box: box("receiver"), depth: 0.6, push: 0.01 },
];

// In front of the light and the falling leaves
export const nearLayers: Layer[] = [
  {
    id: "canopy",
    src: canopy,
    box: box("canopy"),
    depth: 0.95,
    push: 0.05,
    sway: { kind: "bough", pivot: [1490, 700], amp: 0.55, period: 11.3 },
    gust: 0.8,
  },
  {
    id: "tree-left",
    src: treeLeft,
    box: box("tree-left"),
    depth: 0.9,
    push: 0.05,
    sway: { kind: "bough", pivot: [40, 560], amp: 0.8, period: 8.9 },
    gust: 1.3,
  },
  {
    id: "grass-left",
    src: grassLeft,
    box: box("grass-left"),
    depth: 1.25,
    push: 0.07,
    sway: { kind: "grass", pivot: [300, 1024], amp: 1, period: 6.1 },
    gust: 2.2,
  },
  {
    id: "leaves-right",
    src: leavesRight,
    box: box("leaves-right"),
    depth: 1.3,
    push: 0.08,
    sway: { kind: "bough", pivot: [1536, 620], amp: 1.1, period: 7.7 },
    gust: 1.8,
  },
];
