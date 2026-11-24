// The city's one dark theme (app/city.css, from docs/city/style.md): the
// layout loads it and nothing of the park, every palette token is defined
// with the hex the style names, glow is never relied on for contrast, and
// no Chinese or Japanese characters are in the source.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");

test("the layout loads city.css and none of the park", () => {
  const layout = read("app/layout.tsx");
  assert.match(layout, /import "\.\/city\.css"/);
  for (const gone of ["globals.css", "WorldShell", "SkyDriver", "world3d/World3D"]) assert.ok(!layout.includes(gone), gone);
});

test("one dark theme: no prefers-color-scheme, no light-dark(), no theme toggle", () => {
  const css = read("app/city.css");
  assert.ok(!/prefers-color-scheme|light-dark\(/.test(css));
  assert.match(css, /:root \{[^}]*color-scheme: dark;/, "the browser is told the page is dark");
  const layout = read("app/layout.tsx");
  assert.match(layout, /colorScheme: "dark"/);
  assert.doesNotMatch(layout, /data-theme|ThemeToggle/);
});

test("every palette token in docs/city/style.md is defined in city.css with the same hex", () => {
  const style = read("docs/city/style.md");
  const rows = [...style.matchAll(/^\| `(--[a-z0-9-]+)` \| `(#[0-9a-f]{6})` \|/gim)];
  assert.ok(rows.length >= 10, `the palette table was found (${rows.length} rows)`);
  const css = read("app/city.css");
  const rootBlock = css.match(/\n:root \{([^}]*)\}/)?.[1] ?? "";
  for (const [, name, hex] of rows) {
    const value = rootBlock.match(new RegExp(`\\n\\s*${name}:\\s*(#[0-9a-f]{6});`, "i"))?.[1];
    assert.equal(value?.toLowerCase(), hex.toLowerCase(), `${name} on :root`);
  }
  for (const name of ["--radius", "--font-display", "--font-text"]) assert.match(rootBlock, new RegExp(`\\n\\s*${name}:`), `${name} on :root`);
  // themeColor is the page's ground
  const ink = rows.find(([, name]) => name === "--ink")[2];
  assert.match(read("app/layout.tsx"), new RegExp(`themeColor: "${ink}"`, "i"));
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
  assert.match(track.slice(track.indexOf("@media (prefers-contrast: more)")), /text-shadow: none;/);
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

test("no theme toggle and no saved theme anywhere the site loads", () => {
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

test("black is the ground and the primary's fill is the sky-blue accent: no magenta, no amber left", () => {
  const files = ["app/city.css"];
  const walk = (dir) => {
    for (const entry of readdirSync(`${root}${dir}`, { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (/\.tsx$/.test(entry.name)) files.push(path);
    }
  };
  walk("app");
  assert.ok(files.length > 10, "the walk reached the components");
  // Whole words: a three.js MeshLambertMaterial is no amber
  for (const file of files) assert.doesNotMatch(read(file), /\b(magenta|amber)\b/i, file);
  const css = read("app/city.css");
  for (const name of ["--accent", "--seam", "--seam-2"]) assert.match(css, new RegExp(`\\n\\s*${name}: #[0-9a-f]{6};`), name);
  for (const utility of ["accent"]) assert.match(css, new RegExp(`--color-${utility}: var\\(--${utility}\\);`));
  // The fade under each painting passes through the dark navy seam
  const fade = css.match(/\.band::before \{([^}]*)\}/)?.[1] ?? "";
  // over its last 42% (the panels sit on it on the journey)
  assert.match(fade, /inset: 58% 0 0;/);
  assert.match(fade, /linear-gradient\(transparent, var\(--seam\) 62%, var\(--ground, var\(--ink\)\) 80%\)/);
  // The haze is mixed against the plates' navy, not the black ground
  const haze = css.match(/\.band-haze \{([^}]*)\}/)?.[1] ?? "";
  assert.match(haze, /#0e1d31/);
  assert.doesNotMatch(haze, /var\(--ink\)/);
});
