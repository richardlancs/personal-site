// The sections lay themselves out by their own width (Tailwind container
// queries on their own wrapper, @container + @min-[…]:), not the window's,
// and write their headings through city2d/Heading.tsx, so they fit any
// column they are put in. Source-level, except Heading, which is called.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const names = ["About", "Projects", "Experience", "Interests", "Contact"];
const sections = Object.fromEntries(names.map((n) => [n, read(`app/components/city2d/sections/${n}.tsx`)]));
const hero = read("app/components/city2d/sections/Hero.tsx");

// Every class string in a file: "…", '…' and `…` literals
const classStrings = (source) => [...source.matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g)].map((m) => m[1] ?? m[2] ?? m[3]);

// A viewport variant (sm: md: lg: xl: 2xl:, min-[…]: max-[…]:) in front of
// a utility. Type sizes may follow the device (body text 16px on phones),
// so a viewport variant on a text- utility is allowed; nothing else is.
// Container variants (@min-[…]:, @md: …) don't match: they start with @.
const viewportVariant = /(^|\s)(sm|md|lg|xl|2xl|min-\[[^\]]+\]|max-\[[^\]]+\]):(?!text-)\S+/;

test("no section keys its layout on the viewport", () => {
  for (const [name, source] of Object.entries(sections)) {
    for (const s of classStrings(source)) {
      const m = s.match(viewportVariant);
      assert.equal(m, null, `${name}: viewport variant ${m?.[0].trim()}`);
    }
  }
});

test("each section measures its own column: one @container on a wrapper, then @min-[…]: variants", () => {
  for (const [name, source] of Object.entries(sections)) {
    // A wrapper, or (a row's sections) each panel, is the container
    assert.match(source, /className="[^"]*@container[\s"]/, `${name}: an @container`);
    assert.match(source, /@min-\[\d+(\.\d+)?rem\]:/, `${name}: container variants`);
  }
  // The panels' and the column's sizes the layouts break at
  const all = Object.values(sections).join("\n");
  const used = new Set([...all.matchAll(/@min-\[([\d.]+rem)\]:/g)].map((m) => m[1]));
  for (const size of used) assert.ok(["22.5rem", "27.5rem", "37.5rem", "45.5rem", "48rem", "61.5rem", "69.5rem"].includes(size), `unexpected container size ${size}`);
  // Image sizes stay viewport-based (they choose a file, not a layout)
  assert.match(sections.Projects, /const coverSizes = "\(min-width: 1024px\)/);
});

test("every section uses Heading for its headings", () => {
  for (const [name, source] of Object.entries(sections)) {
    assert.match(source, /import Heading from "\.\.\/Heading"/, `${name} imports Heading`);
    assert.match(source, new RegExp(`export default function ${name}\\(\\)`), `${name}'s signature`);
    assert.doesNotMatch(source, /<h[1-6][\s>]/, `${name}: no literal heading tags`);
    assert.match(source, /<Heading level=\{[345]\}/, `${name} uses Heading`);
  }
  assert.match(hero, /<h1 id="home-title"/, "the hero's h1 stays");
});

// Heading.tsx is written without JSX so it can be loaded here: types
// stripped, react resolved from the project
async function loadHeading() {
  const source = stripTypeScriptTypes(read("app/components/city2d/Heading.tsx")).replace('from "react"', `from ${JSON.stringify(import.meta.resolve("react"))}`);
  return import(`data:text/javascript,${encodeURIComponent(source)}`);
}

test("Heading draws the level it is given", async () => {
  const { default: Heading } = await loadHeading();
  for (const level of [3, 4, 5]) assert.equal(Heading({ level, children: "x" }).type, `h${level}`);
  const el = Heading({ level: 3, id: "a", className: "b", children: "Title" });
  assert.deepEqual([el.props.id, el.props.className, el.props.children], ["a", "b", "Title"]);
});

// Each section's outline, nothing skipped: the station's h2 then 3, 4, 5
test("each section's headings step down one level at a time", () => {
  const levels = { About: [3], Projects: [3, 4], Experience: [3], Interests: [3], Contact: [3] };
  for (const [name, expected] of Object.entries(levels)) {
    const used = [...new Set([...sections[name].matchAll(/<Heading level=\{(\d)\}/g)].map((m) => Number(m[1])))].sort();
    assert.deepEqual(used, expected, name);
  }
});

// The 3D city was removed (2026-11-22): nothing of it is left in the app,
// nothing on the page leads to it, and its addresses go to the page (a
// section's to its anchor), temporarily, as the old addresses do
test("the 3D city is gone: no route, no switch, no 3D packages, and /city redirects to the page", () => {
  const exists = (file) => existsSync(new URL(`../${file}`, import.meta.url));
  for (const gone of ["app/city", "app/components/city3d", "app/lib/city3dLive.ts", "app/components/city2d/ViewSwitch.tsx", "app/components/city2d/CityLink.tsx"]) assert.ok(!exists(gone), gone);
  const pkg = JSON.parse(read("package.json"));
  for (const dep of ["three", "@react-three/fiber", "postprocessing", "@types/three"]) {
    assert.ok(!(dep in (pkg.dependencies ?? {})) && !(dep in (pkg.devDependencies ?? {})), dep);
  }
  assert.doesNotMatch(read("app/layout.tsx"), /data-city3d|CITY3D/);
  assert.doesNotMatch(read("app/components/city2d/TopBar.tsx") + read("app/components/city2d/SectionsMenu.tsx"), /ViewSwitch|\/city|3D/);
  assert.doesNotMatch(read("app/city.css"), /view-switch|city-link|data-city3d|data-webgl2|city3d/);
  const config = read("next.config.ts");
  const redirect = (source, destination) => new RegExp(`\\{ source: "${source.replace(/[/*]/g, "\\$&")}", destination: "${destination.replace(/[/#]/g, "\\$&")}", permanent: false \\}`);
  assert.match(config, redirect("/city", "/"));
  for (const id of ["about", "projects", "experience", "interests", "contact"]) assert.match(config, redirect(`/city/${id}`, `/#${id}`), id);
  assert.match(config, redirect("/city/:path*", "/"));
  // The section addresses come before the catch-all, which would match them first
  assert.ok(config.indexOf('"/city/contact"') < config.indexOf('"/city/:path*"'));
  assert.doesNotMatch(config, /NEXT_PUBLIC_CITY3D/);
});
