// Where things sit in the central clearing, on its 1600 × 900 canvas.
//
// The canvas always covers the screen, so on narrower screens its sides
// are cropped. Each path therefore has three endpoints: `wide` for screens
// at least 4:3, `mid` down to 3:4 (tablets), and `narrow` for phones, which
// keeps every path end inside the middle strip that stays visible there.

export const CANVAS = { width: 1600, height: 900 };

// The fountain plaza the paths start from
export const PLAZA = { x: 800, y: 808 };

export type Layout = "wide" | "mid" | "narrow";

export type Point = [number, number];

export type Destination = {
  id: string; // the section the path leads to
  label: string;
  wide: Point;
  mid: Point;
  narrow: Point;
  bend: number; // how much the path curves, and which way
};

export const destinations: Destination[] = [
  { id: "about", label: "About", wide: [250, 668], mid: [520, 722], narrow: [652, 738], bend: 0.22 },
  { id: "projects", label: "Projects", wide: [470, 566], mid: [574, 616], narrow: [646, 632], bend: 0.16 },
  { id: "experience", label: "Experience", wide: [680, 506], mid: [690, 522], narrow: [700, 528], bend: 0.1 },
  { id: "interests", label: "Interests", wide: [920, 506], mid: [910, 522], narrow: [900, 528], bend: -0.1 },
  { id: "skills", label: "Skills", wide: [1130, 566], mid: [1026, 616], narrow: [954, 632], bend: -0.16 },
  { id: "contact", label: "Contact", wide: [1350, 668], mid: [1080, 722], narrow: [948, 738], bend: -0.22 },
];

// A path from the plaza to `to` as a filled ribbon that narrows with
// distance, like a real path seen in perspective. It follows a gentle curve
// bent sideways by `bend`.
export function pathRibbon(to: Point, bend: number, near = 44, far = 12) {
  const [x0, y0] = [PLAZA.x, PLAZA.y];
  const [x1, y1] = to;
  const length = Math.hypot(x1 - x0, y1 - y0);
  // Control point: the midpoint pushed out sideways
  const cx = (x0 + x1) / 2 + ((y1 - y0) / length) * bend * length;
  const cy = (y0 + y1) / 2 - ((x1 - x0) / length) * bend * length;

  const steps = 28;
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t ** 2 * x1;
    const y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t ** 2 * y1;
    // Direction along the curve, for the sideways offset
    const dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx);
    const dy = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
    const d = Math.hypot(dx, dy) || 1;
    const half = (near + (far - near) * t) / 2;
    left.push(`${(x - (dy / d) * half).toFixed(1)} ${(y + (dx / d) * half).toFixed(1)}`);
    right.push(`${(x + (dy / d) * half).toFixed(1)} ${(y - (dx / d) * half).toFixed(1)}`);
  }
  return `M${left.join("L")}L${right.reverse().join("L")}Z`;
}
