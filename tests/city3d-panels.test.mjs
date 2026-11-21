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

test("Escape goes back to Home once, from the panel (so also where the scene isn't drawing), never on home or over a menu or the résumé", () => {
  // CityPanel.tsx comes after the page is up (CityAfter.tsx), drawing or
  // not; City3D.tsx no longer adds a second (Task 19 review, a11y M1)
  const panel = code(read(`${panels}/CityPanel.tsx`));
  assert.match(panel, /e\.key !== "Escape"/);
  assert.match(panel, /if \(!section \|\| section === "home"\) return;/);
  assert.match(panel, /resume-lock/);
  assert.match(panel, /:popover-open, dialog\[open\]/);
  assert.match(panel, /router\.push\(cityPath\("home"\)\)/);
  assert.doesNotMatch(code(read("app/components/city3d/City3D.tsx")), /"Escape"/);
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
  // newest first, sorted on the server and handed to the row (CityPage.tsx)
  assert.match(read("app/components/city3d/CityPage.tsx"), /sortNewestFirst\(experience\)/);
  assert.match(lines, /lines\.map\(/);
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

test("Projects: the project on the screen is current in the panel's index, and a key brings its write-up into view on the narrow layout only (Task 19 review, ux I2)", () => {
  const src = read("app/components/city3d/panels/ScreenPicker.tsx");
  assert.match(src, /nav\[aria-label="Projects"\] a\[href\^="#"\]/);
  assert.match(src, /link\.setAttribute\("aria-current", "true"\)/);
  assert.match(src, /link\.removeAttribute\("aria-current"\)/);
  // the key keeps focus (no .focus in choose), the wide layout's page stays put, still view jumps
  assert.match(src, /function choose\(index: number\) \{\s*known\.current = index;\s*show\(index\);\s*if \(!isFlat\(\)\) return;\s*document\.getElementById\(slug\(titles\[index\]\)\)\?\.scrollIntoView\(\{ block: "start", behavior: world\.get\(\)\.still \? "auto" : "smooth" \}\);\s*\}/);
  const css = read("app/city/city-pages.css");
  // not by colour alone: a bar beside the row and a heavier underline
  assert.match(css, /nav\[aria-label="Projects"\] a\[aria-current="true"\]::before \{[^}]*width: 3px;/);
  assert.match(css, /a\[aria-current="true"\] \.font-display \{\s*text-decoration-thickness: 2px;/);
  // the 2D page's index is untouched
  assert.doesNotMatch(read("app/components/city2d/sections/Projects.tsx"), /aria-current/);
});

test("the scene keys named in the districts' defs are the ones the pickers write", () => {
  assert.match(read("app/components/city3d/districts/towers.def.ts"), /"screen-<n>"/);
  assert.match(read("app/components/city3d/districts/metro.def.ts"), /"line-<n>"/);
  assert.match(read("app/components/city3d/districts/nanjing-road.def.ts"), /"machine"/);
});

test("CityPage keeps the section's words with where=\"3d\" and puts the panel's behaviour after the heading", () => {
  const page = code(read("app/components/city3d/CityPage.tsx"));
  for (const name of ["Hero", "About", "Projects", "Experience", "Interests", "Contact"]) assert.match(page, new RegExp(`<${name} where="3d" />`), name);
  // The picker's slot, with what it lists, straight after the heading; the
  // panel's behaviour comes after the page is up, with the 3D city's shell
  // (CityLoader.tsx), never in /city's first load
  assert.match(page, /import type \{ Picks \} from "\.\/panels\/CityPanel";/);
  assert.doesNotMatch(page, /import CityPanel/);
  assert.match(page, /<\/h1>\s*\)\}\s*\{id in picks && \([\s\S]*?<div className="city-picker-slot" data-picks=\{JSON\.stringify\(picks\[id as keyof Picks\]\)\}>\s*<PickerGhost id=\{id as keyof Picks\} picks=\{picks\} \/>\s*<p className="city-picker-off">[^<]*<\/p>\s*<\/div>\s*\)\}\s*\{content\[id\]\}/);
  assert.match(read("app/components/city3d/CityLoader.tsx"), /const CityAfter = lazy\(\(\) => import\("\.\/CityAfter"\)\);/);
  assert.match(read("app/components/city3d/CityAfter.tsx"), /import CityPanel from "\.\/panels\/CityPanel";/);
  // The pickers import no data: the portfolio's data stays out of every
  // chunk the 2D page shares with them
  for (const name of ["ScreenPicker", "BoardLines", "ArcadeControls", "CityPanel"]) assert.doesNotMatch(code(read(`${panels}/${name}.tsx`)), /import \{[^}]*\} from "\.\.\/\.\.\/\.\.\/data\/portfolio"/, name);
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

test("under prefers-contrast: more the panel is opaque", () => {
  const css = panelCss().replace(/\/\*[\s\S]*?\*\//g, "");
  const blocks = [...css.matchAll(/@media[^{]*prefers-contrast:\s*more[^{]*\{([\s\S]*?)\n\}/g)].map((m) => m[1]);
  const rule = blocks.join("\n").match(/\.city-panel[^{]*\{([^}]*)\}/);
  assert.ok(rule, ".city-panel in @media (prefers-contrast: more)");
  assert.match(rule[1], /background(-color)?:\s*var\(--panel\)\s*;/);
  assert.match(rule[1], /backdrop-filter:\s*none/);
});

test("the arcade: one choice, the store's: the panel's open interest follows the visitor's choice, and opening a row chooses it; the idle cycle drives the machine only", () => {
  const src = read("app/components/city3d/panels/ArcadeControls.tsx");
  assert.match(src, /querySelectorAll<HTMLDetailsElement>\('details\[name="interests"\]'\)/);
  assert.match(src, /row\.open = index === selected/);
  assert.match(src, /if \(!row\.open\) return;\s*chosenByVisitor\(rows\.indexOf\(row\)\);\s*world\.select\("interest", rows\.indexOf\(row\)\)/);
  // the idle cycle's choice never reaches the panel's rows (Task 19 review, a11y I1)
  assert.match(src, /idleChoice = \(world\.get\(\)\.sel\.interest \+ 1\) % interests\.length;\s*world\.select\("interest", idleChoice\)/);
  assert.match(src, /if \(selected !== idleChoice\) chosenByVisitor\(selected\)/);
  assert.match(src, /function chosenByVisitor\(index: number\) \{\s*idleChoice = -1;\s*showInPanel\(index\);/);
  assert.match(src, /function choose\(index: number\) \{\s*chosenByVisitor\(index\);/);
  // reading counts as touched: wheel, touch, and once arrived scroll and focus
  assert.match(src, /\["pointerdown", "keydown", "wheel", "touchstart", \.\.\.\(arrived \? \["scroll", "focusin"\] : \[\]\)\]/);
  // the list itself is the 2D page's, unchanged
  assert.match(read("app/components/city2d/sections/Interests.tsx"), /name="interests"/);
});

test("interestPhotos reads public/interests/ without tracing the whole project (the build's two warnings)", () => {
  const src = read("app/lib/interestPhotos.ts");
  assert.match(src, /path\.join\(\/\* turbopackIgnore: true \*\/ process\.cwd\(\), "public", "interests"\)/);
  assert.match(src, /readdirSync\(\/\* turbopackIgnore: true \*\/ path\.join\(baseDir, scene\)\)/);
});

test("the picker's slot holds an unseen, unreachable copy of its row, so the panel doesn't move when the row comes or goes (Task 19)", () => {
  const ghost = read(`${panels}/PickerGhost.tsx`);
  assert.doesNotMatch(ghost, /^"use client";/, "drawn on the server");
  assert.equal((ghost.match(/data-ghost="" aria-hidden="true" inert/g) ?? []).length, 3, "one per picker, unseen and inert");
  // The same keys as the real rows
  for (const picker of ["screens", "lines", "arcade"]) assert.match(ghost, new RegExp(`data-picker="${picker}"`));
  const css = read("app/city/city-pages.css");
  assert.match(css, /\.city-picker\[data-ghost\] \{\s*visibility: hidden;/);
  assert.match(css, /html:not\(\[data-still\]\) \.city-picker\[data-ghost\],\s*\.city-picker-slot:has\(> \.city-picker:not\(\[data-ghost\]\)\) > \.city-picker\[data-ghost\] \{\s*display: none;/);
  // One cell: the copy, the row and the line stacked, so the room is kept
  // without :has() too; the fallback keeps it, filled by a line (Task 19's
  // open fallback shift)
  assert.match(css, /\.city-picker-slot \{\s*display: grid;\s*\}\s*\.city-picker-slot > \* \{\s*grid-area: 1 \/ 1;/);
  assert.doesNotMatch(css, /html\[data-city3d="fallback"\] \.city-picker\[data-ghost\]/);
  assert.match(css, /html:is\(\[data-city3d="fallback"\], \[data-city3d="lost"\], \[data-city3d="saving"\]\) \.city-picker-off \{\s*display: block;/);
  assert.match(read("app/components/city3d/CityPage.tsx"), /<PickerGhost id=\{id as keyof Picks\} picks=\{picks\} \/>\s*<p className="city-picker-off">/);
  assert.doesNotMatch(css, /\.city-picker-slot \{\s*min-height/);
});

test("a city page's band has its painting before the scripts, from the file its own <img> will ask for (Task 19)", () => {
  const page = read("app/components/city3d/CityPage.tsx");
  assert.match(page, /<DistrictBand district=\{s\.district\} \/>\s*\{\/\*[\s\S]*?\*\/\}\s*<div hidden dangerouslySetInnerHTML=\{\{ __html: `<script>\$\{plateScript\(id, s\.district\)\}<\/script>` \}\} \/>/);
  // never a <script> element React renders (it warns on a client navigation, fix round A)
  assert.doesNotMatch(page, /<script dangerouslySetInnerHTML/);
  assert.match(page, /getImageProps\(\{ src: plate, alt: "", fill: true, sizes: BELOW_SIZES \}\)/);
  const preload = read("app/lib/platePreload.ts");
  assert.match(preload, /export function cityPlateScript\(/);
  // a rule of its own in <head>, keyed by the page, never the band's own style (React's: a hydration mismatch)
  assert.match(preload, /document\.createElement\("style"\)/);
  assert.match(preload, /\.city-page\[data-section=\$\{q\(section\)\}\] \.city-band \.band\{--city-plate:url\(/);
  assert.doesNotMatch(preload, /previousElementSibling|\.style\.setProperty\("--city-plate"/);
  assert.match(read("app/city/city-pages.css"), /background-image: var\(--city-plate, none\)/);
});

test("forced colours: a focused place tag gets a two-colour ring that holds over the unforced scene (Task 19 review, a11y I3)", () => {
  const css = read("app/city/city-pages.css");
  assert.match(css, /@media \(forced-colors: active\) \{\s*\.city-tag:focus-visible \{\s*outline: 3px solid CanvasText;\s*box-shadow: 0 0 0 6px Canvas;\s*forced-color-adjust: none;/);
});

test("every section's page has a way back to Home in words at its foot (Task 19 review, a11y M1)", () => {
  const page = read("app/components/city3d/CityPage.tsx");
  assert.match(page, /\{id !== "home" && \(\s*<>\s*<p className="city-panel-foot">[\s\S]*?<Link href=\{cityPath\("home"\)\} className="text-link text-link-solo">\s*Back to Home\s*<\/Link>/);
});

test("Home's card holds nothing but the card: no 2D link, the credit a line of its own after the panel (fix round A, ux I2)", () => {
  const page = read("app/components/city3d/CityPage.tsx");
  const panel = page.slice(page.indexOf('<div className="city-panel">'), page.indexOf("{id === \"home\" && (\n        <footer"));
  // the foot and the colophon only on the sections' pages
  assert.match(panel, /\{id !== "home" && \(\s*<>\s*<p className="city-panel-foot">[\s\S]*<footer className="city-colophon">\s*<Colophon \/>\s*<\/footer>\s*<\/>\s*\)\}\s*<\/div>/);
  assert.match(page, /\{id === "home" && \(\s*<footer className="city-colophon city-credit">\s*<Colophon \/>\s*<\/footer>\s*\)\}/);
});

test("the place dock lists the places in the registry's order, as the Sections menu does, on every page; Home's row of keys is gone (Task 19 review, ux M3; painted 2.5D Task 2)", () => {
  const dock = read("app/components/city3d/panels/PlaceDock.tsx");
  assert.match(dock, /const places = listed;/);
  assert.doesNotMatch(dock, /\.sort\(/);
  assert.match(read("app/components/city2d/SectionsMenu.tsx"), /listed\.map\(/);
  assert.doesNotMatch(read("app/components/city3d/CityPage.tsx"), /city-keys/);
});

test("the dock is the same whether the scene draws or not: no rule keyed on the canvas's state moves it (no shift when the fallback is decided)", () => {
  const css = read("app/city/city-pages.css");
  assert.doesNotMatch(css, /data-city3d[^{]*\.place-dock/);
  assert.doesNotMatch(css, /data-city-tags[^{]*\.place-dock/);
});
