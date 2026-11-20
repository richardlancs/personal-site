// Interaction motion (docs/ui/ux-motion-principles.md): one set of tokens
// in city.css, used everywhere; motion only where it's welcome; nothing
// loops; the press answers in the pointerdown; the shake only on failure.
// How it looks, frame by frame: .superpowers/sdd/…/task-MA/frames.mjs.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const read = (file) => readFileSync(`${root}${file}`, "utf8");
const city = read("app/city.css");
const motion = read("app/motion.css");
const resume = read("app/components/resume/resume.css");
const press = read("app/components/ui/GlassPress.tsx");
const copy = read("app/components/city2d/sections/CopyButton.tsx");
const sheets = { "app/city.css": city, "app/motion.css": motion, "app/components/resume/resume.css": resume };
const uncomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

test("the seven motion tokens are in city.css with their values", () => {
  const rootBlock = city.match(/\n:root \{([\s\S]*?)\n\}/)[1];
  for (const [name, value] of [
    ["--ease-out", "cubic-bezier(0.22, 1, 0.36, 1)"],
    ["--ease-in-out", "cubic-bezier(0.65, 0, 0.35, 1)"],
    ["--ease-spring", "cubic-bezier(0.34, 1.56, 0.64, 1)"],
    ["--t-fast", "120ms"],
    ["--t-base", "200ms"],
    ["--t-slow", "280ms"],
    ["--stagger", "60ms"],
  ])
    assert.ok(rootBlock.includes(`${name}: ${value};`), `${name}: ${value}`);
  // One spring, the cubic-bezier (a linear() refinement was cut for the
  // CSS budget: the overshoot looks the same)
  assert.doesNotMatch(city, /--ease-spring: linear\(/);
});

test("no transition or animation writes a duration or a curve of its own", () => {
  for (const [file, css] of Object.entries(sheets)) {
    const decls = [...uncomment(css).matchAll(/(?:^|[;{\s])((?:transition|animation)(?:-[a-z-]+)?)\s*:\s*([^;{}]+);/g)];
    assert.ok(decls.length > 0, `${file} has motion`);
    for (const [, prop, value] of decls) {
      if (/^(transition|animation)-(property|name|behavior|fill-mode|iteration-count|direction|play-state|composition|timeline|range.*)$/.test(prop)) continue;
      assert.doesNotMatch(value.replace(/\b0m?s\b/g, ""), /\d(?:\.\d+)?m?s\b/, `${file}: ${prop}: ${value}`);
      assert.doesNotMatch(value, /cubic-bezier|(?<!-)\b(?:linear|ease(?:-in|-out|-in-out)?)\b(?!-)/, `${file}: ${prop}: ${value}`);
    }
  }
});

test("every transition and animation in motion.css is behind the reduced-motion and still-view guard", () => {
  const css = uncomment(motion);
  const guard = /@media \(prefers-reduced-motion: no-preference\)(?: and \(hover: hover\))? \{/g;
  // Cut the guarded blocks out (balanced braces), then nothing may move
  let outside = css;
  for (const m of [...css.matchAll(guard)].reverse()) {
    let depth = 0;
    let end = m.index + m[0].length - 1;
    for (; end < css.length; end++) {
      if (css[end] === "{") depth++;
      else if (css[end] === "}" && --depth === 0) break;
    }
    const block = css.slice(m.index, end + 1);
    for (const rule of block.matchAll(/([^{}]+)\{[^{}]*\b(?:transition|animation)\b/g)) assert.match(rule[1], /:root:not\(\[data-still="on"\]\)/, rule[1].trim());
    outside = outside.slice(0, m.index) + outside.slice(end + 1);
  }
  assert.doesNotMatch(outside, /\b(?:transition|animation)\s*:/);
});

test("nothing loops", () => {
  for (const [file, css] of Object.entries(sheets)) assert.doesNotMatch(uncomment(css), /\binfinite\b/, file);
});

test("the press answers in the pointerdown", () => {
  assert.match(press, /addEventListener\("pointerdown", onPointerDown/);
  const down = press.slice(press.indexOf("const onPointerDown"), press.indexOf("const onPointerCancel"));
  assert.match(down, /press\(el, event\.clientX, event\.clientY\)/);
  // No delay on the pressed state
  assert.doesNotMatch(city, /data-held\][^{]*\{[^}]*transition-delay/);
});

test("the shake exists and is used only on a failed copy", () => {
  assert.match(motion, /@keyframes copy-shake \{[^]*?translate: -6px 0/);
  const uses = [...uncomment(motion + city + resume).matchAll(/([^{};]+)\{[^}]*animation:\s*copy-shake/g)];
  assert.equal(uses.length, 1);
  assert.match(uses[0][1], /\[data-shake\]/);
  // data-shake is set only in the catch (the failure)
  const failure = copy.slice(copy.indexOf("catch {"));
  assert.match(failure.slice(0, failure.indexOf("\n    }\n")), /setAttribute\("data-shake", ""\)/);
  assert.equal((copy.match(/setAttribute\("data-shake"/g) ?? []).length, 1);
});

test("the Sections menu grows from its key, opens slower than it closes, and is a transition", () => {
  assert.match(city, /\.sections-menu \{[^}]*transform-origin: top right;[^}]*transition:[^}]*var\(--t-fast\)[^}]*allow-discrete/);
  assert.match(city, /\.sections-menu:popover-open \{[^}]*transition-duration: var\(--t-base\)/);
  assert.match(city, /@starting-style \{\s*:root:not\(\[data-still="on"\]\) \.sections-menu:popover-open/);
  assert.doesNotMatch(city, /@keyframes menu-in/);
  assert.match(city, /\.sections-menu \{[^}]*overscroll-behavior: contain/);
  assert.match(resume, /\.resume \{[^}]*overscroll-behavior: contain/);
});

test("the résumé opens from its link", () => {
  assert.match(resume, /transform-origin: var\(--resume-from, 50% 50%\)/);
  assert.match(read("app/components/resume/ResumeViewer.tsx"), /setProperty\("--resume-from"/);
});

test("a copy's success is one signal set: the chosen key with its tick, and \"Copied\" said once, in the status line", () => {
  const code = copy.replace(/^\s*\/\/.*$/gm, "");
  assert.equal((code.match(/"Copied"/g) ?? []).length, 1, "the word once");
  assert.doesNotMatch(copy, /\{copied \? "Copied"/, "the key keeps its label");
  assert.doesNotMatch(motion, /contact-address|:has\(/, "no ring on the address");
  // The shake is only set where it can play, so it never waits in still view
  assert.match(copy, /matchMedia\("\(prefers-reduced-motion: no-preference\)"\)\.matches && document\.documentElement\.dataset\.still !== "on"/);
});
