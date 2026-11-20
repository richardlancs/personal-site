// The 3D city's addresses (app/city/, app/lib/cityRoutes.ts), its metadata
// (sections/metadata.ts: cityMetadata), and the switch between the two views
// (city2d/ViewSwitch.tsx, CityLink.tsx). docs/superpowers/plans/2026-11-19-shanghai-3d.md, Task 2.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { cityPath, sectionForCityPath, twoDHref } from "../app/lib/cityRoutes.ts";
import { cityMetadata } from "../app/sections/metadata.ts";
import { pageSections } from "../app/sections/registry.ts";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const walk = (dir) =>
  readdirSync(`${root}${dir}`, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));

test("every section has its /city address, a page file, and Skills has none", () => {
  assert.deepEqual(pageSections.map((s) => s.city), ["/city", "/city/about", "/city/projects", "/city/experience", "/city/interests", "/city/contact"]);
  for (const s of pageSections.filter((s) => s.id !== "home")) assert.ok(existsSync(`${root}app${s.city}/page.tsx`), s.city);
  assert.ok(existsSync(`${root}app/city/page.tsx`));
  assert.ok(!existsSync(`${root}app/city/[section]`) && !existsSync(`${root}app/city/skills`));
  assert.equal(sectionForCityPath("/city/skills"), null);
});

test("2D and 3D links round-trip for every section", () => {
  for (const s of pageSections) {
    assert.equal(sectionForCityPath(cityPath(s.id)), s.id);
    assert.equal(twoDHref(cityPath(s.id)), s.href);
  }
  assert.equal(twoDHref("/city/projects/"), "/#projects");
  assert.equal(twoDHref("/city/nowhere"), "/");
});

test("the 3D link never prefetches, keeps its space, and the probe makes no context", () => {
  const src = read("app/components/city2d/ViewSwitch.tsx");
  assert.match(src, /prefetch=\{false\}/);
  assert.match(src, /data-webgl2/);
  assert.match(src, /data-place=/);
  assert.match(read("app/components/city2d/CityLink.tsx"), /prefetch=\{false\}/);
  assert.doesNotMatch(read("app/components/city2d/webgl.ts"), /getContext/);
  // Hidden (its space kept) without WebGL2; "2D view" always shows
  assert.match(read("app/city.css"), /:root:not\(\[data-webgl2\]\) :is\(\.view-switch, \.city-link\):not\(\[data-to="2d"\]\) \{\s*visibility: hidden;/);
  // Frequently used: no motion of its own (principle 18)
  assert.doesNotMatch(read("app/city.css").match(/---------- The view switch[\s\S]*?(?=\/\* The music)/)[0], /transition|animation/);
});

test("the switch is in the bar from 80rem and the menu's first entry below that, never both", () => {
  const css = read("app/city.css");
  assert.match(css, /\.top-bar-end \.view-switch \{\s*display: none;/);
  assert.match(css, /@media \(min-width: 80rem\) \{\s*\.top-bar-end \.view-switch \{\s*display: inline-flex;\s*\}\s*\.sections-menu \.sections-menu-view \{\s*display: none;/);
  const menu = read("app/components/city2d/SectionsMenu.tsx");
  assert.ok(menu.indexOf('<ViewSwitch place="menu"') < menu.indexOf("listed.map"), "the menu's first entry");
});

test("the /city pages are not indexed, canonical to the 2D page, and use no dynamicParams", () => {
  for (const f of ["app/city/page.tsx", "app/city/projects/page.tsx"]) assert.match(read(f), /cityMetadata\(/);
  const meta = cityMetadata("projects");
  assert.deepEqual(meta.robots, { index: false, follow: true });
  assert.equal(meta.alternates.canonical, "/");
  assert.equal(meta.title, "Projects · 3D city");
  assert.equal(cityMetadata("home").title, "3D city");
  assert.ok(!walk("app/city").some((f) => /dynamicParams|generateStaticParams/.test(read(f))));
});

test("on /city the menu points at the city and offers the way back", () => {
  const menu = read("app/components/city2d/SectionsMenu.tsx");
  assert.match(menu, /\.city\b/);
  assert.match(menu, /<ViewSwitch place="menu"/);
  assert.match(read("app/components/city2d/TopBar.tsx"), /<ViewSwitch place="bar"/);
});

test("a /city page is the band, one panel with its h1, the 2D link and the credit", () => {
  const src = read("app/components/city3d/CityPage.tsx");
  for (const re of [/city-band/, /city-panel/, /<h1/, /where="3d"/, /twoDHref/, /<Colophon \/>/]) assert.match(src, re);
  assert.doesNotMatch(src, /id="home"/);
  // The canvas shell is in the city's layout only, loaded after the page
  // is up (CityLoader.tsx), with the sky driver
  assert.match(read("app/city/layout.tsx"), /<CityLoader \/>/);
  const loader = read("app/components/city3d/CityLoader.tsx");
  assert.match(loader, /lazy\(\(\) => import\("\.\/CityAfter"\)\)/);
  const after = read("app/components/city3d/CityAfter.tsx");
  assert.match(after, /import CityShell from "\.\/CityShell";/);
  assert.match(after, /import SkyDriver from "\.\.\/weather\/SkyDriver";/);
  assert.doesNotMatch(read("app/layout.tsx"), /CityShell|CityLoader/);
});
