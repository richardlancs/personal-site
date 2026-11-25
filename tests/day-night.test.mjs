// The day/night key (components/ui/DayNight.tsx) and its head script
// (lib/paper.ts): day (cream) or night (charcoal), chosen by the visitor,
// set before the first paint, one glass icon key on the bar at every width.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const paper = read("app/lib/paper.ts");
const key = read("app/components/ui/DayNight.tsx");
const css = read("app/city.css");

// The head script as the browser gets it (a template string in paper.ts)
function headScript() {
  const consts = { PAPER_KEY: paper.match(/PAPER_KEY = "([^"]+)"/)[1], DEFAULT_PAPER: paper.match(/DEFAULT_PAPER: Paper = "([^"]+)"/)[1] };
  const papers = JSON.parse(paper.match(/PAPERS = (\[[^\]]+\])/)[1]);
  const template = paper.match(/PAPER_SCRIPT = `([^`]+)`/)[1];
  return template.replace(/\$\{([^}]+)\}/g, (_, name) => (name === "JSON.stringify(PAPERS)" ? JSON.stringify(papers) : consts[name]));
}

function run(saved, { blocked = false } = {}) {
  const attrs = {};
  const localStorage = {
    getItem: (k) => {
      if (blocked) throw new Error("blocked");
      return k === "paper" ? saved : null;
    },
  };
  const document = { documentElement: { setAttribute: (k, v) => (attrs[k] = v) } };
  vm.runInNewContext(headScript(), { localStorage, document });
  return attrs["data-paper"];
}

test("the head script sets the saved paper, day (cream) by default or for anything else, an old kraft included", () => {
  assert.equal(run("charcoal"), "charcoal");
  assert.equal(run("cream"), "cream");
  assert.equal(run("kraft"), "cream", "kraft is gone: day");
  assert.equal(run(null), "cream");
  assert.equal(run("magenta"), "cream");
  assert.equal(run("charcoal", { blocked: true }), "cream", "storage blocked: still a paper");
});

test("the layout runs the paper script in the head, first, and the browser's theme-color is cream's ground", () => {
  const layout = read("app/layout.tsx");
  const head = layout.match(/<head>([\s\S]*?)<\/head>/)[1];
  assert.match(head, /^\s*\{\/\*[\s\S]*?\*\/\}\s*<script dangerouslySetInnerHTML=\{\{ __html: PAPER_SCRIPT \}\} \/>/, "before any other script");
  const cream = css.match(/:root\[data-paper="cream"\] \{[^}]*--paper: (#[0-9a-f]{6});/i)[1];
  assert.match(layout, new RegExp(`themeColor: "${cream}"`, "i"));
  assert.match(layout, /colorScheme: "light dark"/);
  // The key keeps it in step with the paper
  assert.match(key, /meta\[name="theme-color"\]/);
});

test("one square glass key, pressed at night, named, saved and applied at once", () => {
  assert.match(paper, /PAPERS = \["cream", "charcoal"\] as const/);
  assert.doesNotMatch(key + css, /kraft/i);
  assert.match(key, /className="glass glass-icon day-night"/);
  assert.match(key, /aria-label="Night mode"/);
  assert.match(key, /aria-pressed=\{night\}/);
  assert.match(key, /onClick=\{\(\) => choose\(night \? DEFAULT_PAPER : NIGHT_PAPER\)\}/);
  assert.match(key, /localStorage\.setItem\(PAPER_KEY, paper\)/);
  assert.match(key, /html\.setAttribute\("data-paper", paper\)/);
  assert.doesNotMatch(key, /location\.reload|prefers-color-scheme/);
  // A cross-fade only where things may move; at once in still view
  assert.match(key, /const still = html\.getAttribute\("data-still"\) === "on" \|\| matchMedia\(REDUCED_MOTION\)\.matches;/);
  assert.match(key, /if \(!still && typeof document\.startViewTransition === "function"\) document\.startViewTransition\(apply\);\s*else apply\(\);/);
  assert.match(css, /::view-transition-old\(root\),\s*::view-transition-new\(root\) \{\s*animation-duration: var\(--t-slow\);\s*animation-timing-function: var\(--ease-in-out\);/);
});

test("the icon: an outline sun whose carving circle turns it into an outline crescent, drawn from data-paper", () => {
  // Outline only: no fill on the drawing, a mask and a clip for the crescent
  assert.match(key, /<svg [^>]*aria-hidden="true"[^>]*fill="none" stroke="currentColor"/);
  assert.match(key, /<mask id="day-night-cut"/);
  assert.match(key, /<clipPath id="day-night-disc">/);
  assert.equal((key.match(/className="day-night-cutter"/g) ?? []).length, 2, "the same circle cuts the disc and draws the inner curve");
  // Day: the circle off the disc; night: over it, the rays gone, the disc grown
  assert.match(css, /\n\.day-night-cutter \{\s*transform: translate\(4\.5px, -4\.5px\);/);
  assert.match(css, /:root\[data-paper="charcoal"\] \.day-night-cutter \{\s*transform: none;/);
  assert.match(css, /:root\[data-paper="charcoal"\] \.day-night-rays \{\s*opacity: 0;/);
  assert.match(css, /:root\[data-paper="charcoal"\] \.day-night-body \{[^}]*transform: scale\(1\.45\);/);
});

test("the turn and the hover move only where motion is welcome; hover only on a pointer that hovers", () => {
  assert.match(css, /--t-morph: \d+ms;/);
  const motion = css.match(/@media \(prefers-reduced-motion: no-preference\) \{\s*:root:not\(\[data-still="on"\]\) \.day-night :is\([^)]*\) \{([^}]*)\}/)?.[1];
  assert.ok(motion, "the turn's transition sits behind the still-view guard");
  assert.match(motion, /transform var\(--t-morph\) var\(--ease-in-out\)/);
  const hover = css.match(/@media \(hover: hover\) and \(prefers-reduced-motion: no-preference\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(hover, /\.day-night:hover \.day-night-cutter \{\s*transform: translate\(3\.2px, -3\.2px\);/, "the circle peeks over the sun");
  for (const rule of hover.match(/[^{}]+\{/g) ?? []) assert.match(rule, /:not\(\[data-still="on"\]|:not\(\[data-still="on"\],/, rule.trim());
  // Outside those blocks, nothing on the icon transitions
  const rest = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@media \(prefers-reduced-motion: no-preference\) \{\s*:root:not\(\[data-still="on"\]\) \.day-night[\s\S]*?\n\}/, "").replace(/@media \(hover: hover\) and \(prefers-reduced-motion: no-preference\) \{[\s\S]*?\n\}/, "");
  assert.doesNotMatch(rest.match(/[^{}]*\.day-night[^{]*\{[^}]*\}/g)?.join("\n") ?? "", /transition|animation/);
});

test("on the bar at every width, beside Sections; not in the Sections menu; none without scripts", () => {
  const bar = read("app/components/city2d/TopBar.tsx");
  assert.match(bar, /<div className="top-bar-end">\s*<DayNight \/>/);
  assert.match(bar, /<SectionsMenu \/>/);
  assert.doesNotMatch(bar, /PaperPicker/);
  assert.doesNotMatch(read("app/components/city2d/SectionsMenu.tsx"), /children/);
  assert.ok(!existsSync(`${root}app/components/ui/PaperPicker.tsx`), "the three-swatch picker is gone");
  assert.doesNotMatch(css, /paper-picker|paper-dot|paper-key/);
  assert.match(css, /:root:not\(\[data-paper\]\) \.day-night \{\s*display: none;/);
});
