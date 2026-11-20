// The panels over the 3D city's scenes and the controls that tie a
// section's words to its scene (city3d/panels/, CityPage.tsx).
// docs/superpowers/plans/2026-11-19-shanghai-3d.md, Task 10.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const panels = "app/components/city3d/panels";

test("a journey puts focus on the panel's heading at once, without scrolling, never on the visit's first page", () => {
  const src = code(read(`${panels}/CityPanel.tsx`));
  assert.match(src, /^"use client";/);
  const effect = src.match(/useEffect\(\(\) => \{([\s\S]*?)\}, \[([^\]]*)\]\);/);
  assert.ok(effect, "an effect");
  const [, body, deps] = effect;
  assert.match(deps, /\bsection\b/);
  assert.match(body, /\.focus\(\{ preventScroll: true \}\)/);
  assert.match(body, /h1/);
  // The first run of the visit, the page it was loaded on, is skipped
  // (module-level, since each page mounts its own panel)
  assert.match(src, /^let moved = false;/m);
  assert.match(body, /if \(!moved\) return;/);
  assert.match(src, /getEntriesByType\("navigation"\)/);
  // The panel owns this now: CityFocus is no longer rendered
  assert.doesNotMatch(read("app/components/city3d/CityPage.tsx"), /CityFocus/);
});

test("Escape goes back to the riverside once, from the 3D chunk, never on home or over a menu or the résumé", () => {
  // City3D.tsx (loaded lazily with the canvas) already handles it; the
  // panel, which is in /city's first load, doesn't add a second
  const city = code(read("app/components/city3d/City3D.tsx"));
  assert.match(city, /e\.key !== "Escape"/);
  assert.match(city, /if \(target === RIVERSIDE\) return;/);
  assert.match(city, /resume-lock/);
  assert.match(city, /:popover-open, dialog\[open\]/);
  assert.match(city, /router\.push\(cityPath\("home"\)\)/);
  assert.doesNotMatch(code(read(`${panels}/CityPanel.tsx`)), /Escape|keydown/);
});

test("the pickers load lazily, only for Projects, Experience and Interests, and only while the 3D city draws", () => {
  const panel = code(read(`${panels}/CityPanel.tsx`));
  const lazies = [...panel.matchAll(/(\w+): lazy\(\(\) => import\("\.\/(\w+)"\)\)/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(lazies, [
    ["projects", "ScreenPicker"],
    ["experience", "BoardLines"],
    ["interests", "ArcadeControls"],
  ]);
  assert.match(panel, /dataset\.city3d === "on"/);
  assert.match(panel, /useSyncExternalStore\(/);
  // Not imported statically by anything the pages load first
  const page = code(read("app/components/city3d/CityPage.tsx"));
  for (const name of ["ScreenPicker", "BoardLines", "ArcadeControls"]) {
    assert.doesNotMatch(page, new RegExp(name), `CityPage: ${name}`);
    assert.doesNotMatch(panel, new RegExp(`import \\w+ from "\\./${name}"`), `CityPanel: ${name}`);
  }
});

test("each picker is a row of glass keys, chosen with aria-pressed, moved along with the arrows", () => {
  for (const name of ["ScreenPicker", "BoardLines", "ArcadeControls"]) {
    const src = code(read(`${panels}/${name}.tsx`));
    assert.match(src, /^"use client";/, name);
    assert.match(src, /from "\.\/selector"/, name);
    assert.match(src, /onChoiceKey\(/, name);
    assert.match(src, /aria-pressed=\{/, name);
    assert.match(src, /data-choice/, name);
    assert.match(src, /className="glass[ "]/, name);
    assert.match(src, /role="group"/, name);
  }
});

test("each picker writes its choice and its scene's focus key", () => {
  const screens = code(read(`${panels}/ScreenPicker.tsx`));
  assert.match(screens, /world\.select\("project", index\)/);
  assert.match(screens, /focus: `screen-\$\{index\}`/);
  // A screen chosen in the scene brings its row (Projects' own ids) into
  // view and its heading takes focus
  assert.match(screens, /getElementById\(slug\(/);
  assert.match(screens, /scrollIntoView\(/);
  assert.match(screens, /\.focus\(\{ preventScroll: true \}\)/);
  assert.match(read("app/components/city2d/sections/Projects.tsx"), /id=\{slug\(project\.title\)\}/);

  const lines = code(read(`${panels}/BoardLines.tsx`));
  assert.match(lines, /sortNewestFirst\(experience\)/);
  assert.match(lines, /world\.select\("line", index\)/);
  assert.match(lines, /focus: `line-\$\{index\}`/);

  const arcade = code(read(`${panels}/ArcadeControls.tsx`));
  assert.match(arcade, /world\.select\("interest", index\)/);
  assert.match(arcade, /arcadePress: world\.get\(\)\.arcadePress \+ 1/);
  assert.match(arcade, /focus: "machine"/);
  assert.match(arcade, />\s*Play\b/);
  // How a press turned out is read out, from a line that stays on screen
  assert.match(arcade, /aria-live="polite"[^>]*>\s*\{status\}/);
  // Left alone it moves on, never in still view or a hidden tab
  assert.match(arcade, /if \(touched \|\| hovering \|\| still \|\| !arrived\) return;/);
  assert.match(arcade, /document\.hidden/);
});

test("the scene keys named in the districts' defs are the ones the pickers write", () => {
  assert.match(read("app/components/city3d/districts/towers.def.ts"), /"screen-<n>"/);
  assert.match(read("app/components/city3d/districts/metro.def.ts"), /"line-<n>"/);
  assert.match(read("app/components/city3d/districts/nanjing-road.def.ts"), /"machine"/);
});

test("CityPage keeps the section's words with where=\"3d\" and puts the panel's behaviour after the heading", () => {
  const page = code(read("app/components/city3d/CityPage.tsx"));
  for (const name of ["Hero", "About", "Projects", "Experience", "Interests", "Contact"]) assert.match(page, new RegExp(`<${name} where="3d" />`), name);
  assert.match(page, /import CityPanel from "\.\/panels\/CityPanel";/);
  assert.match(page, /<\/h1>\s*\)\}\s*<CityPanel section=\{id\} \/>\s*\{content\[id\]\}/);
});

test("FocusButton turns the camera and is glass", () => {
  const src = code(read(`${panels}/FocusButton.tsx`));
  assert.match(src, /world\.set\(\{ focus \}\)/);
  assert.match(src, /type="button"/);
  assert.match(src, /className="glass/);
});

// Whether each `:hover` in a stylesheet sits inside @media (hover: hover)
function strayHovers(css) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const stack = [];
  let prelude = "";
  const stray = [];
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === "{") {
      stack.push(prelude.trim());
      if (/:hover\b/.test(prelude) && !stack.some((p) => /^@media\b.*\(hover:\s*hover\)/.test(p))) stray.push(prelude.trim());
      prelude = "";
    } else if (c === "}") {
      stack.pop();
      prelude = "";
    } else if (c === ";") prelude = "";
    else prelude += c;
  }
  return stray;
}

const panelCss = () => `${read("app/city.css")}\n${read("app/city/city-pages.css")}`;

test("hover only adds: no :hover outside @media (hover: hover) in the city's CSS", () => {
  assert.deepEqual(strayHovers(panelCss()), []);
  // the check itself
  assert.deepEqual(strayHovers("a:hover { color: red } @media (hover: hover) { b:hover { color: red } }"), ["a:hover"]);
});

test("under prefers-contrast: more the panel is opaque", { todo: "lead: app/city.css, .city-panel under prefers-contrast" }, () => {
  const css = panelCss().replace(/\/\*[\s\S]*?\*\//g, "");
  const blocks = [...css.matchAll(/@media[^{]*prefers-contrast:\s*more[^{]*\{([\s\S]*?)\n\}/g)].map((m) => m[1]);
  const rule = blocks.join("\n").match(/\.city-panel[^{]*\{([^}]*)\}/);
  assert.ok(rule, ".city-panel in @media (prefers-contrast: more)");
  assert.match(rule[1], /background(-color)?:\s*var\(--panel\)\s*;/);
  assert.match(rule[1], /backdrop-filter:\s*none/);
});
