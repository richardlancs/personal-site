import type { CSSProperties, ReactNode } from "react";
import { marginNotes, projects } from "../../data/portfolio";

// Doodles on the paper (city-track.css, "Doodles"): line drawings in one
// hand, each with a day version (pencil and ink on cream, `.d`) and a night
// one (chalk and gold leaf on charcoal, `.n`); the paper shows one. They
// ride on the track beside a stop's panel, in the paper around it, never
// under its words, and travel with it. Only on the journey, and on a
// phone only the ring under the hero; gone under more contrast and forced
// colours. Decoration only: hidden from assistive technology, no pointer,
// nothing moves. Colours are the papers' tokens; each one's place and size
// is given here in the stop's own terms (cqw: the stage's width; --hang:
// the panels' top line; --foot: the room the map takes), so the CSS stays
// a handful of rules.

type Place = {
  x: string; // left, from the stop's left edge
  y: string; // top
  s: string; // width
  r?: string; // a turn
  z?: number; // over the panels (the clip only)
  xp?: string; // left on a phone (then it shows there too)
  sp?: string; // its width there
};

function Doodle({ place, children, viewBox }: { place: Place; children: ReactNode; viewBox: string }) {
  const style = {
    "--x": place.x,
    "--y": place.y,
    "--s": place.s,
    "--r": place.r,
    "--z": place.z,
    "--xp": place.xp,
    "--sp": place.sp,
    color: "var(--muted)",
  } as CSSProperties;
  return (
    <svg
      className="decor"
      data-phone={place.xp ? "" : undefined}
      style={style}
      viewBox={viewBox}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const ink = (token: string, opacity = 1): CSSProperties => ({ color: `var(${token})`, opacity });

// A five-pointed star around (cx, cy): its outline, and the folds of a
// paper star (from the middle to each point)
function star(cx: number, cy: number, r: number) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const d = i % 2 ? r * 0.45 : r;
    return [cx + d * Math.cos(a), cy + d * Math.sin(a)].map((v) => v.toFixed(1)).join(" ");
  });
  const outline = `M${pts.join("L")}Z`;
  const folds = pts.filter((_, i) => i % 2 === 0).map((p) => `M${cx} ${cy}L${p}`).join("");
  return { outline, folds };
}

const stars = [star(30, 34, 22), star(72, 62, 15), star(40, 84, 9)];

// The stops' left strip: the slice of paper before a panel, as wide as the
// peek, where the arrow from the stop before sits; three hands of it (an
// arc, a loop, a wave), each stop its own height and turn
const arrows = [
  "M6 34C20 16 46 10 68 20c6 3 11 7 16 12M84 32l-13.5 1.5M84 32 79.5 19",
  "M6 30c10 8 22 10 30 2 6-6 0-14-6-10s-2 14 10 16c14 2 30-4 44-12M84 26l-12-1M84 26l-6 10",
  "M6 26c10-6 18 6 28 0s18 6 28 0 14 2 22 4M84 30l-11-7M84 30l-12 5",
];

function Arrow({ v, y, r }: { v: number; y: string; r: string }) {
  const path = arrows[v];
  return (
    <Doodle place={{ x: "calc(5cqw - min(3rem, 4cqw))", y, s: "min(6rem, 8cqw)", r }} viewBox="0 0 100 50">
      <path className="d" d={path} strokeWidth="2.4" />
      <g className="n" strokeWidth="2.6">
        <path d={path} strokeDasharray="7 3" />
        <path d={path} transform="translate(1 1.5)" opacity=".35" />
      </g>
    </Doodle>
  );
}

// A note in the margin, a few words in the display face, turned a little,
// with a hooked arrow toward the panel; from 1200px wide (the margins are
// too thin for words below that). After Home, a note sits in the stop's
// peek, so the stop before shows it whole
function Note({ text, x, y = "calc(var(--hang) + 1rem)", r, back }: { text: string; x: string; y?: string; r: string; back?: boolean }) {
  const style = { "--x": x, "--y": y, "--s": "auto", "--r": r, color: "var(--muted)", whiteSpace: "nowrap" } as CSSProperties;
  // (`back`: the arrow before the words, pointing back to the left)
  const hook = (
    <svg viewBox="0 0 40 24" width="34" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="inline-block align-top" style={back ? { scale: "-1 1" } : undefined}>
      <path d="M2 6c10 0 20 4 26 12M28 18l1-8M28 18l-8-1" />
    </svg>
  );
  return (
    <span className="decor font-display text-lg" data-note="" style={style} aria-hidden="true">
      {back && hook}
      {text}
      {!back && hook}
    </span>
  );
}

// Only where `room` is `need` or more: 0 below it, else no limit (a
// doodle too small to read as a drawing is left out)
const gate = (room: string, need: string) => `max(0px, (${room} - ${need}) * 100)`;

// A stop's first 10% (the peek) shows from the stop before, so a doodle in
// the left margin sits wholly inside it (`peek`) or wholly past it, between
// it and the card (`past`, where the margin is wider than the peek)
const peek = (most: string) => ({ x: "calc(5cqw - var(--s) / 2)", s: `min(${most}, 10cqw - 1rem)` });
const past = (strip: string, most: string, need: string) => ({
  x: `calc((10cqw + ${strip}) / 2 - var(--s) / 2)`,
  s: `min(${most}, ${strip} - 10cqw - 1.5rem, ${gate(`${strip} - 10cqw`, need)})`,
});

const display: CSSProperties = { fontFamily: "var(--font-display)" };

// A formula in pencil; by night in chalk, a faint smudge beside it. One
// line from children, or several (`lines`)
function Formula({ children, size = 15, lines }: { children?: ReactNode; size?: number; lines?: string[] }) {
  const words = (dx = 0, dy = 0) =>
    lines ? (
      lines.map((line, i) => (
        <text key={line + i} x={2 + dx} y={size + i * (size + 3) + dy} fontSize={size} letterSpacing="1">
          {line}
        </text>
      ))
    ) : (
      <text x={2 + dx} y={size + 3 + dy} fontSize={size}>
        {children}
      </text>
    );
  return (
    <g fill="currentColor" stroke="none" style={display}>
      <g className="d">{words()}</g>
      <g className="n">
        {words()}
        <g opacity=".25">{words(0.8, 1.2)}</g>
      </g>
    </g>
  );
}

// Nodes and the edges between them: by day pencil rings, by night chalk
// edges and filled nodes in the second accent
function Graph({ nodes, edges, r = 5 }: { nodes: number[][]; edges: number[][]; r?: number }) {
  const lines = edges.map(([a, b]) => `M${nodes[a][0]} ${nodes[a][1]}L${nodes[b][0]} ${nodes[b][1]}`).join("");
  return (
    <>
      <g className="d">
        <path d={lines} strokeWidth="1.2" opacity=".6" />
        {nodes.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} strokeWidth="2" />
        ))}
      </g>
      <g className="n">
        <path d={lines} strokeWidth="1.4" strokeDasharray="3 3" opacity=".7" />
        <g fill="currentColor" stroke="none" style={ink("--accent-2", 0.9)}>
          {nodes.map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={r * 0.75} />
          ))}
        </g>
      </g>
    </>
  );
}

// A small neural network: three inputs, four hidden, two out
function NeuralNet() {
  const nodes = [
    [10, 16], [10, 40], [10, 64],
    [50, 10], [50, 30], [50, 50], [50, 70],
    [90, 28], [90, 52],
  ];
  const edges = [];
  for (const a of [0, 1, 2]) for (const b of [3, 4, 5, 6]) edges.push([a, b]);
  for (const a of [3, 4, 5, 6]) for (const b of [7, 8]) edges.push([a, b]);
  return <Graph nodes={nodes} edges={edges} r={5} />;
}

// A binary tree, seven nodes
function BinaryTree() {
  const nodes = [[50, 10], [28, 38], [72, 38], [16, 66], [40, 66], [60, 66], [84, 66]];
  return <Graph nodes={nodes} edges={[[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]]} r={6} />;
}

// A linked list: three nodes, each pointing on, the last to nothing
function LinkedList() {
  const boxes = [2, 42, 82];
  return (
    <>
      <g className="d" strokeWidth="2">
        {boxes.map((x) => (
          <path key={x} d={`M${x} 6h26v18H${x}zM${x + 18} 6v18`} />
        ))}
        <path d="M24 15h18M36 10l6 5-6 5M64 15h18M76 10l6 5-6 5M104 15h14M118 9v12" />
      </g>
      <g className="n" strokeWidth="2">
        {boxes.map((x) => (
          <path key={x} d={`M${x} 6h26v18H${x}zM${x + 18} 6v18`} strokeDasharray="4 2" />
        ))}
        <g fill="currentColor" stroke="none" style={ink("--accent-2", 0.9)}>
          {boxes.map((x) => (
            <circle key={x} cx={x + 22} cy="15" r="2.2" />
          ))}
        </g>
        <path d="M24 15h18M36 10l6 5-6 5M64 15h18M76 10l6 5-6 5M104 15h14M118 9v12" />
      </g>
    </>
  );
}

// A branch off main and its merge back
function GitGraph() {
  const main = "M6 44h108";
  const branch = "M36 44c8 0 10-26 20-26h20c10 0 12 26 20 26";
  const commits = [[14, 44], [36, 44], [56, 18], [76, 18], [96, 44], [112, 44]];
  return (
    <>
      <g className="d" strokeWidth="2">
        <path d={main} />
        <path d={branch} opacity=".75" />
        {commits.map(([cx, cy]) => (
          <circle key={`${cx}`} cx={cx} cy={cy} r="4.5" fill="var(--paper)" />
        ))}
      </g>
      <g className="n" strokeWidth="2">
        <path d={main} strokeDasharray="5 3" />
        <path d={branch} style={ink("--accent-2", 0.9)} strokeDasharray="5 3" />
        <g fill="currentColor" stroke="none">
          {commits.map(([cx, cy]) => (
            <circle key={`${cx}`} cx={cx} cy={cy} r="3.6" />
          ))}
        </g>
      </g>
    </>
  );
}

// A bell curve on its axes, the mean marked
function BellCurve() {
  const axes = "M8 62h106M14 66V6";
  const curve = "M14 60C40 60 44 10 61 10S82 60 108 60";
  return (
    <>
      <g className="d" strokeWidth="2">
        <path d={axes} />
        <path d={curve} />
        <path d="M61 10v52" strokeDasharray="3 4" opacity=".6" />
      </g>
      <g className="n" strokeWidth="2">
        <path d={axes} strokeDasharray="6 2" />
        <path d={curve} style={ink("--accent-2", 0.9)} />
        <path d="M61 10v52" strokeDasharray="1 4" />
      </g>
    </>
  );
}

// The integral of x: a drawn integral sign, the rest in words
function Integral() {
  const sign = "M14 6c-4-2-6 1-6 5v18c0 4-2 7-6 5";
  return (
    <>
      <path className="d" d={sign} strokeWidth="2.2" />
      <path className="n" d={sign} strokeWidth="2.4" strokeDasharray="5 2" />
      <g fill="currentColor" stroke="none" style={display}>
        <text x="18" y="26" fontSize="15">x dx = x</text>
        <text x="80" y="20" fontSize="10">2</text>
        <text x="87" y="26" fontSize="15">/2</text>
      </g>
    </>
  );
}

// y = sin x on its axes
function SineWave() {
  const axes = "M6 34h108M10 6v50";
  const wave = "M10 34c8-26 18-26 26 0s18 26 26 0 18-26 26 0 18 26 26 0";
  return (
    <>
      <g className="d" strokeWidth="2">
        <path d={axes} opacity=".7" />
        <path d={wave} />
      </g>
      <g className="n" strokeWidth="2">
        <path d={axes} strokeDasharray="6 2" />
        <path d={wave} style={ink("--accent-2", 0.9)} />
      </g>
      <text x="76" y="12" fontSize="11" fill="currentColor" stroke="none" style={display}>
        y = sin x
      </text>
    </>
  );
}

// The 2 × 2 identity matrix
function Matrix() {
  const brackets = "M14 6H8v44h6M66 6h6v44h-6";
  return (
    <>
      <path className="d" d={brackets} strokeWidth="2.2" />
      <path className="n" d={brackets} strokeWidth="2.4" strokeDasharray="5 2" />
      <g fill="currentColor" stroke="none" style={display} fontSize="15">
        <text x="20" y="24">1</text>
        <text x="48" y="24">0</text>
        <text x="20" y="44">0</text>
        <text x="48" y="44">1</text>
      </g>
    </>
  );
}

// Two sets and where they meet
function Venn() {
  return (
    <>
      <g className="d" strokeWidth="2">
        <circle cx="38" cy="32" r="22" />
        <circle cx="62" cy="32" r="22" />
      </g>
      <g className="n" strokeWidth="2">
        <circle cx="38" cy="32" r="22" strokeDasharray="5 2" />
        <circle cx="62" cy="32" r="22" style={ink("--accent-2", 0.9)} strokeDasharray="5 2" />
      </g>
      <g fill="currentColor" stroke="none" style={display} fontSize="13">
        <text x="22" y="37">A</text>
        <text x="70" y="37">B</text>
      </g>
    </>
  );
}

// The square root of two, written out
function Root() {
  const radical = "M4 18l4-3 5 10 6-21h14";
  return (
    <>
      <path className="d" d={radical} strokeWidth="2" />
      <path className="n" d={radical} strokeWidth="2.2" strokeDasharray="5 2" />
      <text x="21" y="24" fontSize="15" fill="currentColor" stroke="none" style={display}>
        2 = 1.41421...
      </text>
    </>
  );
}

// The sum of the first n numbers: a drawn sigma and the rest in words
function Sum() {
  const sigma = "M8 12h20M8 12l10 15-10 15h20";
  return (
    <>
      <path className="d" d={sigma} strokeWidth="2.2" />
      <path className="n" d={sigma} strokeWidth="2.4" strokeDasharray="5 2" />
      <g fill="currentColor" stroke="none" style={display}>
        <text x="15" y="8" fontSize="8">n</text>
        <text x="10" y="51" fontSize="8">i=1</text>
        <text x="34" y="32" fontSize="15">i = n(n+1)/2</text>
      </g>
    </>
  );
}

// Home, the emptiest stop: a note, paper stars and a coffee ring to its
// left, a sun and a small neural network to its right; by night a
// constellation, gold stars, a ring round the moon and a network in chalk
const home = {
  strip: "(50cqw - 23rem)", // the paper either side of the hero's 46rem
};

export function HomeDecor() {
  const ringSize = "min(9rem, 100svh - 41rem)";
  // (the sun only where it can be a drawing, 5rem or more: smaller, it
  // reads as the day/night key's icon)
  const sunRoom = "(40cqw - 23rem) * 0.6";
  const sunSize = `min(10rem, ${sunRoom}, max(0px, (${sunRoom} - 5rem) * 100))`;
  const starSize = `min(6rem, ${home.strip} * 0.5)`;
  return (
    <>
      <Note text={marginNotes.home} x={`max(1.25rem, ${home.strip} - 9rem)`} r="-6deg" />
      <Doodle place={{ x: `calc(${home.strip} / 2 - ${starSize} / 2)`, y: "38%", s: starSize, r: "8deg" }} viewBox="0 0 100 100">
        <g className="d" strokeWidth="2">
          {stars.map((s, i) => (
            <g key={i}>
              <path d={s.outline} />
              <path d={s.folds} opacity=".55" />
            </g>
          ))}
        </g>
        <g className="n" fill="currentColor" stroke="none" style={ink("--accent", 0.85)}>
          {stars.map((s, i) => (
            <path key={i} d={s.outline} />
          ))}
          <circle cx="84" cy="22" r="1.6" />
          <circle cx="12" cy="66" r="1.2" />
        </g>
      </Doodle>
      <Doodle
        place={{
          x: `calc(${home.strip} / 2 - ${ringSize} / 2)`,
          y: `calc(100% - var(--foot) - ${ringSize} - 1rem)`,
          s: ringSize,
          r: "15deg",
          xp: "calc(72cqw - 3rem)",
          sp: "6rem",
        }}
        viewBox="0 0 100 100"
      >
        <g className="d" style={ink("--accent", 0.4)}>
          <path d="M50 8c23 .5 42 18.5 42 42.5S73.5 92.5 49 92 8 73 8.5 49.5 27.5 7.5 50 8z" strokeWidth="3" />
          <path d="M22 30c9-11 24-16 38-13M84 58c-3 14-15 25-29 27" strokeWidth="1.4" />
          <circle cx="88" cy="82" r="2.6" fill="currentColor" stroke="none" />
        </g>
        <g className="n" style={ink("--muted", 0.6)} strokeWidth="1.8">
          <circle cx="50" cy="50" r="42" strokeDasharray="1 5" />
          <path d="M58 28a24 24 0 1 0 14 40 19 19 0 1 1-14-40z" />
          <circle cx="30" cy="30" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="76" cy="74" r="1.1" fill="currentColor" stroke="none" />
        </g>
      </Doodle>
      <Doodle
        place={{ x: `calc(70cqw + 11.5rem - ${sunSize} / 2)`, y: "calc(var(--hang) + 2rem)", s: sunSize }}
        viewBox="0 0 100 100"
      >
        <g className="d" strokeWidth="2.2">
          <path d="M50 32c10.5-.4 18.6 7.6 18.3 18.2-.3 10-8.4 17.9-18.6 17.6C39.6 67.5 32 59.8 32.2 49.9 32.4 40.1 40.2 32.4 50 32z" />
          <path d="M50 10v12M50.5 78v12M10 50h12M78 49.5h12M21.7 21.7l8.3 8.3M70 70l8.6 8M78.3 21.7 70 30M30 70.5l-8 8.3" />
        </g>
        <g className="n" strokeWidth="1.6">
          <path d="M18 30 38 18l18 16 18-12M56 34l4 36 24-18M60 70 30 62" strokeDasharray="2 4" opacity=".7" />
          <g fill="currentColor" stroke="none">
            {[
              [18, 30, 2.6],
              [38, 18, 2],
              [56, 34, 3],
              [74, 22, 2.2],
              [84, 52, 2.6],
              [60, 70, 2.2],
              [30, 62, 1.8],
            ].map(([cx, cy, r]) => (
              <circle key={`${cx}`} cx={cx} cy={cy} r={r} />
            ))}
          </g>
        </g>
      </Doodle>
      <Doodle place={{ x: `calc(70cqw + 11.5rem - ${sunSize} / 2)`, y: "58%", s: sunSize, r: "-4deg" }} viewBox="0 0 100 80">
        <NeuralNet />
      </Doodle>
    </>
  );
}

// About: the arrow in; a sigmoid, the machine-learning curve, written out
// above it and a linked list below (where the margin can hold them)
export function AboutDecor() {
  const strip = "(100cqw - var(--w)) / 2";
  const size = (most: string) => `min(${most}, 10cqw - 1rem, ${gate(strip, "8rem")})`;
  return (
    <>
      <Arrow v={0} y="46%" r="-4deg" />
      <Doodle place={{ x: "calc(5cqw - var(--s) / 2)", y: "calc(var(--stop-top) + 2rem)", s: size("9.5rem"), r: "-5deg" }} viewBox="0 0 150 26">
        <Formula>
          f(x) = 1 / (1 + e
          <tspan dy="-6" fontSize="10">
            -x
          </tspan>
          <tspan dy="6">)</tspan>
        </Formula>
      </Doodle>
      <Doodle place={{ x: "calc(5cqw - var(--s) / 2)", y: "72%", s: size("8rem"), r: "4deg" }} viewBox="0 0 124 30">
        <LinkedList />
      </Doodle>
    </>
  );
}

// Projects: the arrow in and a note; the running time every sort hopes
// for, low in the margin; a branch and its merge to the index's right.
// (The paper clip is on the index itself: PaperClip, Projects.tsx)
export function ProjectsDecor() {
  const side = "(100cqw - min(100cqw - 2 * var(--peek), 50rem)) / 2"; // either side of the index
  return (
    <>
      <Arrow v={1} y="56%" r="3deg" />
      <ProjectGaps />
      <Doodle
        place={{ ...past(side, "7rem", "6rem"), y: "76%", r: "-3deg" }}
        viewBox="0 0 96 26"
      >
        <Formula>O(n log n)</Formula>
      </Doodle>
      <Doodle
        place={{ x: `calc(100cqw - ${side} + 5cqw - var(--s) / 2)`, y: "40%", s: `min(10rem, 10cqw - 1rem, ${gate("10cqw", "7rem")})`, r: "3deg" }}
        viewBox="0 0 120 60"
      >
        <GitGraph />
      </Doodle>
    </>
  );
}

// On the projects' index card itself, so they go where the card goes: the
// note beside its heading, pointing back at it, and the paper clip at its
// top right corner (by day steel, by night gold)
export function IndexNote() {
  // (just past the heading: "03 Projects" in the display face is about 18rem)
  return <Note text={marginNotes.projects} x="20rem" y="2.75rem" r="-4deg" back />;
}

export function PaperClip() {
  const clip = "M12 22v36a5 5 0 0 0 10 0V14a8 8 0 0 0-16 0v48a11 11 0 0 0 22 0V26";
  return (
    <Doodle place={{ x: "calc(100% - 4.5rem)", y: "-0.25rem", s: "1.75rem", r: "10deg", z: 3 }} viewBox="0 0 30 80">
      <path className="d" d={clip} strokeWidth="2.6" />
      <path className="n" d={clip} strokeWidth="2.6" style={ink("--accent")} />
    </Doodle>
  );
}

// Between the projects' cards: two equations in every gap, one in each
// half, so each project's screen has one at either side and none is cut
// at its edge (a gap is 20% of the stage, half of it showing from each of
// the cards it parts). From where a half can hold one (about 1120px wide)
const gapEquations: { box: string; draw: ReactNode; y: string; r: string }[] = [
  // (the first gap's left half holds the branch and merge: none here)
  { box: "0 0 120 26", y: "34%", r: "-4deg", draw: <Formula>a<tspan dy="-6" fontSize="10">2</tspan><tspan dy="6"> + b</tspan><tspan dy="-6" fontSize="10">2</tspan><tspan dy="6"> = c</tspan><tspan dy="-6" fontSize="10">2</tspan></Formula> },
  { box: "0 0 120 40", y: "62%", r: "3deg", draw: <Integral /> },
  { box: "0 0 120 60", y: "28%", r: "-2deg", draw: <SineWave /> },
  { box: "0 0 120 26", y: "66%", r: "4deg", draw: <Formula>n! = n · (n-1)!</Formula> },
  { box: "0 0 80 56", y: "30%", r: "-3deg", draw: <Matrix /> },
  { box: "0 0 90 26", y: "60%", r: "2deg", draw: <Formula>log<tspan dy="4" fontSize="10">2</tspan><tspan dy="-4"> n</tspan></Formula> },
  { box: "0 0 110 26", y: "36%", r: "-5deg", draw: <Formula>f&apos;(x) = 2x</Formula> },
  { box: "0 0 100 64", y: "64%", r: "3deg", draw: <Venn /> },
  { box: "0 0 120 30", y: "30%", r: "-2deg", draw: <Root /> },
  { box: "0 0 96 26", y: "62%", r: "4deg", draw: <Formula>P = NP ?</Formula> },
  { box: "0 0 120 26", y: "34%", r: "-3deg", draw: <Formula>2<tspan dy="-6" fontSize="10">10</tspan><tspan dy="6"> = 1024</tspan></Formula> },
];

export function ProjectGaps() {
  // (the index is narrower: the first gap starts at its right edge, and
  // every one after it a stage further along)
  const first = "(100cqw + min(100cqw - 2 * var(--peek), 50rem)) / 2";
  const s = `min(8rem, 10cqw - 1rem, ${gate("10cqw", "7rem")})`;
  const halves = (projects.length + 1) * 2; // the cards after the index, and Skills
  return (
    <>
      {gapEquations.slice(0, halves - 1).map((eq, i) => {
        const half = i + 1; // 0 is the first gap's left half
        const gap = Math.floor(half / 2);
        const centre = `${first} + ${gap} * 100cqw + ${half % 2 ? 15 : 5}cqw`;
        // (the first gap's right half also shows from the index, whose
        // margin is narrower than a gap below about 1340px: there it would
        // be cut at the screen's edge, so it waits for the room)
        const size = half === 1 ? `min(${s}, ${gate("(100cqw - min(100cqw - 2 * var(--peek), 50rem)) / 2", "20cqw")})` : s;
        return (
          <Doodle key={half} place={{ x: `calc(${centre} - var(--s) / 2)`, y: eq.y, s: size, r: eq.r }} viewBox={eq.box}>
            {eq.draw}
          </Doodle>
        );
      })}
    </>
  );
}

// Background: the arrow in; a binary tree above it and a sum below
export function BackgroundDecor() {
  const strip = "(100cqw - var(--wide)) / 2";
  return (
    <>
      <Arrow v={2} y="44%" r="-2deg" />
      <Doodle place={{ ...peek("5.5rem"), y: "calc(var(--stop-top) + 2rem)", r: "-3deg" }} viewBox="0 0 100 80">
        <BinaryTree />
      </Doodle>
      <Doodle
        place={{ x: "calc(5cqw - var(--s) / 2)", y: "70%", s: `min(7.5rem, 10cqw - 1rem, ${gate(strip, "8rem")})`, r: "3deg" }}
        viewBox="0 0 140 52"
      >
        <Sum />
      </Doodle>
    </>
  );
}

// Interests: the arrow in; the odds a poker hand is weighing, above it;
// a bell curve to the right (where there is room)
export function InterestsDecor() {
  const right = "(40cqw - 31rem)"; // the paper right of the card, before the next stop
  // (the formula in the peek, above the arrow: the wide card leaves little
  // margin past it)
  return (
    <>
      <Arrow v={0} y="58%" r="7deg" />
      <Doodle
        place={{ x: "calc(5cqw - var(--s) / 2)", s: `min(8rem, 10cqw - 1rem, ${gate("10cqw", "7rem")})`, y: "calc(var(--stop-top) + 2.5rem)", r: "-4deg" }}
        viewBox="0 0 116 26"
      >
        <Formula>P(win | hand)</Formula>
      </Doodle>
      <Doodle
        place={{ x: `calc(70cqw + 12.5rem - var(--s) / 2)`, y: "36%", s: `min(9rem, ${right} * 0.8, ${gate(right, "7rem")})`, r: "-2deg" }}
        viewBox="0 0 120 70"
      >
        <BellCurve />
      </Doodle>
    </>
  );
}

// Contact, the journey's end: the arrow in, a note and "Hi" in binary; a
// paper plane on its way and a postage stamp to the right; a pencil left
// on the desk (by night a stick of chalk)
export function ContactDecor() {
  const side = "(50cqw - 24rem)"; // the paper either side of its 48rem
  const plane = `min(10rem, ${side} * 0.75)`;
  // (the stamp and the pencil only where the margins are 12rem or more:
  // narrower, the plane and the note are enough)
  const roomy = `max(0px, (${side} - 12rem) * 100)`;
  const stamp = `min(5.5rem, ${side} * 0.6, ${roomy})`;
  const centre = `calc(75cqw + 12rem - var(--s) / 2)`;
  return (
    <>
      <Arrow v={1} y="44%" r="-3deg" />
      <Note text={marginNotes.contact} x="0.75rem" r="-3deg" />
      <Doodle
        place={{ ...past(side, "6rem", "5rem"), y: "calc(var(--hang) + 4.5rem)", r: "-2deg" }}
        viewBox="0 0 76 36"
      >
        <Formula size={13} lines={["01001000", "01101001"]} />
      </Doodle>
      <Doodle place={{ x: centre, y: "calc(var(--hang) + 1.5rem)", s: plane, r: "-6deg" }} viewBox="0 0 120 80">
        <g strokeWidth="2">
          <path d="M112 10 12 40l38 12 12 20 10-16 40-46zM50 52l62-42M62 72l-12-20" />
          <path className="d" d="M44 58c-14 6-22 3-26-3-4-7 6-11 9-4 3 8-8 16-25 21" strokeDasharray="4 5" opacity=".7" />
          <g className="n">
            <path d="M44 58c-14 6-22 3-26-3-4-7 6-11 9-4 3 8-8 16-25 21" strokeDasharray="0.5 6" strokeWidth="2.6" />
            <path d="M20 14v10M15 19h10" strokeWidth="1.6" />
          </g>
        </g>
      </Doodle>
      <Doodle place={{ x: centre, y: "56%", s: stamp, r: "7deg" }} viewBox="0 0 100 100">
        <g strokeWidth="2">
          <rect x="6" y="6" width="64" height="84" strokeDasharray="0.5 4.5" strokeWidth="3" />
          <rect x="13" y="13" width="50" height="56" />
        </g>
        <g className="d" strokeWidth="2">
          <circle cx="38" cy="38" r="8" />
          <path d="M38 22v5M38 49v5M22 38h5M49 38h5" />
          <circle cx="68" cy="78" r="16" opacity=".75" />
          <path d="M42 70c6-4 10 4 16 0s10 4 16 0 10 4 16 0M42 78c6-4 10 4 16 0s10 4 16 0 10 4 16 0" opacity=".75" />
        </g>
        <g className="n" strokeWidth="2">
          <path d="M42 26a12 12 0 1 0 8 20 9 9 0 1 1-8-20z" />
          <circle cx="68" cy="78" r="16" strokeDasharray="3 3" />
        </g>
        <text x="38" y="84" textAnchor="middle" fontSize="11" fill="currentColor" stroke="none" style={{ fontFamily: "var(--font-display)" }}>
          RL
        </text>
      </Doodle>
      <Doodle
        place={{ ...past(side, "8rem", "6rem"), y: `calc(100% - var(--foot) - 3.5rem)`, r: "-12deg" }}
        viewBox="0 0 120 40"
      >
        <g className="d" strokeWidth="2">
          <path d="M14 12h70l18 8-18 8H14zM84 12v16M14 12v16" />
          <rect x="3" y="12" width="11" height="16" rx="3" />
          <path d="M102 20l-7-3v6z" fill="currentColor" />
          <g fill="currentColor" stroke="none">
            <circle cx="110" cy="30" r="1.2" />
            <circle cx="114" cy="25" r="1" />
            <circle cx="106" cy="35" r="1.3" />
          </g>
        </g>
        <g className="n" strokeWidth="2">
          <path d="M22 14h48l7 2 5 4-4 2-3 3-5 1H22a6 6 0 0 1 0-12z" />
          <path d="M70 14l-2 12" opacity=".5" />
          <path d="M60 34c14 2 30 1 46-3" strokeWidth="6" opacity=".18" />
          <path d="M86 28c8 2 14 0 22-4" strokeDasharray="1 4" />
          <g fill="currentColor" stroke="none" opacity=".7">
            <circle cx="92" cy="20" r="1" />
            <circle cx="100" cy="16" r="1.2" />
            <circle cx="108" cy="32" r="1" />
            <circle cx="114" cy="22" r="0.9" />
          </g>
        </g>
      </Doodle>
    </>
  );
}
