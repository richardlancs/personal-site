// The one-page city: six stations on `/`, in order, each in its own
// district, and the old one-page-per-section addresses sent to their
// anchors. Source-level checks, no server (the smoke tests check the same
// against a running build).
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { pageSections, sectionNumber, sections } from "../app/sections/registry.ts";

const root = new URL("..", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");

test("six sections, in order, each with a district painted above it", () => {
  assert.equal(sections, pageSections, "sections is the same array");
  assert.deepEqual(
    pageSections.map((s) => s.id),
    ["home", "about", "projects", "experience", "interests", "contact"],
  );
  assert.deepEqual(
    pageSections.map((s) => s.title),
    ["Home", "About", "Projects", "Experience", "Interests", "Contact"],
  );
  assert.deepEqual(
    pageSections.map((s) => s.district),
    ["lujiazui", "longtang", "towers", "metro", "nanjing-road", "bund"],
  );
  assert.equal(new Set(pageSections.map((s) => s.district)).size, 6, "six distinct districts");
  for (const s of pageSections) {
    assert.equal(s.hash, s.id === "home" ? "" : s.id, `${s.id}: hash`);
    assert.equal(s.href, s.id === "home" ? "/" : `/#${s.id}`, `${s.id}: href`);
    // The places' names are gone: sections are named as sections
    for (const key of ["station", "districtLine", "place", "intro", "hint", "anchor", "map", "glyph", "side"]) assert.ok(!(key in s), `${s.id} still has "${key}"`);
  }
  const projects = pageSections.find((s) => s.id === "projects");
  assert.deepEqual(projects.subsections?.map((sub) => [sub.title, sub.href]), [["Skills", "/#skills"]]);
});

test("the registry has no stop names or place lines", () => {
  const src = read("app/sections/registry.ts");
  assert.doesNotMatch(src, /station:/);
  assert.doesNotMatch(src, /districtLine:/);
});

// Source with its comments taken out (block, JSX and line comments)
const code = (text) => text.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("the page names no districts: no stop names and no captions, anywhere it renders", () => {
  const files = ["app/page.tsx", "app/layout.tsx", "app/sections/registry.ts"];
  const walk = (dir) => {
    for (const entry of readdirSync(`${root}${dir}`, { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (/\.tsx?$/.test(entry.name)) files.push(path);
    }
  };
  walk("app/components");
  for (const file of files) {
    const src = code(read(file));
    for (const name of ["Lujiazui", "Longtang", "Century Avenue", "Line 2", "Nanjing Road", "The Bund"]) assert.ok(!src.includes(name), `${file} renders "${name}"`);
  }
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

test("a section is a labelled section with its number and its heading, no band and no caption", () => {
  const src = read("app/components/city2d/Station.tsx");
  assert.ok(!src.includes('"use client"'), "Station is a server component");
  assert.match(src, /<section[^>]*id=\{id\}[^>]*aria-labelledby=\{`\$\{id\}-title`\}[^>]*tabIndex=\{-1\}/);
  assert.doesNotMatch(src, /DistrictBand|bandTiles/, "no painting over a station");
  assert.match(src, /<h2 id=\{`\$\{section\.hash \|\| "home"\}-title`\}/, "the heading names the section");
  assert.match(src, /sectionNumber\(section\)/);
  assert.doesNotMatch(src, /section\.station|districtLine|station-caption|station-line/);
  assert.deepEqual(pageSections.map(sectionNumber), ["01", "02", "03", "04", "05", "06"], "section numbers are two digits, in page order");
  // The number sits beside the heading, before it (StationHead)
  const head = src.slice(src.indexOf("export function StationHead"), src.indexOf("export default"));
  assert.ok(head.indexOf("station-number") >= 0 && head.indexOf("station-number") < head.indexOf("{section.title}"), "number, then title");
  assert.match(head, /<span className="station-number" aria-hidden="true"/, "the number is hidden from assistive technology");
  assert.match(head, /<\/span>\s*\)\}\s*<h2 id=[^>]*className="station-title"[^>]*>\s*\{section\.title\}\s*<\/h2>/, "outside the h2: the heading is the title alone");
  // A stop of one panel gets its heading from Station; a row's section
  // puts StationHead in its own first panel
  assert.match(src, /<div className="station-body panel">\s*\{heading \?\? <StationHead section=\{section\} \/>\}/);
  assert.match(src, /<div className="station-row">\{children\}<\/div>/);
  for (const n of ["Projects", "Experience"]) {
    assert.match(read(`app/components/city2d/sections/${n}.tsx`), /<StationHead section=\{section\("\w+"\)\} \/>/, `${n} heads its row`);
  }
});

test("home is the hero: no h2", () => {
  const src = read("app/components/city2d/Station.tsx");
  assert.match(src, /\{heading \?\? <StationHead/, "the hero in place of the heading");
  assert.match(read("app/page.tsx"), /<Station section=\{section\("home"\)\} heading=\{<Hero \/>\} \/>/);
  assert.doesNotMatch(read("app/components/city2d/sections/Hero.tsx"), /<h2/);
  // The hero has no list of stops
  assert.doesNotMatch(read("app/components/city2d/sections/Hero.tsx"), /StationIndex|station-index/);
  for (const gone of ["StationIndex.tsx", "StationHere.tsx", "MetroLine.tsx"]) assert.ok(!existsSync(`${root}app/components/city2d/${gone}`), `${gone} is still there`);
  const css = read("app/city.css");
  for (const gone of [".station-caption", ".station-index", ".metro-line", ".station-line", ".station-stop"]) assert.ok(!css.includes(gone), `${gone} is still styled`);
});

test("the home page is the six stations, with the Skills anchor inside Projects", () => {
  const page = read("app/page.tsx");
  assert.match(page, /<Station /);
  const projects = page.match(/<Station section=\{section\("projects"\)\} row>([\s\S]*?)<\/Station>/)?.[1];
  assert.ok(projects, "the projects station");
  // Skills is Projects' own <section id="skills">, the page's only one
  assert.match(projects, /<Projects \/>/);
  assert.doesNotMatch(page, /id="skills"/, "no second Skills anchor on the page");
  assert.match(read("app/components/city2d/sections/Projects.tsx"), /<section id="skills"/);
  for (const [id, name, row] of [["about", "About", ""], ["experience", "Experience", " heading={<ExperienceHead />}"], ["interests", "Interests", ""]]) {
    assert.match(page, new RegExp(`<Station section=\\{section\\("${id}"\\)\\}${row}>\\s*<${name} \\/>\\s*</Station>`), `${id} is filled`);
  }
  // Contact, then the foot of the page (the colophon), which ends the last stop
  assert.match(page, /<Station section=\{section\("contact"\)\}>\s*<Contact \/>\s*<footer className="page-foot">\s*<Colophon \/>\s*<\/footer>\s*<\/Station>/, "contact is filled");
  // The six stations are the journey's stops (CityTrack.tsx)
  assert.match(page, /<CityTrack>\s*<Station section=\{section\("home"\)\}[\s\S]*<\/Station>\s*<\/CityTrack>/);
  for (const id of ["home", "about", "projects", "experience", "interests", "contact"]) assert.match(page, new RegExp(`section\\("${id}"\\)`), `page renders ${id}`);
  assert.match(page, /<Colophon \/>/);
});

test("no band of painting is styled (Task 12: the paper has no city)", () => {
  const css = read("app/city.css");
  assert.doesNotMatch(css, /^\.band\b|\.band-(tile|plate|night|haze|wash|sheen|precip|weather)|\.pano\b|--city-(night|grade|haze)|data-sky-ready|data-home-plate/m);
});

test("the Sections menu jumps within the page and moves focus there", () => {
  const menu = read("app/components/city2d/SectionsMenu.tsx");
  // On the one page, where you are comes from the scroll ("location")
  assert.match(menu, /const here = useSection\(\);/);
  assert.match(menu, /aria-current=\{s\.id === here \? "location" : undefined\}/, "where you are");
  assert.match(menu, /focusAnchor\(href\)/);
  assert.match(read("app/components/city2d/jump.ts"), /\.focus\(/);
  assert.match(menu, /hidePopover\(\)/);
});

test("a tall top bar stops being sticky, and jumps still clear it", () => {
  const menu = read("app/components/city2d/SectionsMenu.tsx");
  assert.match(menu, /data-bar-tall/);
  assert.match(menu, /innerHeight \* 0\.25/);
  const css = read("app/city.css");
  assert.match(css, /:root\[data-bar-tall\] \.top-bar \{[^}]*position: relative/, "not sticky (relative: the progress line rides its foot)");
  assert.match(css, /:root\[data-bar-tall\] \{[^}]*--scroll-offset:/);
  // A jump stops below the bar while it's sticky, and at the top once it isn't
  assert.match(css, /\nhtml \{[^}]*scroll-padding-top: var\(--scroll-offset\)/);
  assert.match(css, /:root\[data-bar-tall\] \.sections-menu \{[^}]*position: absolute/);
});

test("smooth scrolling only where motion is welcome", () => {
  const css = read("app/city.css");
  const smooth = [...css.matchAll(/([^{}]+)\{[^{}]*scroll-behavior: smooth/g)];
  assert.equal(smooth.length, 1, "one smooth-scrolling rule");
  assert.match(smooth[0][1], /:root\[data-still="off"\]\[data-landed\]/);
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\) \{\s*:root\[data-still="off"\]\[data-landed\] \{\s*scroll-behavior: smooth/);
  // Landing on a deep link is a jump, not a glide: smooth only once loaded
  assert.match(read("app/components/city2d/ProgressLine.tsx"), /setAttribute\("data-landed", ""\)/);
});

test("the 404 and error notice points back to the start, in the city's style", () => {
  const notice = read("app/components/ui/Notice.tsx");
  assert.match(notice, /Back to the start/);
  assert.doesNotMatch(notice, /park/i);
  for (const file of ["app/not-found.tsx", "app/error.tsx"]) assert.doesNotMatch(read(file), /park|on the map/i, file);
  const css = read("app/city.css");
  assert.match(css, /\.notice \{/);
});
