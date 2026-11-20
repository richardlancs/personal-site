// The one-page city: six stations on `/`, in order, each in its own
// district, and the old one-page-per-section addresses sent to their
// anchors. Source-level checks, no server (the smoke tests check the same
// against a running build).
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { stations, stopNumber } from "../app/sections/registry.ts";

const root = new URL("..", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");

test("six stations, in order, each with a district and a stop name", () => {
  assert.deepEqual(
    stations.map((s) => s.id),
    ["home", "about", "projects", "experience", "interests", "contact"],
  );
  assert.deepEqual(
    stations.map((s) => s.district),
    ["lujiazui", "longtang", "towers", "metro", "nanjing-road", "bund"],
  );
  assert.equal(new Set(stations.map((s) => s.district)).size, 6, "six distinct districts");
  assert.deepEqual(
    stations.map((s) => s.station),
    ["Lujiazui", "Longtang", "Century Avenue", "Line 2", "Nanjing Road", "The Bund"],
  );
  for (const s of stations) {
    assert.equal(s.hash, s.id === "home" ? "" : s.id, `${s.id}: hash`);
    assert.equal(s.href, s.id === "home" ? "/" : `/#${s.id}`, `${s.id}: href`);
    assert.match(s.districtLine, /^[A-Z].*\.$/, `${s.id}: districtLine is one sentence`);
    // The park's rooms are gone from the registry
    for (const key of ["place", "intro", "hint", "anchor", "map", "glyph", "side"]) assert.ok(!(key in s), `${s.id} still has "${key}"`);
  }
  const projects = stations.find((s) => s.id === "projects");
  assert.deepEqual(projects.subsections?.map((sub) => [sub.title, sub.href]), [["Skills", "/#skills"]]);
});

test("every old address redirects to its anchor, temporarily", () => {
  const cfg = read("next.config.ts");
  for (const s of ["about", "projects", "experience", "interests", "contact"])
    assert.match(cfg, new RegExp(`source: "/${s}",\\s*destination: "/#${s}",\\s*permanent: false`));
  assert.match(cfg, /source: "\/map",\s*destination: "\/",\s*permanent: false/);
  // The old pages are gone, so nothing answers at those addresses but the redirect
  for (const s of ["about", "projects", "experience", "interests", "contact", "map"]) assert.ok(!existsSync(`${root}app/${s}/page.tsx`), `app/${s}/page.tsx still exists`);
});

test("the sitemap is the one page", () => {
  const sitemap = read("app/sitemap.ts");
  assert.doesNotMatch(sitemap, /\.map\(/, "the sitemap no longer lists one address per section");
  assert.match(sitemap, /url: siteUrl/);
});

test("a station is a labelled section with its band, stop and heading", () => {
  const src = read("app/components/city2d/Station.tsx");
  assert.ok(!src.includes('"use client"'), "Station is a server component");
  assert.match(src, /<section[^>]*id=\{id\}[^>]*aria-labelledby=\{titleId\}[^>]*tabIndex=\{-1\}/);
  assert.match(src, /<DistrictBand district=\{section\.district\}/);
  assert.match(src, /section\.station/);
  assert.match(src, /section\.districtLine/);
  assert.match(src, /<h2 id=\{titleId\}/);
  assert.match(src, /stopNumber\(section\)/);
  assert.deepEqual(stations.map(stopNumber), ["01", "02", "03", "04", "05", "06"], "stop numbers are two digits, in page order");
});

test("home's stop and line are the band's caption, before the hero, with no h2", () => {
  const src = read("app/components/city2d/Station.tsx");
  const home = src.match(/\{heading \? \(([\s\S]*?)\) : \(/)?.[1];
  assert.ok(home, "the home branch");
  assert.ok(home.indexOf('className="station-caption"') < home.indexOf("{heading}"), "caption first");
  assert.match(home, /section\.districtLine/);
  assert.doesNotMatch(home, /<h2/);
});

test("the home page is the six stations, with the Skills anchor inside Projects", () => {
  const page = read("app/page.tsx");
  assert.match(page, /stations\.map|<Station /);
  const projects = page.match(/<Station section=\{section\("projects"\)\}>([\s\S]*?)<\/Station>/)?.[1];
  assert.ok(projects, "the projects station");
  // Skills is Projects' own <section id="skills">, the page's only one
  assert.match(projects, /<Projects \/>/);
  assert.doesNotMatch(page, /id="skills"/, "no second Skills anchor on the page");
  assert.match(read("app/components/city2d/sections/Projects.tsx"), /<section id="skills"/);
  for (const [id, name] of [["about", "About"], ["experience", "Experience"], ["interests", "Interests"], ["contact", "Contact"]]) {
    assert.match(page, new RegExp(`<Station section=\\{section\\("${id}"\\)\\}>\\s*<${name} \\/>\\s*</Station>`), `${id} is filled`);
  }
  for (const id of ["home", "about", "projects", "experience", "interests", "contact"]) assert.match(page, new RegExp(`section\\("${id}"\\)`), `page renders ${id}`);
  assert.match(page, /<Colophon \/>/);
});

test("the band reserves its height: 21:9 wide, 4:3 on phones", () => {
  const css = read("app/city.css");
  assert.match(css, /\.band\s*\{[^}]*aspect-ratio:\s*21\s*\/\s*9/);
  assert.match(css, /@media \(max-width: 767px\) \{\s*\.band\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*3/);
});

test("the Sections menu jumps within the page and moves focus there", () => {
  const menu = read("app/components/city2d/SectionsMenu.tsx");
  assert.doesNotMatch(menu, /usePathname|aria-current="page"/, "no route-based chosen state on a one-page site");
  assert.match(menu, /aria-current=\{s\.id === here \? "location" : undefined\}/, "where you are, from the scroll");
  assert.match(menu, /focusAnchor\(href\)/);
  assert.match(read("app/components/city2d/jump.ts"), /\.focus\(/);
  assert.match(menu, /hidePopover\(\)/);
});

test("a tall top bar stops being sticky, and jumps still clear it", () => {
  const menu = read("app/components/city2d/SectionsMenu.tsx");
  assert.match(menu, /data-bar-tall/);
  assert.match(menu, /innerHeight \* 0\.25/);
  const css = read("app/city.css");
  assert.match(css, /:root\[data-bar-tall\] \.top-bar \{[^}]*position: static/);
  assert.match(css, /:root\[data-bar-tall\] \{[^}]*--scroll-offset:/);
  // A jump stops below the bar while it's sticky, and at the top once it isn't
  assert.match(css, /\nhtml \{[^}]*scroll-padding-top: var\(--scroll-offset\)/);
  assert.match(css, /:root\[data-bar-tall\] \.sections-menu \{[^}]*position: absolute/);
});

test("smooth scrolling only where motion is welcome", () => {
  const css = read("app/city.css");
  const smooth = [...css.matchAll(/([^{}]+)\{[^{}]*scroll-behavior: smooth/g)];
  assert.equal(smooth.length, 1, "one smooth-scrolling rule");
  assert.match(smooth[0][1], /:root\[data-still="off"\]/);
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\) \{\s*:root\[data-still="off"\] \{\s*scroll-behavior: smooth/);
});

test("the 404 and error notice points back to the start, in the city's style", () => {
  const notice = read("app/components/ui/Notice.tsx");
  assert.match(notice, /Back to the start/);
  assert.doesNotMatch(notice, /park/i);
  for (const file of ["app/not-found.tsx", "app/error.tsx"]) assert.doesNotMatch(read(file), /park|on the map/i, file);
  const css = read("app/city.css");
  assert.match(css, /\.notice \{/);
});
