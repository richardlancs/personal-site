// The Paper picker (components/ui/PaperPicker.tsx) and its head script
// (lib/paper.ts): three papers, chosen by the visitor, set before the
// first paint, in the bar on wide screens and in the Sections menu on phones.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const paper = read("app/lib/paper.ts");
const picker = read("app/components/ui/PaperPicker.tsx");
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

test("the head script sets the saved paper, cream by default or for anything else", () => {
  assert.equal(run("charcoal"), "charcoal");
  assert.equal(run("kraft"), "kraft");
  assert.equal(run("cream"), "cream");
  assert.equal(run(null), "cream");
  assert.equal(run("magenta"), "cream");
  assert.equal(run("kraft", { blocked: true }), "cream", "storage blocked: still a paper");
});

test("the layout runs the paper script in the head, first, and the browser's theme-color is cream's ground", () => {
  const layout = read("app/layout.tsx");
  const head = layout.match(/<head>([\s\S]*?)<\/head>/)[1];
  assert.match(head, /^\s*\{\/\*[\s\S]*?\*\/\}\s*<script dangerouslySetInnerHTML=\{\{ __html: PAPER_SCRIPT \}\} \/>/, "before any other script");
  const cream = css.match(/:root\[data-paper="cream"\] \{[^}]*--paper: (#[0-9a-f]{6});/i)[1];
  assert.match(layout, new RegExp(`themeColor: "${cream}"`, "i"));
  assert.match(layout, /colorScheme: "light dark"/);
});

test("three keys in one labelled group, the chosen one pressed, saved and applied at once", () => {
  assert.match(paper, /PAPERS = \["cream", "charcoal", "kraft"\] as const/);
  assert.match(picker, /role="group" aria-labelledby=\{label\}/);
  assert.match(picker, /<button key=\{p\} type="button" className="glass paper-key" aria-pressed=\{p === paper\} onClick=\{\(\) => choose\(p\)\}>/);
  assert.match(picker, /localStorage\.setItem\(PAPER_KEY, paper\)/);
  assert.match(picker, /html\.setAttribute\("data-paper", paper\)/);
  assert.doesNotMatch(picker, /location\.reload|prefers-color-scheme/);
  // A cross-fade only where things may move; at once in still view
  assert.match(picker, /const still = html\.getAttribute\("data-still"\) === "on" \|\| matchMedia\(REDUCED_MOTION\)\.matches;/);
  assert.match(picker, /if \(!still && typeof document\.startViewTransition === "function"\) document\.startViewTransition\(apply\);\s*else apply\(\);/);
  assert.match(css, /::view-transition-old\(root\),\s*::view-transition-new\(root\) \{\s*animation-duration: var\(--t-slow\);\s*animation-timing-function: var\(--ease-in-out\);/);
});

test("in the bar from 80rem, in the Sections menu below, never both; none without scripts", () => {
  const bar = read("app/components/city2d/TopBar.tsx");
  assert.match(bar, /<div className="top-bar-end">\s*<PaperPicker where="bar" \/>/);
  assert.match(bar, /<SectionsMenu>\s*<PaperPicker where="menu" \/>\s*<\/SectionsMenu>/);
  assert.match(css, /\.paper-picker-bar \{\s*display: none;\s*\}/);
  assert.match(css, /@media \(min-width: 80rem\) \{\s*\.paper-picker-bar \{\s*display: flex;\s*\}\s*\.paper-picker-menu \{\s*display: none;\s*\}\s*\}/);
  assert.match(css, /:root:not\(\[data-paper\]\) \.paper-picker \{\s*display: none;/);
  // The keys 8px apart (touch targets), each dot its own paper's swatch token
  assert.match(css, /\.paper-picker-keys \{\s*display: flex;\s*flex-wrap: wrap;\s*gap: 0\.5rem;/);
  for (const p of ["cream", "charcoal", "kraft"]) assert.match(css, new RegExp(`\\.paper-dot-${p} \\{\\s*background: var\\(--swatch-${p}\\);`));
});
