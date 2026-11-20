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
  assert.match(read("app/city.css"), /@media \(prefers-contrast: more\)[^}]*\{[\s\S]*text-shadow:\s*none/);
});

test("no Chinese or Japanese characters in app/ source", () => {
  const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu;
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
