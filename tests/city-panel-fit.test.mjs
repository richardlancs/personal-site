// The sections fit a half-width panel (3D city, /city/<section>) as well as
// the full page (/): they lay themselves out by their own width (Tailwind
// container queries on their own wrapper, @container + @min-[…]:), not the
// window's, and take their heading level from where they are drawn
// (city2d/Heading.tsx). Source-level, except Heading, which is called.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
    assert.match(source, /className="@container[\s"]/, `${name}: an @container wrapper`);
    assert.match(source, /@min-\[\d+(\.\d+)?rem\]:/, `${name}: container variants`);
  }
  // The column (.station-body's content box, the window less 2.5rem, up
  // to 72rem) gives the old breakpoints their container sizes
  const all = Object.values(sections).join("\n");
  const used = new Set([...all.matchAll(/@min-\[([\d.]+rem)\]:/g)].map((m) => m[1]));
  for (const size of used) assert.ok(["22.5rem", "27.5rem", "37.5rem", "45.5rem", "61.5rem", "69.5rem"].includes(size), `unexpected container size ${size}`);
  // The sticky picture is still sticky on a wide column
  assert.match(sections.Projects, /@min-\[61\.5rem\]:sticky/);
  // Image sizes stay viewport-based (they choose a file, not a layout)
  assert.match(sections.Projects, /const coverSizes = "\(min-width: 1280px\)/);
});

test("every section takes where (\"2d\" by default) and uses Heading for its headings", () => {
  for (const [name, source] of Object.entries(sections)) {
    assert.match(source, /import Heading, \{ type Where \} from "\.\.\/Heading"/, `${name} imports Heading`);
    assert.match(source, new RegExp(`export default function ${name}\\(\\{ where = "2d" \\}: \\{ where\\?: Where \\}\\)`), `${name}'s signature`);
    assert.doesNotMatch(source, /<h[1-6][\s>]/, `${name}: no literal heading tags`);
    assert.match(source, /<Heading level=\{[345]\} where=\{where\}/, `${name} passes where on`);
    for (const m of source.matchAll(/<Heading\b[^>]*>/g)) assert.match(m[0], /where=\{where\}/, `${name}: ${m[0]}`);
  }
  assert.match(hero, /type Where \} from "\.\.\/Heading"|import type \{ Where \} from "\.\.\/Heading"/);
  assert.match(hero, /<h1 id="home-title"/, "the hero's h1 stays");
});

// Heading.tsx is written without JSX so it can be loaded here: types
// stripped, react resolved from the project
async function loadHeading() {
  const source = stripTypeScriptTypes(read("app/components/city2d/Heading.tsx")).replace('from "react"', `from ${JSON.stringify(import.meta.resolve("react"))}`);
  return import(`data:text/javascript,${encodeURIComponent(source)}`);
}

test("Heading: its 2D level on the 2D page, one higher in the 3D city", async () => {
  const { default: Heading, headingLevel } = await loadHeading();
  for (const level of [3, 4, 5]) {
    assert.equal(headingLevel(level), level);
    assert.equal(headingLevel(level, "2d"), level);
    assert.equal(headingLevel(level, "3d"), level - 1);
    assert.equal(Heading({ level, children: "x" }).type, `h${level}`);
    assert.equal(Heading({ level, where: "2d", children: "x" }).type, `h${level}`);
    assert.equal(Heading({ level, where: "3d", children: "x" }).type, `h${level - 1}`);
  }
  const el = Heading({ level: 3, where: "3d", id: "a", className: "b", children: "Title" });
  assert.deepEqual([el.props.id, el.props.className, el.props.children], ["a", "b", "Title"]);
});

// Each section's outline, nothing skipped: on / the station's h2 then 3, 4,
// 5; in 3D the page's h1 then 2, 3, 4 (the levels written are 2D levels)
test("each section's headings step down one level at a time", () => {
  const levels = { About: [3], Projects: [3, 4], Experience: [3], Interests: [3], Contact: [3] };
  for (const [name, expected] of Object.entries(levels)) {
    const used = [...new Set([...sections[name].matchAll(/<Heading level=\{(\d)\}/g)].map((m) => Number(m[1])))].sort();
    assert.deepEqual(used, expected, name);
  }
});

test("on /city the hero's ways in stay in the city; the Interests link to the 3D city is only in 2D", () => {
  // next/link, so the page stays and the camera travels (no reload)
  assert.match(hero, /\{where === "3d" \? \(\s*<>\s*<Link href=\{cityPath\("projects"\)\}[\s\S]*?<Link href=\{cityPath\("contact"\)\}/);
  assert.match(hero, /^import Link from "next\/link";/m);
  assert.match(sections.Interests, /\{where === "2d" && CITY3D_LIVE && \(\s*<p[^>]*>\s*<CityLink/);
});

// The city can be closed to visitors (app/lib/city3dLive.ts, NEXT_PUBLIC_CITY3D=off): then nothing
// on the 2D page leads into it, and its addresses go back to the 2D page
test("the 3D city is open unless built with NEXT_PUBLIC_CITY3D=off; closed, its key and links aren't shown and /city goes to /", () => {
  const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const rule = /= process\.env\.NEXT_PUBLIC_CITY3D !== "off";/;
  assert.match(read("app/lib/city3dLive.ts"), rule);
  const config = read("next.config.ts");
  assert.match(config, rule);
  assert.match(config, /city3dLive\s*\?\s*\[\]\s*:\s*\[\s*\{ source: "\/city", destination: "\/", permanent: false \},\s*\{ source: "\/city\/:path\*", destination: "\/", permanent: false \}/);
  assert.match(read("app/components/city2d/ViewSwitch.tsx"), /if \(CITY3D_LIVE && mayDrawWebGL\(\)\)/);
  assert.match(read("app/layout.tsx"), /data-city3d=\{CITY3D_LIVE \? undefined : "off"\}/);
  assert.match(read("app/city.css"), /:root\[data-city3d="off"\] :is\(\.view-switch:not\(\[data-to="2d"\]\), \.city-link, \.sections-menu-view:not\(:has\(\[data-to="2d"\]\)\)\) \{\s*display: none !important;/);
});
