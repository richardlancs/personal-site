import type { CSSProperties, ReactNode } from "react";
import { marginNotes } from "../../data/portfolio";

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
// with a hooked arrow toward the panel; from 1024px wide (the margins are
// too thin for words below that)
function Note({ text, x, r }: { text: string; x: string; r: string }) {
  const style = { "--x": x, "--y": "calc(var(--hang) + 1rem)", "--s": "auto", "--r": r, color: "var(--muted)", whiteSpace: "nowrap" } as CSSProperties;
  return (
    <span className="decor font-display text-lg" data-note="" style={style} aria-hidden="true">
      {text}
      <svg viewBox="0 0 40 24" width="34" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="inline-block align-top">
        <path d="M2 6c10 0 20 4 26 12M28 18l1-8M28 18l-8-1" />
      </svg>
    </span>
  );
}

// A printer's crop mark just outside a panel's top corner (the hero's
// left, Contact's right: the first sheet and the last), two hairlines
// stopping short of it; turned for the right-hand corner
function Crop({ x, r }: { x: string; r?: string }) {
  const marks = "M0 32h22M32 0v22";
  return (
    <Doodle place={{ x, y: "calc(var(--hang) - 1.5rem)", s: "1.5rem", r }} viewBox="0 0 40 40">
      <path className="d" d={marks} strokeWidth="2.4" />
      <path className="n" d={marks} strokeWidth="2.6" strokeDasharray="4 2" />
    </Doodle>
  );
}

// Home, the emptiest stop: a note, paper stars and a coffee ring to its
// left, a sun to its right; by night a constellation, glowing-paper stars
// and a ring round the moon
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
      <Crop x={`calc(${home.strip} - 1.5rem)`} />
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
          x: `calc(${home.strip} - 4rem)`,
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
    </>
  );
}

export function AboutDecor() {
  return <Arrow v={0} y="46%" r="-4deg" />;
}

// Projects: the arrow in, a note, and a paper clip on the index's corner
// (by day steel, by night gold)
export function ProjectsDecor() {
  const index = "min(100cqw - 2 * var(--peek), 50rem)"; // the index panel's width
  const clip = "M12 22v36a5 5 0 0 0 10 0V14a8 8 0 0 0-16 0v48a11 11 0 0 0 22 0V26";
  return (
    <>
      <Arrow v={1} y="60%" r="3deg" />
      <Note text={marginNotes.projects} x={`max(0.5rem, (100cqw - ${index}) / 2 - 8.5rem)`} r="4deg" />
      <Doodle
        place={{ x: `calc((100cqw - ${index}) / 2 + ${index} - 5rem)`, y: "calc(var(--hang) - 1.5rem)", s: "1.75rem", r: "10deg", z: 3 }}
        viewBox="0 0 30 80"
      >
        <path className="d" d={clip} strokeWidth="2.6" />
        <path className="n" d={clip} strokeWidth="2.6" style={ink("--accent")} />
      </Doodle>
    </>
  );
}

export function BackgroundDecor() {
  return <Arrow v={2} y="38%" r="-2deg" />;
}

export function InterestsDecor() {
  return <Arrow v={0} y="64%" r="7deg" />;
}

// Contact, the journey's end: the arrow in and a note; a paper plane on
// its way and a postage stamp to the right; a pencil left on the desk (by
// night a stick of chalk); the sheet's last corners
export function ContactDecor() {
  const side = "(50cqw - 24rem)"; // the paper either side of its 48rem
  const plane = `min(10rem, ${side} * 0.75)`;
  // (the stamp and the pencil only where the margins are 12rem or more:
  // narrower, the plane and the note are enough)
  const roomy = `max(0px, (${side} - 12rem) * 100)`;
  const stamp = `min(5.5rem, ${side} * 0.6, ${roomy})`;
  const pencil = `min(8rem, ${side} * 0.7, ${roomy})`;
  const centre = `calc(75cqw + 12rem - var(--s) / 2)`;
  return (
    <>
      <Arrow v={1} y="44%" r="-3deg" />
      <Note text={marginNotes.contact} x={`max(0.75rem, ${side} - 8rem)`} r="-3deg" />
      <Crop x="calc(50cqw + 24rem)" r="90deg" />
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
        place={{ x: `calc(${side} / 2 - var(--s) / 2)`, y: `calc(100% - var(--foot) - 3.5rem)`, s: pencil, r: "-12deg" }}
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
