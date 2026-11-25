// The glass buttons (city.css, .glass) and their press
// (components/ui/GlassPress.tsx): mounted once, light, never in the way.
// What it looks like and how it moves in a browser:
// docs/ui/scripts/glass-press.mjs and glass-contrast.mjs.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const css = readFileSync(`${root}app/city.css`, "utf8");
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
  // The give and the light start in the pointerdown itself (one frame)
  assert.match(press, /el\.setAttribute\("data-pressed", ""\);\s*el\.setAttribute\("data-held", ""\);/);
  assert.match(press, /addEventListener\("pointerup", letGo/, "the give lets go with the pointer");
  // A press again restarts the one animation instead of adding another
  assert.match(press, /removeAttribute\("data-pressed"\);\s*void el\.offsetWidth;/);
  assert.match(press, /"animationend"/);
  // Keyboard and assistive tech: a click with no pointer, from the middle
  assert.match(press, /event\.detail !== 0/);
});

test("the press: a give that is a transition, springing back; light that moves only scale, translate, rotate and opacity, within --t-slow", () => {
  // The give is a state, not a sequence: a second press turns it round
  assert.match(css, /:root:not\(\[data-still="on"\]\) \.glass\[data-held\]:not\(:is\(\.top-bar, \.sections-menu\) \*\) \{\s*scale: 0\.97;/);
  assert.match(css, /:root:not\(\[data-still="on"\]\) :where\(\.glass\) \{\s*transition:[^}]*scale var\(--t-slow\) var\(--ease-spring\)/);
  assert.doesNotMatch(css, /@keyframes glass-press/, "no keyframed give");
  for (const name of ["glass-ripple", "glass-sheen"]) {
    const body = keyframes(name);
    assert.ok(body, `@keyframes ${name}`);
    const props = [...body.matchAll(/([a-z-]+):/g)].map((m) => m[1]);
    for (const prop of props) assert.ok(["scale", "translate", "rotate", "opacity"].includes(prop), `${name} animates ${prop}`);
  }
  const layers = [...css.matchAll(/animation: glass-(?:ripple|sheen) ([^;]*);/g)];
  assert.equal(layers.length, 2, "the ripple and the sheen");
  for (const [, value] of layers) assert.match(value, /^var\(--t-slow\) var\(--ease-[a-z-]+\)$/, "one --t-slow, no delay");
});

test("still view and reduced motion get a moment of tint, not movement", () => {
  assert.match(css, /:root\[data-still="on"\] \.glass\[data-pressed\],\s*:root :is\(\.top-bar, \.sections-menu\) \.glass\[data-pressed\] \{\s*animation: glass-tint [^;]*;/);
  assert.match(css, /:root\[data-still="on"\] \.glass::before,\s*:root\[data-still="on"\] \.glass::after,/);
  assert.match(css, /\.glass::after,\s*:is\(\.top-bar, \.sections-menu\) \.glass::before,\s*:is\(\.top-bar, \.sections-menu\) \.glass::after \{\s*display: none;/);
});

test("the keys used most (the top bar's, the Sections menu's) get the tint at once: no give, no light", () => {
  // Excluded from the give; the tint and no ripple or sheen, motion or not
  assert.match(css, /\.glass\[data-held\]:not\(:is\(\.top-bar, \.sections-menu\) \*\)/);
  assert.match(css, /:root :is\(\.top-bar, \.sections-menu\) \.glass\[data-pressed\] \{\s*animation: glass-tint/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*:root:not\(\[data-still\]\) \.glass\[data-pressed\] \{\s*animation: glass-tint/);
  assert.doesNotMatch(keyframes("glass-tint"), /scale|translate|transform/);
});

test("a key is 44px tall, opaque paper with labels in opaque --text, no blur", () => {
  // In :where(), so a control's own class sets its size and type over it
  const glass = block(":where(.glass)");
  assert.match(glass, /min-height: 44px/);
  assert.match(glass, /color: var\(--glass-ink, var\(--text\)\)/);
  assert.match(glass, /border-radius: var\(--radius\)/);
  assert.match(glass, /background: var\(--tint, var\(--panel\)\)/);
  assert.match(glass, /border: 1px solid var\(--key-edge, color-mix\(in srgb, var\(--text\) 40%, var\(--panel\)\)\)/);
  assert.doesNotMatch(glass, /backdrop-filter/, "paper is never see-through");
  const primary = block(".glass-primary");
  assert.match(primary, /--tint: var\(--accent\);\s*--glass-ink: var\(--on-accent\);/);
  // The press layers sit under the label and inside the button
  assert.match(glass, /overflow: hidden/);
  assert.match(glass, /isolation: isolate/);
  assert.match(block(".glass::before,\n.glass::after"), /z-index: -1/);
});

test("the primary key's face: one grain in code over each paper's accent fill, kept on hover, dropped when chosen or for more contrast", () => {
  const root = css.match(/\n:root \{([^}]*)\}/)?.[1] ?? "";
  const grain = root.match(/--key-grain: url\("data:image\/svg\+xml,([^"]*)"\);/)?.[1];
  assert.ok(grain, "one inline SVG grain on :root");
  assert.match(grain, /feTurbulence[^>]*seed='\d+'/, "a fixed seed");
  for (const paper of ["cream", "charcoal", "kraft"]) {
    const own = css.match(new RegExp(`\\n:root\\[data-paper="${paper}"\\] \\{([^}]*)\\}`))?.[1] ?? "";
    assert.match(own, /\n\s*--accent-fill: [^;]*linear-gradient\(/, `${paper}: --accent-fill`);
  }
  const primary = block(".glass-primary");
  assert.match(primary, /background-image: var\(--key-grain\), var\(--key-wash, [^)]*\)\), var\(--accent-fill\);/);
  assert.match(primary, /background-blend-mode: soft-light, normal/);
  assert.match(css, /\.glass-primary:not\(:disabled, \[aria-disabled="true"\]\):hover \{\s*--key-wash: linear-gradient\(/, "hover washes the face, the grain kept");
  const chosen = css.match(/\n\.glass:is\(\[aria-pressed="true"\][^{]*\{([^}]*)\}/)?.[1] ?? "";
  assert.match(chosen, /background-image: none/);
  assert.match(css, /@media \(prefers-contrast: more\), \(forced-colors: active\) \{\s*\.glass-primary \{\s*background-image: none;/);
  assert.match(keyframes("glass-tint"), /background-image: none/);
});

// Every button-like control is glass, so it shares the states and the press
test("the Sections menu's entries and the top bar's keys are glass", () => {
  const menu = readFileSync(`${root}app/components/city2d/SectionsMenu.tsx`, "utf8").match(/<nav [^>]*id="places-menu"[\s\S]*?<\/nav>/)[0];
  // (the menu's rows are plain rows, V13: tests/city-menu.test.mjs pins their style)
  assert.equal((menu.match(/<Link [^>]*className="sections-menu-sub"/g) ?? []).length, 1, "one entry per section's part (Skills)");
  // On the one page an entry is a jump within it, so where you are comes
  // from the scroll
  assert.match(menu, /aria-current=\{s\.id === here \? "location" : undefined\}/);
  assert.equal((menu.match(/onClick=\{go\((s\.href|jumpHref\(s\.href\)|sub\.href)\)\}/g) ?? []).length, 2, "every entry jumps and hands focus on");
  const bar = readFileSync(`${root}app/components/city2d/TopBar.tsx`, "utf8");
  assert.match(bar, /<button type="button" popoverTarget="places-menu" className="glass top-bar-sections">/);
});

test("the states: chosen, disabled and focus, the same on every glass control", () => {
  const chosen = css.match(/\n\.glass:is\(\[aria-pressed="true"\], \[aria-selected="true"\], \[aria-current="page"\], \[aria-current="location"\], \[aria-expanded="true"\], \[data-copied\]\),?[^{]*\{([^}]*)\}/)?.[1];
  assert.ok(chosen, "one rule for every chosen state");
  assert.match(chosen, /border-color: var\(--accent-2\)/);
  // Pressed in: a shade inside, a doubled edge. Not colour alone.
  assert.match(chosen, /--glass-in: inset 0 0 0 1px var\(--accent-2\), inset/);
  // Pressed in, so nothing lifts it off the paper
  assert.match(chosen, /--glass-lift: 0 0 #0000/);
  // The old city aliases are gone: every rule reads the paper tokens
  assert.doesNotMatch(css, /--(cyan|ink-2|seam(-2)?|glow-cyan|focus-halo|glass-(tint|chosen|border|fallback))\b/);
  const disabled = block('.glass:is(:disabled, [aria-disabled="true"])');
  assert.match(disabled, /border-style: dashed/);
  assert.match(disabled, /cursor: default/);
  assert.match(disabled, /color: var\(--muted\)/);
  assert.match(css, /:where\(\.glass:not\(:disabled, \[aria-disabled="true"\]\)\):hover/, "no hover on a disabled control");
  const focus = block(".glass:focus-visible");
  assert.match(focus, /--glass-out: 0 0 0 6px color-mix\(in srgb, var\(--paper\) 90%, transparent\)/);
  assert.match(focus, /outline: 2px solid var\(--focus\)/);
  // The press never lands on a disabled control
  assert.match(press, /if \(el\.matches\(":disabled, \[aria-disabled='true'\]"\)\) return;/);
});
