// The 3D city's glass (Task 2 of docs/superpowers/plans/2026-11-21-city-painted-25d.md):
// the panels as glass over the scene, Home's title card, the place dock,
// and the Sections menu that follows the view. Source checks offline; with
// SMOKE_URL (a running build) the server HTML too: `/`'s menu and hero
// exactly as before (tests/fixtures/root-*.html, taken from `/` before the
// change), the dock on every /city page in the registry's order.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { experience, profile } from "../app/data/portfolio.ts";
import { listed } from "../app/sections/registry.ts";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const noComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

const base = process.env.SMOKE_URL?.replace(/\/$/, "");
const skip = base ? false : "set SMOKE_URL to a running build to run the server HTML checks";
const get = async (path) => (await fetch(base + path)).text();

const hero = read("app/components/city2d/sections/Hero.tsx");
const card = hero.slice(hero.indexOf("function TitleCard()"));
const dock = read("app/components/city3d/panels/PlaceDock.tsx");
const panelSrc = read("app/components/city3d/panels/CityPanel.tsx");
const pages = read("app/city/city-pages.css");

test("the glass tokens exist, and the panel and the dock are glass: a tint over a backdrop blur, an edge, the words' halo (Task 2)", () => {
  const tokens = noComments(read("app/city.css"));
  for (const t of ["--glass-panel", "--glass-blur", "--glass-edge", "--glass-halo"]) assert.match(tokens, new RegExp(`${t}:\\s*[^;]+;`), t);
  // a tint of --panel (#181b23), see-through; the secondary words lighter on it
  assert.match(tokens, /--glass-panel:\s*rgb\(24 27 35 \/ 0\.\d+\);/);
  assert.match(tokens, /--glass-muted:\s*#[0-9a-f]{6};/);
  const wide = noComments(pages.slice(pages.indexOf("@media (orientation: landscape) and (min-width: 768px) and (min-height: 481px)")));
  const glass = wide.match(/\n {2}\.city-panel,\s*\.place-dock \{([^}]*)\}/);
  assert.ok(glass, ".city-panel (Home's credit too) and .place-dock on wide screens");
  assert.match(glass[1], /--muted: var\(--glass-muted\);/);
  assert.match(glass[1], /backdrop-filter: var\(--glass-panel-blur\);/);
  assert.match(glass[1], /background: var\(--glass-panel\);/);
  assert.match(glass[1], /border: 1px solid var\(--glass-edge\);/);
  assert.match(glass[1], /text-shadow: var\(--glass-halo\);/);
});

test("the glass goes opaque under prefers-contrast: more and in forced colours", () => {
  const css = noComments(pages);
  assert.match(css, /@media \(prefers-contrast: more\), \(forced-colors: active\) \{\s*\.city-panel,\s*\.place-dock \{\s*background: var\(--panel\);\s*backdrop-filter: none;/);
});

test("Home's title card is the name, the school, the programme, Email me, GitHub, LinkedIn and the résumé, all from the data", () => {
  assert.ok(!hero.includes('"use client"'), "a server component");
  assert.match(hero, /if \(where === "3d"\) return <TitleCard \/>;/);
  // The name, the page's h1, focusable on a journey back
  assert.match(card, /<h1 id="home-title" className="hero-name[^"]*"[^>]*tabIndex=\{-1\}>\s*\{profile\.name\}\s*<\/h1>/);
  // The school and the programme from the education entry
  assert.match(hero, /const school = experience\.find\(\(e\) => e\.kind === "education"\);/);
  assert.match(card, /\{school\.organization\}/);
  assert.match(card, /\{school\.role\}/);
  // Email me: the first address, the primary action
  assert.match(hero, /const email = profile\.emails\[0\];/);
  assert.match(card, /<a href=\{`mailto:\$\{email\.address\}`\} className="glass glass-primary">\s*Email me\s*<\/a>/);
  // GitHub, LinkedIn, and the résumé opened over the page
  assert.match(card, /<ProfileLinks variant="text" \/>/);
  assert.match(read("app/components/city2d/ProfileLinks.tsx"), /<ResumeLink className=\{className\}>/);
  // Nothing else: one h1, two lines, one key, one list of links; no
  // headline, no ways into sections, no facts typed in
  assert.equal((card.match(/<(h1|p|a|ul|Link)\b/g) ?? []).join(","), "<h1,<p,<p,<a,<ul");
  assert.doesNotMatch(card, /profile\.headline|cityPath|View projects/);
  for (const fact of ["University of Waterloo", "Honours Computer Science", "Co-op", profile.emails[0].address, profile.name]) assert.ok(!card.includes(fact), `"${fact}" typed into the card`);
  // and the data has what the card reads
  const school = experience.find((e) => e.kind === "education");
  assert.equal(school.organization, "University of Waterloo");
  assert.equal(school.role, "Honours Computer Science (Co-op)");
});

test("the dock: every listed place in the registry's order, the current one marked, previous and next that wrap", () => {
  // drawn on the server: nothing added to the page's first load
  assert.doesNotMatch(dock, /^"use client";/);
  assert.match(dock, /const places = listed;/);
  assert.doesNotMatch(dock, /\.sort\(|\.filter\(|\.reverse\(/);
  assert.match(dock, /\{places\.map\(\(s\) => \(/);
  assert.match(dock, /aria-current=\{s\.id === current \? "page" : undefined\}/);
  assert.match(dock, /<span className="sections-menu-here" aria-hidden="true" \/>/, "a mark as well as colour");
  assert.match(dock, /const previous = places\[\(at - 1 \+ places\.length\) % places\.length\];/);
  assert.match(dock, /const next = places\[\(at \+ 1\) % places\.length\];/);
  // client components never import values from the data
  assert.doesNotMatch(dock, /data\/portfolio/);
  assert.equal(listed.length, 6);
  // every /city page has it, and Home's old row of keys is gone
  const page = read("app/components/city3d/CityPage.tsx");
  assert.match(page, /<PlaceDock current=\{id\} \/>\s*<div className="city-panel">/);
  assert.doesNotMatch(page, /city-keys/);
});

test("← and → go to the previous and the next place, but not while typing, with a modifier, in a row of choices, or with a dialog or menu open", () => {
  // In the panel's behaviour, loaded after the page (CityLoader.tsx), for the page showing
  assert.match(panelSrc, /const dock = section && hydrated \? document\.querySelector<HTMLElement>\(`\[data-section="\$\{section\}"\] \.place-dock`\) : null;/);
  assert.match(panelSrc, /if \(\(e\.key !== "ArrowLeft" && e\.key !== "ArrowRight"\) \|\| e\.defaultPrevented\) return;/);
  assert.match(panelSrc, /if \(e\.altKey \|\| e\.ctrlKey \|\| e\.metaKey \|\| e\.shiftKey\) return;/);
  assert.match(panelSrc, /input, textarea, select, \[contenteditable/);
  assert.match(panelSrc, /\[data-choice\]/, "the pickers' rows take the arrows themselves (panels/selector.ts)");
  assert.match(panelSrc, /if \(typing\(e\.target as Element \| null\) \|\| typing\(document\.activeElement\)\) return;\s*if \(document\.documentElement\.classList\.contains\("resume-lock"\) \|\| document\.querySelector\(":popover-open, dialog\[open\]"\)\) return;/);
  assert.match(panelSrc, /\[data-dock="\$\{e\.key === "ArrowLeft" \? "previous" : "next"\}"\]/);
  assert.match(dock, /data-dock="previous" aria-keyshortcuts="ArrowLeft"/);
  assert.match(dock, /data-dock="next" aria-keyshortcuts="ArrowRight"/);
});

test("the dock stands in one place on every page; where its row scrolls, a focused key comes into view, keys snap whole, the far side fades, the wheel turns it (fix round A, ux I1, a11y I2)", () => {
  const wide = noComments(pages.slice(pages.indexOf("@media (orientation: landscape) and (min-width: 768px) and (min-height: 481px)")));
  // Home's panel is narrower, but the dock keeps to the places' line
  const place = "min\\(46rem, 100% - 3rem, max\\(32rem, 50vw\\)\\)";
  assert.match(wide, new RegExp(`\\.city-page \\{\\s*--panel-w: ${place};`));
  assert.match(wide, new RegExp(`\\.place-dock \\{[^}]*left: calc\\(${place} \\+ 2\\.5rem\\);[^}]*max-width: calc\\(100% - ${place} - 4rem\\);`));
  assert.doesNotMatch(wide, /\.place-dock \{[^}]*var\(--panel-w\)/);
  assert.match(dock, /<ul className="place-dock-row[^"]*" style=\{\{ scrollSnapType: "x mandatory", scrollPaddingInline: 24 \}\}>/);
  assert.match(dock, /<li key=\{s\.id\} style=\{\{ scrollSnapAlign: "center" \}\}>/);
  assert.match(panelSrc, /linear-gradient\(90deg, #0000, #000 \$\{l\}px, #000 calc\(100% - \$\{r\}px\), #0000\)/);
  assert.match(panelSrc, /scrollIntoView\?\.\(\{ inline: "nearest", block: "nearest" \}\)/);
  assert.match(panelSrc, /row\?\.addEventListener\("focusin", onFocus\);/);
  assert.match(panelSrc, /row\?\.addEventListener\("wheel", onWheel, \{ passive: false \}\);/);
});

test("the Sections menu in the city: named Places in 3D, with that heading after the view switch; each entry its place's page, the current marked", () => {
  const src = read("app/components/city2d/SectionsMenu.tsx");
  assert.match(src, /aria-label=\{city \? "Places in 3D" : "Sections"\}/);
  assert.match(src, /<ViewSwitch place="menu" \/>\s*<\/li>\s*\{city && \(\s*<li className="sections-menu-heading[^"]*" aria-hidden="true">\s*Places in 3D\s*<\/li>\s*\)\}\s*\{listed\.map/);
  assert.match(src, /<Link href=\{city \? s\.city : jumpHref\(s\.href\)\}/);
  assert.match(src, /aria-current=\{s\.id === here \? \(city \? "page" : "location"\) : undefined\}/);
  assert.match(pages, /\.sections-menu-heading \{/, "styled where only the city loads it");
});

test("server HTML: `/`'s Sections menu and hero exactly as before", { skip }, async () => {
  const body = await get("/");
  const menu = body.match(/<nav id="places-menu".*?<\/nav>/s)?.[0];
  assert.equal(`${menu}\n`, read("tests/fixtures/root-sections-menu.html"));
  const start = body.indexOf('<div class="hero">');
  const heroHtml = body.slice(start, body.indexOf("</ul></div>", start) + "</ul></div>".length);
  assert.equal(`${heroHtml}\n`, read("tests/fixtures/root-hero.html"));
  assert.doesNotMatch(body, /place-dock|Places in 3D/);
});

test("server HTML: every /city page has the dock, in the registry's order, its own place marked; Home has the title card", { skip }, async () => {
  for (const s of listed) {
    const body = await get(s.city);
    const nav = body.match(/<nav aria-label="Places" class="place-dock[^"]*">.*?<\/nav>/s)?.[0];
    assert.ok(nav, `${s.city}: the dock`);
    const keys = [...nav.matchAll(/<a class="glass place-dock-key[^"]*"[^>]*href="([^"]+)"|<a[^>]*href="([^"]+)"[^>]*class="glass place-dock-key[^"]*"/g)].map((m) => m[1] ?? m[2]);
    assert.deepEqual(keys, listed.map((p) => p.city), `${s.city}: the order`);
    const current = [...nav.matchAll(/<a[^>]*aria-current="page"[^>]*>/g)];
    assert.equal(current.length, 1, `${s.city}: one current`);
    assert.match(current[0][0], new RegExp(`href="${s.city}"`));
    assert.match(body, /<nav id="places-menu" popover="auto" aria-label="Places in 3D"/, `${s.city}: the menu's name`);
    assert.match(body, /<li class="sections-menu-heading[^"]*" aria-hidden="true">Places in 3D<\/li>/, `${s.city}: the menu's heading`);
  }
  const home = await get("/city");
  const school = experience.find((e) => e.kind === "education");
  assert.match(home, new RegExp(`<h1 id="home-title"[^>]*>${profile.name}</h1>`));
  assert.ok(home.includes(school.organization) && home.includes(school.role.replace(/[()]/g, (c) => c)), "the school and programme");
  assert.ok(home.includes(`href="mailto:${profile.emails[0].address}"`), "Email me");
});
