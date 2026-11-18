// The kid in the intro (Intro.tsx), drawn in code in the cel style of the
// painted layers: seen from behind, running away down the path with arms
// out wide. Flat fills with one shadow tone and a light tone (the sun is
// upper left, as in the paintings), and a soft brown ink line.
//
// `drawKid(g, x, y, h, phase)`: feet at (x, y) on the canvas, `h` the
// kid's height in pixels, `phase` 0..1 through one stride (two steps).

const INK = "#4a3426";
const SKIN = "#e2ad84";
const SKIN_SHADE = "#bf8a64";
const SOLE = "#cf9f78";
const SHIRT = "#6a93b2";
const SHIRT_LIGHT = "#86abc6";
const SHIRT_SHADE = "#4d7493";
const SHORTS = "#3d3733";
const SHORTS_SHADE = "#2c2724";
const HAIR = "#231c18";
const HAIR_LIGHT = "#5b4a40";

type P = [number, number];
const TAU = Math.PI * 2;

// A limb: a round-capped stroke, inked, then filled over the ink, tapering
// from `w0` at its root to `w1` at its end
function limb(g: CanvasRenderingContext2D, a: P, b: P, c: P, w0: number, w1: number, fill: string, ink: number) {
  g.lineCap = "round";
  g.lineJoin = "round";
  for (const [color, extra] of [
    [INK, ink * 2],
    [fill, 0],
  ] as const) {
    g.strokeStyle = color;
    g.lineWidth = w0 + extra;
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
    g.stroke();
    g.lineWidth = (w0 + w1) / 2 + extra;
    g.beginPath();
    g.moveTo(b[0], b[1]);
    g.lineTo(c[0], c[1]);
    g.stroke();
  }
}

function shape(g: CanvasRenderingContext2D, path: () => void, fill: string, ink: number) {
  g.beginPath();
  path();
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = ink;
  g.lineJoin = "round";
  g.stroke();
}

export function drawKid(g: CanvasRenderingContext2D, x: number, y: number, h: number, phase: number) {
  const ink = Math.max(0.7, h * 0.007);
  const bob = -Math.abs(Math.sin(phase * TAU)) * h * 0.03;
  const lean = Math.sin(phase * TAU) * h * 0.01; // a little side to side
  const P = (px: number, py: number): P => [x + px * h + lean, y + py * h + bob];

  // A soft shadow on the ground under the kid
  g.save();
  g.globalAlpha *= 0.25;
  g.fillStyle = "#2a3a1a";
  g.beginPath();
  g.ellipse(x, y + h * 0.01, h * 0.15, h * 0.03, 0, 0, TAU);
  g.fill();
  g.restore();

  // Legs: the one in stance reaches down; the other kicks up behind, so
  // from behind its shin rises and its sole shows
  const legs = [-1, 1].map((side, k) => {
    const lift = Math.max(0, Math.sin((phase + k * 0.5) * TAU));
    return {
      lift,
      hip: P(side * 0.05, -0.41),
      knee: P(side * 0.058, -0.22 - lift * 0.05),
      foot: P(side * 0.048, -0.025 - lift * 0.19),
    };
  });
  legs.sort((a, b) => b.lift - a.lift); // the lifted leg is behind
  for (const leg of legs) {
    const up = leg.lift > 0.3;
    limb(g, leg.hip, leg.knee, leg.foot, h * 0.07, h * 0.055, up ? SKIN_SHADE : SKIN, ink);
    shape(g, () => g.ellipse(leg.foot[0], leg.foot[1] + h * 0.012, h * 0.034, up ? h * 0.048 : h * 0.024, 0, 0, TAU), up ? SOLE : SKIN_SHADE, ink);
  }

  // Shorts, a little flared, with a shadow down the right
  const [sx, sy] = P(0, -0.5);
  shape(
    g,
    () => {
      g.moveTo(sx - h * 0.12, sy);
      g.lineTo(sx + h * 0.12, sy);
      g.quadraticCurveTo(sx + h * 0.135, sy + h * 0.07, sx + h * 0.128, sy + h * 0.118);
      g.quadraticCurveTo(sx + h * 0.06, sy + h * 0.125, sx + h * 0.008, sy + h * 0.112);
      g.lineTo(sx, sy + h * 0.085);
      g.lineTo(sx - h * 0.008, sy + h * 0.112);
      g.quadraticCurveTo(sx - h * 0.06, sy + h * 0.125, sx - h * 0.128, sy + h * 0.118);
      g.quadraticCurveTo(sx - h * 0.135, sy + h * 0.07, sx - h * 0.12, sy);
    },
    SHORTS,
    ink,
  );
  g.fillStyle = SHORTS_SHADE;
  g.beginPath();
  g.moveTo(sx + h * 0.06, sy + h * 0.004);
  g.lineTo(sx + h * 0.118, sy + h * 0.004);
  g.quadraticCurveTo(sx + h * 0.13, sy + h * 0.07, sx + h * 0.124, sy + h * 0.112);
  g.quadraticCurveTo(sx + h * 0.09, sy + h * 0.115, sx + h * 0.075, sy + h * 0.11);
  g.closePath();
  g.fill();

  // Arms out wide, swinging a little against the stride, under the sleeves
  const swing = Math.sin(phase * TAU) * 0.045;
  for (const side of [-1, 1]) {
    const shoulder = P(side * 0.12, -0.705);
    const elbow = P(side * 0.25, -0.69 - swing * side);
    const hand = P(side * 0.36, -0.735 - swing * side * 1.6);
    limb(g, shoulder, elbow, hand, h * 0.058, h * 0.046, side < 0 ? SKIN : SKIN_SHADE, ink);
    shape(g, () => g.ellipse(hand[0] + side * h * 0.006, hand[1], h * 0.03, h * 0.026, 0, 0, TAU), side < 0 ? SKIN : SKIN_SHADE, ink);
  }

  // The shirt, loose, short sleeves, its hem flapping with the stride
  const [tx, ty] = P(0, -0.765);
  const flap = Math.sin(phase * TAU * 2) * h * 0.01;
  const body = () => {
    g.moveTo(tx - h * 0.08, ty);
    g.quadraticCurveTo(tx - h * 0.15, ty + h * 0.005, tx - h * 0.195, ty + h * 0.045); // left shoulder to sleeve
    g.quadraticCurveTo(tx - h * 0.205, ty + h * 0.08, tx - h * 0.185, ty + h * 0.11);
    g.quadraticCurveTo(tx - h * 0.155, ty + h * 0.11, tx - h * 0.13, ty + h * 0.095);
    g.quadraticCurveTo(tx - h * 0.135, ty + h * 0.2, tx - h * 0.142, ty + h * 0.29 + flap);
    g.quadraticCurveTo(tx, ty + h * 0.315 - flap, tx + h * 0.142, ty + h * 0.29 + flap);
    g.quadraticCurveTo(tx + h * 0.135, ty + h * 0.2, tx + h * 0.13, ty + h * 0.095);
    g.quadraticCurveTo(tx + h * 0.155, ty + h * 0.11, tx + h * 0.185, ty + h * 0.11);
    g.quadraticCurveTo(tx + h * 0.205, ty + h * 0.08, tx + h * 0.195, ty + h * 0.045);
    g.quadraticCurveTo(tx + h * 0.15, ty + h * 0.005, tx + h * 0.08, ty);
    g.quadraticCurveTo(tx, ty + h * 0.02, tx - h * 0.08, ty);
  };
  shape(g, body, SHIRT, ink);
  // Cel tones inside the shirt: light on the left (the sun's side), shade
  // on the right and a fold down the back
  g.save();
  g.beginPath();
  body();
  g.clip();
  g.fillStyle = SHIRT_LIGHT;
  g.beginPath();
  g.moveTo(tx - h * 0.22, ty);
  g.lineTo(tx - h * 0.07, ty);
  g.quadraticCurveTo(tx - h * 0.1, ty + h * 0.15, tx - h * 0.11, ty + h * 0.32);
  g.lineTo(tx - h * 0.22, ty + h * 0.32);
  g.closePath();
  g.fill();
  g.fillStyle = SHIRT_SHADE;
  g.beginPath();
  g.moveTo(tx + h * 0.05, ty);
  g.quadraticCurveTo(tx + h * 0.075, ty + h * 0.16, tx + h * 0.055, ty + h * 0.32);
  g.lineTo(tx + h * 0.22, ty + h * 0.32);
  g.lineTo(tx + h * 0.22, ty);
  g.closePath();
  g.fill();
  g.strokeStyle = SHIRT_SHADE;
  g.lineWidth = Math.max(0.6, h * 0.006);
  g.beginPath();
  g.moveTo(tx - h * 0.01, ty + h * 0.05);
  g.quadraticCurveTo(tx + h * 0.01, ty + h * 0.17, tx - h * 0.005, ty + h * 0.26);
  g.stroke();
  g.restore();
  // (the outline again, over the tones)
  g.beginPath();
  body();
  g.strokeStyle = INK;
  g.lineWidth = ink;
  g.stroke();

  // The back of the neck, the ears, then the hair from behind
  const [hx, hy] = P(0, -0.865);
  shape(g, () => g.roundRect(hx - h * 0.034, hy + h * 0.055, h * 0.068, h * 0.06, h * 0.02), SKIN_SHADE, ink);
  for (const side of [-1, 1]) shape(g, () => g.ellipse(hx + side * h * 0.094, hy + h * 0.025, h * 0.019, h * 0.028, 0, 0, TAU), SKIN, ink);
  // Tousled: a round head with soft tufts round the crown and a few
  // falling over the nape, their sizes fixed so it never shimmers
  const r = h * 0.098;
  const tufts = [1.0, 1.12, 1.03, 1.15, 1.04, 1.1, 1.0, 1.08, 0.98, 1.06, 1.12, 1.02];
  shape(
    g,
    () => {
      const n = tufts.length;
      const pt = (k: number) => {
        const a = (k / n) * TAU - Math.PI / 2;
        const rr = r * tufts[k % n] * (Math.sin(a) > 0.6 ? 0.97 : 1);
        return [hx + Math.cos(a) * rr, hy + Math.sin(a) * rr * 1.03] as P;
      };
      const start = pt(0);
      g.moveTo(start[0], start[1]);
      for (let k = 0; k < n; k++) {
        const a = pt(k);
        const b = pt(k + 1);
        const mid = (((k + 0.5) / n) * TAU) - Math.PI / 2;
        // Each tuft bulges out a little between its points
        const cx = hx + Math.cos(mid) * r * 1.16;
        const cy = hy + Math.sin(mid) * r * 1.16;
        g.quadraticCurveTo(cx, cy, b[0], b[1]);
        void a;
      }
    },
    HAIR,
    ink,
  );
  // Light on the hair from the upper left
  g.save();
  g.globalAlpha *= 0.55;
  g.strokeStyle = HAIR_LIGHT;
  g.lineCap = "round";
  g.lineWidth = Math.max(0.8, h * 0.014);
  for (const [a0, a1, rr] of [
    [1.05, 1.35, 0.7],
    [1.15, 1.45, 0.45],
  ])
    {
      g.beginPath();
      g.arc(hx - h * 0.015, hy - h * 0.005, r * rr, Math.PI * a0, Math.PI * a1);
      g.stroke();
    }
  g.restore();
}
