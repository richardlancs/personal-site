// Checks the city's palette (docs/city/style.md, "## Palette") before any
// CSS is built on it: text colours on every ground at 4.5:1 or better,
// accents and the focus ring at 3:1 or better (WCAG 2.1 contrast).
//
//   node docs/ui/scripts/palette-contrast.mjs
import { readFileSync } from "node:fs";

const md = readFileSync(new URL("../../city/style.md", import.meta.url), "utf8");
const table = md.split("## Palette")[1]?.split(/\n## /)[0] ?? "";
const palette = Object.fromEntries([...table.matchAll(/`(--[a-z0-9-]+)`\s*\|\s*`(#[0-9a-fA-F]{6})`/g)].map((m) => [m[1], m[2]]));

const channel = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const grounds = ["--ink", "--ink-2", "--panel"];
// The primary key: its ink label on the lantern fill, and on the fill's hover
const primary = [
  ["--ink", "--lantern", 4.5],
  ["--ink", "#f8c97f", 4.5],
];
const checks = [
  ...["--text", "--muted"].map((name) => ({ name, min: 4.5 })),
  ...["--cyan", "--lantern", "--focus"].map((name) => ({ name, min: 3 })),
];

let failed = false;
for (const name of [...grounds, ...checks.map((c) => c.name)]) {
  if (!palette[name]) {
    console.error(`missing from the palette table: ${name}`);
    failed = true;
  }
}
if (!failed) {
  for (const { name, min } of checks) {
    for (const ground of grounds) {
      const ratio = contrast(palette[name], palette[ground]);
      const ok = ratio >= min;
      if (!ok) failed = true;
      console.log(`${ok ? "ok  " : "FAIL"} ${name} ${palette[name]} on ${ground} ${palette[ground]}: ${ratio.toFixed(2)}:1 (needs ${min})`);
    }
  }
}
if (!failed) {
  for (const [label, fill, min] of primary) {
    const fg = palette[label];
    const bg = palette[fill] ?? fill;
    const ratio = contrast(fg, bg);
    const ok = ratio >= min;
    if (!ok) failed = true;
    console.log(`${ok ? "ok  " : "FAIL"} ${label} ${fg} on ${fill} ${bg}: ${ratio.toFixed(2)}:1 (needs ${min})`);
  }
}
// The list marker (city.css, .points): a small diamond, a non-text mark,
// in cyan for points, in muted for the folded ones; 3:1 on every ground
if (!failed) {
  for (const name of ["--cyan", "--muted"]) {
    for (const ground of grounds) {
      const ratio = contrast(palette[name], palette[ground]);
      const ok = ratio >= 3;
      if (!ok) failed = true;
      console.log(`${ok ? "ok  " : "FAIL"} list marker ${name} on ${ground}: ${ratio.toFixed(2)}:1 (needs 3)`);
    }
  }
}
process.exit(failed ? 1 : 0);
