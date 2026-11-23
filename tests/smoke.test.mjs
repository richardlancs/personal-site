// Smoke checks against a running build: the one page answers, every
// station is on it at its anchor, the old addresses redirect there, and the
// content a recruiter needs is in the HTML before any script runs.
//
//   npm run build && npx next start -p 3100
//   SMOKE_URL=http://localhost:3100 npm test
//
// Without SMOKE_URL these tests are skipped, so `npm test` stays offline.
import assert from "node:assert/strict";
import { test } from "node:test";
import { about, profile, projects, experience, interests, skillGroups } from "../app/data/portfolio.ts";
import { listed, pageSections, siteUrl } from "../app/sections/registry.ts";

const base = process.env.SMOKE_URL?.replace(/\/$/, "");
const skip = base ? false : "set SMOKE_URL to a running build to run the smoke checks";

const cache = new Map();
async function get(path) {
  if (!cache.has(path)) {
    const res = await fetch(base + path, { redirect: "manual" });
    cache.set(path, { status: res.status, type: res.headers.get("content-type") ?? "", location: res.headers.get("location") ?? "", body: await res.text() });
  }
  return cache.get(path);
}
// The HTML escapes apostrophes, ampersands, quotes and angle brackets;
// compare like with like
const html = (text) => text.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// One station's HTML on `/`: from its <section id> to the next station's
// (or the foot of the page)
const anchorOf = (s) => s.hash || "home";
async function station(id) {
  const { body } = await get("/");
  const start = body.indexOf(`<section id="${id}"`);
  assert.ok(start >= 0, `no station #${id} on /`);
  const ends = pageSections.map((s) => body.indexOf(`<section id="${anchorOf(s)}"`, start + 1)).filter((i) => i > start);
  const foot = body.indexOf("<footer", start);
  return body.slice(start, Math.min(...ends, foot >= 0 ? foot : body.length));
}


test("the one page answers 200 with the site's title", { skip }, async () => {
  const { status, body } = await get("/");
  assert.equal(status, 200);
  assert.match(body, /<title>Richard Lan \| Software Engineering Portfolio<\/title>/);
});

test("every old address redirects to its station, temporarily", { skip }, async () => {
  for (const s of pageSections.filter((s) => s.hash)) {
    const { status, location } = await get(`/${s.hash}`);
    assert.equal(status, 307, `/${s.hash}: status`);
    assert.ok(location.endsWith(`/#${s.hash}`), `/${s.hash} goes to ${location}`);
  }
  const map = await get("/map");
  assert.equal(map.status, 307, "/map: status");
  assert.ok(new URL(map.location, base).pathname === "/" && !new URL(map.location, base).hash, `/map goes to ${map.location}`);
});

test("every station, and Skills inside Projects, is on / at its anchor", { skip }, async () => {
  const { body } = await get("/");
  for (const id of ["about", "projects", "skills", "experience", "interests", "contact"]) assert.ok(body.includes(`id="${id}"`), `no id="${id}"`);
  // In page order, each a labelled section that can take focus
  let last = -1;
  for (const s of pageSections) {
    const at = body.indexOf(`<section id="${anchorOf(s)}"`);
    assert.ok(at > last, `${s.id} is out of order`);
    last = at;
    assert.match(body.slice(at, at + 300), new RegExp(`aria-labelledby="${anchorOf(s)}-title"`), `${s.id}: labelled`);
  }
  assert.ok((await station("projects")).includes('id="skills"'), "Skills is inside Projects");
});

test("an unknown address is a 404 with the way back", { skip }, async () => {
  const { status, body } = await get("/a-path-that-isnt-on-the-map");
  assert.equal(status, 404);
  assert.match(body, /href="\/"/);
  assert.match(body, /Back to the start/);
});

test("the section starter isn't served (audit F2)", { skip }, async () => {
  assert.equal((await get("/greenhouse")).status, 404);
});

test("the page has the skip link, one h1 and its main content in the HTML", { skip }, async () => {
  const { body } = await get("/");
  assert.match(body, /<a href="#content" class="skip-link[ "]/, "skip link");
  assert.match(body, /id="content"/, "skip target");
  assert.match(body, /<main/, "<main>");
  assert.equal((body.match(/<h1[\s>]/g) ?? []).length, 1, "one <h1>");
});

test("the page links to every listed station and its parts (the menu is in the HTML)", { skip }, async () => {
  const { body } = await get("/");
  for (const s of listed) {
    assert.ok(body.includes(`href="${s.href}"`), `no link to ${s.href}`);
    for (const sub of s.subsections ?? []) assert.ok(body.includes(`href="${sub.href}"`), `no link to ${sub.href}`);
  }
});

test("the home station names me and links to GitHub, LinkedIn and the résumé", { skip }, async () => {
  const home = await station("home");
  assert.ok(home.includes(profile.name));
  for (const href of [profile.githubUrl, profile.linkedinUrl, profile.resumeUrl]) assert.ok(home.includes(`href="${href}"`), `home: ${href}`);
});

test("every project is in the projects station, the first with its code and demo links", { skip }, async () => {
  const body = await station("projects");
  assert.ok(projects.length > 0);
  for (const project of projects) assert.ok(body.includes(html(project.title)), `projects: ${project.title}`);
  const [first] = projects;
  assert.ok(body.includes(`href="${first.githubUrl}"`), `projects: ${first.githubUrl}`);
  if (first.liveUrl) assert.ok(body.includes(`href="${first.liveUrl}"`), `projects: ${first.liveUrl}`);
});

test("every role is readable in the experience station without scripts", { skip }, async () => {
  const body = await station("experience");
  for (const stop of experience) assert.ok(body.includes(html(stop.role)), `experience: ${stop.role}`);
});

test("every interest is readable in the interests station without scripts", { skip }, async () => {
  const body = await station("interests");
  for (const interest of interests) assert.ok(body.includes(html(interest.name)), `interests: ${interest.name}`);
});

test("every contact address and the résumé are in the contact station", { skip }, async () => {
  const body = await station("contact");
  for (const email of profile.emails) assert.ok(body.includes(`mailto:${email.address}`), `contact: ${email.address}`);
  assert.ok(body.includes(`href="${profile.resumeUrl}"`), "contact: résumé");
});

test("every station's content is in its own station's HTML, not just its titles (review m-11), its figures in bold", { skip }, async () => {
  const where = { about: await station("about"), projects: await station("projects"), experience: await station("experience"), interests: await station("interests"), contact: await station("contact") };
  // Figures are set in <strong class="figure"> (Figures.tsx): read the text through them
  const plain = (id) => where[id].replace(/<strong class="figure">([^<]*)<\/strong>/g, "$1");
  const has = (id, text, what) => assert.ok(plain(id).includes(html(text)), `${id}: ${what}: ${text}`);
  for (const entry of about) {
    has("about", entry.heading, "heading");
    for (const point of entry.points) has("about", point, "point");
  }
  for (const project of projects) {
    has("projects", project.summary, `${project.title} summary`);
    if (project.role) has("projects", project.role, `${project.title} role`);
    for (const feature of project.features) has("projects", feature, `${project.title} feature`);
    for (const contribution of project.contributions ?? []) has("projects", contribution, `${project.title} contribution`);
    has("projects", project.technologies.join(" · "), `${project.title} technologies`);
    for (const shot of project.screenshots ?? []) has("projects", shot.alt, `${project.title} screenshot`);
    assert.ok(where.projects.includes(`href="${project.githubUrl}"`), `projects: ${project.title} code`);
    if (project.liveUrl) assert.ok(where.projects.includes(`href="${project.liveUrl}"`), `projects: ${project.title} demo`);
  }
  for (const group of skillGroups) {
    has("projects", group.category, "skill group");
    for (const skill of group.skills) has("projects", skill, `${group.category} skill`);
  }
  for (const stop of experience) {
    has("experience", stop.organization, `${stop.role} organization`);
    for (const highlight of stop.highlights) has("experience", highlight, `${stop.role} highlight`);
  }
  for (const interest of interests) has("interests", interest.description, `${interest.name} description`);
  assert.ok(where.projects.includes('<strong class="figure">100,000</strong>'), "a figure is bold in the served HTML");
  for (const email of profile.emails) {
    has("contact", email.label, "email label");
    has("contact", email.address, "email address");
  }
});

test("the copy feedback is a live region drawn on screen, not screen-reader-only", { skip }, async () => {
  const contact = await station("contact");
  const copyStatus = contact.match(/<p[^>]*role="status"[^>]*>/)?.[0];
  assert.ok(copyStatus, "contact: the copy status");
  assert.doesNotMatch(copyStatus, /sr-only/, "contact: the copy status is visible");
});

test("no plate is in the HTML outside <noscript>; the home band's night plate is inside it", { skip }, async () => {
  const { body } = await get("/");
  const outside = body.replace(/<noscript>[\s\S]*?<\/noscript>/g, "");
  assert.doesNotMatch(outside, /<img[^>]*\/_next\/static\/media\/(day|night)-\d\d\.[0-9a-z_-]+\.webp/, "a plate <img> outside <noscript>");
  assert.doesNotMatch(outside, /<link[^>]*as="image"[^>]*(day|night)/, "a plate preload");
  assert.match(await station("home"), /<noscript><img[^>]*src="\/_next\/static\/media\/night-01\.[^"]+\.webp"/);
});

test("home is the band and the hero: no caption, no place names, no h2", { skip }, async () => {
  const home = await station("home");
  assert.ok(!home.includes("station-caption"), "no caption");
  assert.doesNotMatch(home, /<h2[\s>]/);
  const { body } = await get("/");
  assert.ok(!body.includes("The skyline across the Huangpu"), "the home caption is gone");
  for (const name of ["Lujiazui", "Longtang", "Century Avenue", "Line 2", "Nanjing Road", "The Bund"]) assert.ok(!body.includes(name), `the page names "${name}"`);
  // Old links still land: every section's anchor is there, labelled
  for (const s of pageSections) assert.ok(body.includes(`aria-labelledby="${anchorOf(s)}-title"`), `${s.id}: labelled`);
});

test("the music feedback is a live region drawn on screen", { skip }, async () => {
  const { body } = await get("/");
  assert.match(body, /<span role="status" class="music-status">/);
});

test("the résumé is served as a PDF", { skip }, async () => {
  const res = await fetch(base + profile.resumeUrl, { method: "HEAD" });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /^application\/pdf/);
});

test("the corner menu is called Sections (audit I1)", { skip }, async () => {
  const { body } = await get("/");
  const button = body.match(/<button[^>]*popoverTarget="places-menu"[^>]*>([\s\S]*?)<\/button>/i);
  assert.ok(button, "the menu button");
  assert.equal(button[1].replace(/<[^>]+>/g, "").trim(), "Sections", "menu button label");
  assert.match(body, /<nav id="places-menu"[^>]*aria-label="Sections"/, "menu name");
});

test("the page names its canonical address and a share card (audit: metadata)", { skip }, async () => {
  const { body } = await get("/");
  assert.ok(body.includes(`<link rel="canonical" href="${siteUrl}"/>`), "canonical");
  assert.ok(body.includes(`<meta property="og:url" content="${siteUrl}"/>`), "og:url");
  assert.ok(body.includes(`<meta property="og:image" content="${siteUrl}/share-card.jpg"/>`), "og:image");
  assert.ok(body.includes('<meta name="twitter:card" content="summary_large_image"/>'), "twitter:card");
  assert.ok(body.includes(`<meta name="twitter:image" content="${siteUrl}/share-card.jpg"/>`), "twitter:image");
});

test("robots.txt allows crawling and points at the sitemap, which lists the one page", { skip }, async () => {
  const robots = await get("/robots.txt");
  assert.equal(robots.status, 200);
  assert.match(robots.body, /User-Agent: \*\nAllow: \//);
  assert.ok(robots.body.includes(`Sitemap: ${siteUrl}/sitemap.xml`));
  const sitemap = await get("/sitemap.xml");
  assert.equal(sitemap.status, 200);
  const locs = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs, [siteUrl]);
});

test("the icons and the share card are served with the right types", { skip }, async () => {
  for (const [path, type] of [["/favicon.ico", /^image\/(x-icon|vnd\.microsoft\.icon)/], ["/icon.svg", /^image\/svg\+xml/], ["/apple-icon.png", /^image\/png/], ["/share-card.jpg", /^image\/jpeg/]]) {
    const res = await fetch(base + path, { method: "HEAD" });
    assert.equal(res.status, 200, path);
    assert.match(res.headers.get("content-type") ?? "", type, path);
  }
});

// The 3D city was removed (2026-11-22): its addresses go to the page, a
// section's to its anchor, temporarily, and the page carries nothing of it
test("the 3D city's old addresses redirect to the page, temporarily", { skip }, async () => {
  const to = async (path) => {
    const { status, location } = await get(path);
    assert.equal(status, 307, `${path}: status`);
    const url = new URL(location, base);
    return url.pathname + url.hash;
  };
  assert.equal(await to("/city"), "/");
  for (const s of ["about", "projects", "experience", "interests", "contact"]) assert.equal(await to(`/city/${s}`), `/#${s}`);
  assert.equal(await to("/city/skills"), "/");
  assert.equal(await to("/city/dev/kit"), "/");
});

test("/ carries nothing of the 3D city", { skip }, async () => {
  const { body } = await get("/");
  assert.doesNotMatch(body, /city3d|data-city3d|href="\/city/);
  assert.doesNotMatch(body, /3D city/);
});
