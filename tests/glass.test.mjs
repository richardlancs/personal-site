// The glass buttons (globals.css, .glass) and their press
// (components/ui/GlassPress.tsx): mounted once, light, never in the way.
// What it looks like and how it moves in a browser:
// docs/ui/scripts/glass-press.mjs and glass-contrast.mjs.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const css = readFileSync(`${root}app/globals.css`, "utf8");
const press = readFileSync(`${root}app/components/ui/GlassPress.tsx`, "utf8");
const keyframes = (name) => css.match(new RegExp(`@keyframes ${name} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? "";
const block = (selector) => css.match(new RegExp(`\\n${selector.replace(/[.:()[\]"=]/g, "\\$&")} \\{([^}]*)\\}`))?.[1] ?? "";

test("the press is mounted once, for the whole page", () => {
  const layout = readFileSync(`${root}app/layout.tsx`, "utf8");
  assert.equal((layout.match(/<GlassPress \/>/g) ?? []).length, 1);
  assert.match(press, /^"use client";/);
  assert.match(press, /closest<HTMLElement>\("\.glass"\)/, "it finds any .glass element");
});

test("the press never delays the action, and never piles up", () => {
  assert.doesNotMatch(press, /preventDefault|stopPropagation|setTimeout|setInterval|requestAnimationFrame/);
  assert.match(press, /addEventListener\("pointerdown", onPointerDown, \{ capture: true, passive: true \}\)/);
  // A press again restarts the one animation instead of adding another
  assert.match(press, /removeAttribute\("data-pressed"\);\s*void el\.offsetWidth;/);
  assert.match(press, /"animationend"/);
  // Keyboard and assistive tech: a click with no pointer, from the middle
  assert.match(press, /event\.detail !== 0/);
});

test("the press moves only scale, translate and opacity, and settles within 0.45s", () => {
  for (const name of ["glass-press", "glass-ripple", "glass-sheen"]) {
    const body = keyframes(name);
    assert.ok(body, `@keyframes ${name}`);
    const props = [...body.matchAll(/([a-z-]+):/g)].map((m) => m[1]);
    for (const prop of props) assert.ok(["scale", "translate", "opacity", "animation-timing-function"].includes(prop), `${name} animates ${prop}`);
  }
  const layers = [...css.matchAll(/animation: glass-(?:press|ripple|sheen) ([0-9.]+)s [^;]*?(?: ([0-9.]+)s)?;/g)];
  assert.equal(layers.length, 3, "the button, its ripple and its sheen");
  for (const [, seconds, delay = "0"] of layers) assert.ok(Number(seconds) + Number(delay) <= 0.45, `a press layer runs ${seconds}s + ${delay}s`);
});

test("still view and reduced motion get a moment of tint, not movement", () => {
  assert.match(css, /:root\[data-still="on"\] \.glass\[data-pressed\] \{\s*animation: glass-tint [^;]*;/);
  assert.match(css, /:root\[data-still="on"\] \.glass::before,\s*:root\[data-still="on"\] \.glass::after \{\s*display: none;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*:root:not\(\[data-still\]\) \.glass\[data-pressed\] \{\s*animation: glass-tint/);
  assert.doesNotMatch(keyframes("glass-tint"), /scale|translate|transform/);
});

test("glass is 44px tall, with labels in opaque slate, and a fallback without blur", () => {
  // In :where(), so a control's own class sets its size and type over it
  const glass = block(":where(.glass)");
  assert.match(glass, /min-height: 44px/);
  assert.match(glass, /color: var\(--slate\)/);
  assert.match(glass, /backdrop-filter: var\(--glass-blur\)/);
  assert.match(css, /@supports not \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\) \{\s*\.glass \{\s*background-color: var\(--glass-fallback\)/);
  // The press layers sit under the label and inside the button
  assert.match(glass, /overflow: hidden/);
  assert.match(glass, /isolation: isolate/);
  assert.match(block(".glass::before,\n.glass::after"), /z-index: -1/);
});

test("over the world, the corner controls' glass thickens under a dark sky", () => {
  const dark = css.match(/:root:has\(\.world3d\[data-sky-daylight="night"\]\),\s*:root:has\(\.world3d\[data-sky-daylight="dusk"\][^{]*\{\s*& :is\(\.world-controls > \.glass, \.world-controls-end \.glass, \.bench-tab, \.cabinet-button, \.park-actions \.glass:not\(\.glass-primary\)\) \{\s*--tint: rgb\(247 251 255 \/ (0\.\d+)\)/);
  assert.ok(dark, "no dark-sky rule for the corner controls");
  assert.ok(Number(dark[1]) >= 0.85, `dark-sky glass is only ${dark[1]}`);
});

// Every button-like control is glass, so it shares the states and the press
test("the tabs, choices, page turns, thumbnails and menu entries are glass", () => {
  const files = {
    "locations/Workbench.tsx": ["glass bench-tab", "glass shot-thumb"],
    "locations/Cabinets.tsx": ["glass cabinet-button"],
    "locations/Timetable.tsx": ["glass timetable-line"],
    "locations/Notebook.tsx": ["glass notebook-turn"],
  };
  for (const [file, classes] of Object.entries(files)) {
    const src = readFileSync(`${root}app/components/${file}`, "utf8");
    for (const name of classes) assert.ok(src.includes(`className="${name}"`), `${file}: ${name}`);
  }
  const menu = readFileSync(`${root}app/components/world/WorldControls.tsx`, "utf8").match(/<nav id="places-menu"[\s\S]*?<\/nav>/)[0];
  assert.equal((menu.match(/<Link [^>]*className="glass"/g) ?? []).length, 2, "the Sections slip's entries");
  // Nothing of their old surfaces is left to fight the glass
  for (const name of ["bench-tab", "cabinet-button", "timetable-line", "notebook-turn", "shot-thumb"])
    for (const [, body] of css.matchAll(new RegExp(`\\n\\s*\\.${name}(?:\\[[^\\]]*\\])?(?::[a-z-]+)? \\{([^}]*)\\}`, "g")))
      assert.doesNotMatch(body, /(?:^|\n)\s*(?:background|border|box-shadow|transform|opacity)(?:-[a-z]+)?:/, `.${name} sets its own surface`);
});

test("the states: chosen, disabled and focus, the same on every glass control", () => {
  const chosen = css.match(/\n\.glass:is\(\[aria-pressed="true"\], \[aria-selected="true"\], \[aria-current="page"\], \[data-copied\]\),[^{]*\{([^}]*)\}/)?.[1];
  assert.ok(chosen, "one rule for every chosen state");
  assert.match(chosen, /border-color: var\(--focus-blue\)/);
  // Pressed in: a shade inside, no lift. Not colour alone.
  assert.match(chosen, /--glass-in: inset 0 0 0 1px var\(--focus-blue\), inset/);
  assert.match(chosen, /--glass-lift: 0 0 #0000/);
  const disabled = block('.glass:is(:disabled, [aria-disabled="true"])');
  assert.match(disabled, /border-style: dashed/);
  assert.match(disabled, /cursor: default/);
  assert.match(disabled, /color: var\(--muted\)/);
  assert.match(css, /:where\(\.glass:not\(:disabled, \[aria-disabled="true"\]\)\):hover/, "no hover on a disabled control");
  const focus = block(".glass:focus-visible");
  assert.match(focus, /--glass-out: var\(--focus-halo\)/);
  assert.match(focus, /outline: 2px solid var\(--focus-blue\)/);
  // The press never lands on a disabled control
  assert.match(press, /if \(el\.matches\(":disabled, \[aria-disabled='true'\]"\)\) return;/);
});
