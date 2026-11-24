// The papers (app/city.css, from docs/city/style.md): three themes chosen
// by the picker on <html data-paper>, never by the system's appearance;
// every palette token is defined in its paper's block with the hex the
// style names; the texture is code (app/paper.css), glow is never relied
// on for contrast, and no Chinese or Japanese characters are in the source.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");

test("the layout loads city.css, city.css the paper, and none of the park", () => {
  const layout = read("app/layout.tsx");
  assert.match(layout, /import "\.\/city\.css"/);
  for (const gone of ["globals.css", "WorldShell", "SkyDriver", "world3d/World3D"]) assert.ok(!layout.includes(gone), gone);
  assert.match(read("app/city.css"), /^@import "tailwindcss";\n@import "\.\/paper\.css";/);
});

const PAPERS = ["cream", "charcoal", "kraft"];
const css = () => read("app/city.css");
// A paper's own token block (cream's selector is ":root,\n:root[data-paper="cream"]")
const block = (paper) => css().match(new RegExp(`\\n:root\\[data-paper="${paper}"\\] \\{([^}]*)\\}`))?.[1] ?? "";

test("three papers, picked on <html data-paper>, never by the system's appearance", () => {
  const text = css();
  assert.doesNotMatch(text, /prefers-color-scheme|light-dark\(/);
  assert.match(text, /\n:root,\n:root\[data-paper="cream"\] \{/, "cream is the default on :root");
  const schemes = { cream: "light", charcoal: "dark", kraft: "light" };
  for (const paper of PAPERS) assert.match(block(paper), new RegExp(`\\n\\s*color-scheme: ${schemes[paper]};`), `${paper}'s color-scheme`);
  // The picker's dots: each paper's base, whatever paper is on
  for (const paper of PAPERS) {
    const base = block(paper).match(/\n\s*--paper:\s*(#[0-9a-f]{6});/)?.[1];
    assert.match(text, new RegExp(`\\n\\s*--swatch-${paper}: ${base};`), `--swatch-${paper}`);
  }
});

test("every palette token in docs/city/style.md is defined in its paper's block with the same hex", () => {
  const style = read("docs/city/style.md");
  const palette = style.split("## Palette")[1].split(/\n## /)[0];
  for (const paper of PAPERS) {
    const table = palette.split(new RegExp(`\\n### ${paper}\\n`, "i"))[1]?.split(/\n### /)[0] ?? "";
    const rows = [...table.matchAll(/^\| `(--[a-z0-9-]+)` \| `(#[0-9a-f]{6})` \|/gim)];
    assert.ok(rows.length >= 12, `${paper}: the palette table was found (${rows.length} rows)`);
    const own = block(paper);
    for (const [, name, hex] of rows) {
      const value = own.match(new RegExp(`\\n\\s*${name}:\\s*(#[0-9a-f]{6});`, "i"))?.[1];
      assert.equal(value?.toLowerCase(), hex.toLowerCase(), `${paper}: ${name}`);
    }
  }
  const shared = css().match(/\n:root \{([^}]*)\}/)?.[1] ?? "";
  for (const name of ["--radius", "--font-display", "--font-text", "--ease-out", "--t-slow"]) assert.match(shared, new RegExp(`\\n\\s*${name}:`), `${name} on :root`);
});

test("the paper tokens are Tailwind colours, and the page's ground is the paper", () => {
  const text = css();
  for (const name of ["paper", "paper-2", "panel", "line", "text", "muted", "accent", "accent-2", "on-accent", "focus"]) assert.match(text, new RegExp(`--color-${name}: var\\(--${name}\\);`), name);
  assert.match(text.match(/\nhtml \{[^}]*\}/)[0], /background: var\(--paper\);/);
  assert.match(text.match(/\nbody \{[^}]*\}/)[0], /background: var\(--paper\);/);
});

test("the paper texture is drawn in code: no image file, a fixed seed, no motion, gone under prefers-contrast: more", () => {
  const paper = read("app/paper.css");
  const data = [...paper.matchAll(/url\("data:image\/svg\+xml,[^"]*"\)/g)];
  assert.equal(data.length, 2, "two inline SVGs: the light papers' sheet and charcoal's");
  assert.doesNotMatch(data.reduce((rest, [m]) => rest.replace(m, ""), paper), /url\(/, "and no other image");
  assert.match(paper, /feTurbulence/);
  assert.match(paper, /feDiffuseLighting/);
  // On near-black the creases are carried by light: a specular sheet, added in screen
  assert.match(paper, /:root\[data-paper="charcoal"\] body::before \{\s*background-image: url\("data:image\/svg\+xml,[^"]*feSpecularLighting[^"]*"\);\s*mix-blend-mode: screen;/);
  for (const m of paper.matchAll(/feTurbulence[^>]*>/g)) assert.match(m[0], /seed='\d+'/, "every noise has a fixed seed");
  assert.doesNotMatch(paper, /animation|transition|@keyframes/);
  assert.match(paper, /@media \(prefers-contrast: more\) \{[^}]*\{[^}]*display: none;/);
  assert.ok(Buffer.byteLength(paper) < 4000, `paper.css is small (${Buffer.byteLength(paper)} bytes)`);
});

test("glow is dropped for prefers-contrast: more", () => {
  // Within that block (it runs to the next line that closes a top-level rule)
  const block = read("app/city.css").match(/@media \(prefers-contrast: more\) \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(block, /--glow-cyan: 0 0 #0000/);
  // No text glows at all (the hero's name and the point marks lost theirs);
  // the one text-shadow is the panels' dark halo (city-track.css, Task 8),
  // ink, never a colour, and gone under prefers-contrast: more
  for (const f of ["app/city.css", "app/motion.css", "app/reveal.css"]) assert.doesNotMatch(read(f), /text-shadow/, f);
  const track = read("app/city-track.css");
  for (const m of track.matchAll(/text-shadow: ([^;]*);/g)) assert.ok(m[1] === "none" || m[1].match(/rgb\(([^)]*)\)/g).every((c) => c.startsWith("rgb(8 9 12 ")), m[0]);
  if (/text-shadow: (?!none)/.test(track)) assert.match(track.slice(track.indexOf("@media (prefers-contrast: more)")), /text-shadow: none;/);
  assert.doesNotMatch(read("app/city.css").match(/\.points > li::before \{[^}]*\}/)[0], /box-shadow/);
});

test("no Chinese or Japanese characters in app/ source", () => {
  // The scripts, and the punctuation and fullwidth forms they bring
  // (U+3000-303F, U+FF00-FFEF), which Unicode files under Common
  const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\u3000-\u303f\uff00-\uffef]/gu;
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (/\.(tsx?|css)$/.test(entry.name)) for (const ch of readFileSync(path, "utf8").match(cjk) ?? []) found.push(`${path.slice(root.length)}: ${ch}`);
    }
  };
  walk(`${root}app`);
  assert.deepEqual(found, []);
});

test("the paper is the only theme: no data-theme, no saved \"theme\", nothing keyed on the system's appearance", () => {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(`${root}${dir}`, { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (/\.(tsx?|css)$/.test(entry.name)) files.push(path);
    }
  };
  walk("app");
  assert.ok(files.includes("app/city.css") && files.includes("app/layout.tsx"), "the walk reached the shell");
  for (const file of files) {
    assert.ok(!/ThemeToggle/.test(file), `${file} is a theme toggle`);
    const text = read(file);
    assert.doesNotMatch(text, /prefers-color-scheme|light-dark\(|data-theme/, file);
    assert.doesNotMatch(text, /localStorage\.(get|set)Item\("theme"/, file);
  }
});

test("the home page has one h1: the name, in the hero", () => {
  const page = read("app/page.tsx");
  const hero = read("app/components/city2d/sections/Hero.tsx");
  assert.equal((page.match(/<h1[\s>]/g) ?? []).length, 0, "the page's h1 is the hero's");
  assert.equal((page.match(/<Hero \/>/g) ?? []).length, 1, "the page renders the hero once");
  assert.equal((hero.match(/<h1[\s>]/g) ?? []).length, 1);
  assert.match(hero, /<h1[^>]*>\{profile\.name\}<\/h1>/);
});

test("every colour and size the résumé viewer uses is defined by the city's stylesheet", () => {
  // resume.css loads with the viewer, over city.css: a token only the old
  // globals.css defined would leave the dialog without a surface or a
  // focus ring
  const resume = read("app/components/resume/resume.css");
  const city = read("app/city.css");
  const own = new Set([...resume.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
  own.add("--total-scale-factor"); // set by pdf.js on the text layer
  // Set at run time by the viewer itself, and only ever read with a fallback
  // (the dialog's origin: the link that opened it, else its centre)
  const viewer = read("app/components/resume/ResumeViewer.tsx");
  for (const [, name] of viewer.matchAll(/setProperty\("(--[a-z0-9-]+)"/g)) {
    assert.match(resume, new RegExp(`var\\(${name},`), `${name} is set by script, so it needs a fallback`);
    own.add(name);
  }
  const used = new Set([...resume.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]));
  for (const name of used) if (!own.has(name)) assert.match(city, new RegExp(`\\n\\s*${name}:`), `${name} isn't defined in city.css`);
  // The résumé link's "on its way" state (ResumeHost.tsx) is in city.css too
  assert.match(city, /a\[data-resume\]\[data-opening\] \{[^}]*cursor: progress/);
});

test("no magenta and no amber names; every paper has its accents", () => {
  const files = ["app/city.css", "app/paper.css"];
  const walk = (dir) => {
    for (const entry of readdirSync(`${root}${dir}`, { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (/\.tsx$/.test(entry.name)) files.push(path);
    }
  };
  walk("app");
  assert.ok(files.length > 10, "the walk reached the components");
  // Whole words
  for (const file of files) assert.doesNotMatch(read(file), /\b(magenta|amber)\b/i, file);
  for (const paper of PAPERS) for (const name of ["--accent", "--accent-hover", "--on-accent", "--accent-2", "--focus", "--shadow"]) assert.match(block(paper), new RegExp(`\\n\\s*${name}: #[0-9a-f]{6};`), `${paper}: ${name}`);
});
