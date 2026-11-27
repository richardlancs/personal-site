// Checks the two papers' palettes (day: cream; night: charcoal) (docs/city/style.md, "## Palette", one
// "### <paper>" table each) before any CSS is built on them (WCAG 2.1
// contrast): text, muted and accent-2 at 4.5:1 or better on every ground,
// the accent fill and the focus ring at 3:1 or better, the label on the
// accent (and on its hover, and on every grain of its textured face) at
// 4.5:1 or better. The grounds include the
// texture's extremes (app/paper.css), measured on each paper at 1440x900
// (the lowest and highest luma of the sheet over the paper's colour): a
// scale on the ground's channels, or, on charcoal's near-black, where the
// sheet only adds light, the brightest ridge as a colour.
//
//   node docs/ui/scripts/palette-contrast.mjs
import { readFileSync } from "node:fs";

const md = readFileSync(new URL("../../city/style.md", import.meta.url), "utf8");
const section = md.split("## Palette")[1]?.split(/\n## /)[0] ?? "";
const papers = Object.fromEntries(
  section
    .split(/\n### /)
    .slice(1)
    .map((block) => [block.split("\n")[0].trim().toLowerCase(), Object.fromEntries([...block.matchAll(/`(--[a-z0-9-]+)`\s*\|\s*`(#[0-9a-fA-F]{6})`/g)].map((m) => [m[1], m[2]]))])
    .filter(([, palette]) => Object.keys(palette).length),
);

const channel = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
// The texture's crease (darker) and ridge (lighter): a scale on each channel, or a colour
const shade = (hex, k) => (typeof k === "string" ? k : scale(hex, k));
const scale = (hex, k) => `#${[1, 3, 5].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * k))).toString(16).padStart(2, "0")).join("")}`;
const EXTREMES = { cream: [0.97, 1.04], charcoal: [1, "#3c3c3c"] };

// The primary key's textured face (app/city.css: --key-grain over
// --accent-fill, and the hover's wash of --accent-hover): its darkest and
// lightest pixel at rest and on hover, sampled in headless Chrome at
// 1440x900 with the label hidden (inside the edge). The label must hold
// 4.5:1 on every grain of it.
const FILLS = {
  cream: { rest: ["#513810", "#80652f"], hover: ["#604617", "#846a33"] },
  charcoal: { rest: ["#b18436", "#ecd18d"], hover: ["#c89d49", "#e5c37a"] },
};

const need = ["--paper", "--paper-2", "--panel", "--line", "--text", "--muted", "--accent", "--accent-hover", "--on-accent", "--accent-2", "--focus", "--shadow", "--ink"];
let failed = false;
const names = Object.keys(papers);
if (names.join() !== "cream,charcoal") {
  console.error(`expected the cream and charcoal tables, found: ${names.join(", ") || "none"}`);
  failed = true;
}
for (const [paper, palette] of Object.entries(papers)) {
  for (const name of need) {
    if (!palette[name]) {
      console.error(`${paper}: missing from the table: ${name}`);
      failed = true;
    }
  }
}

const check = (paper, label, fg, bg, min) => {
  const ratio = contrast(fg, bg);
  const ok = ratio >= min;
  if (!ok) failed = true;
  console.log(`${ok ? "ok  " : "FAIL"} ${paper}: ${label} ${fg} on ${bg}: ${ratio.toFixed(2)}:1 (needs ${min})`);
  return ratio;
};

if (!failed) {
  for (const [paper, p] of Object.entries(papers)) {
    const [CREASE, RIDGE] = EXTREMES[paper];
    let lowest = Infinity;
    for (const ground of ["--paper", "--paper-2", "--panel"]) {
      // Cards (--panel) are opaque sheets over the texture; the grounds
      // are what it shades
      const grounds = [[ground, p[ground]]];
      if (ground !== "--panel") grounds.push([`${ground} crease`, shade(p[ground], CREASE)], [`${ground} ridge`, shade(p[ground], RIDGE)]);
      for (const [where, bg] of grounds) {
        for (const name of ["--text", "--muted", "--accent-2"]) lowest = Math.min(lowest, check(paper, `${name} on ${where}`, p[name], bg, 4.5));
        for (const name of ["--accent", "--focus"]) check(paper, `${name} on ${where}`, p[name], bg, 3);
      }
    }
    check(paper, "--on-accent on --accent", p["--on-accent"], p["--accent"], 4.5);
    check(paper, "--on-accent on --accent-hover", p["--on-accent"], p["--accent-hover"], 4.5);
    for (const [state, [dark, light]] of Object.entries(FILLS[paper] ?? {})) {
      check(paper, `--on-accent on the textured face (${state}, darkest)`, p["--on-accent"], dark, 4.5);
      check(paper, `--on-accent on the textured face (${state}, lightest)`, p["--on-accent"], light, 4.5);
    }
    console.log(`     ${paper}: lowest text pair ${lowest.toFixed(2)}:1`);
  }
}
process.exit(failed ? 1 : 0);
