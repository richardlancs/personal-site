// Smoke checks against a running build: every route answers, and the
// content a recruiter needs is in the HTML before any script or WebGL runs
// (so it's still there while the world loads, or where it can't).
//
//   npm run build && npx next start -p 3100
//   SMOKE_URL=http://localhost:3100 npm test
//
// Without SMOKE_URL these tests are skipped, so `npm test` stays offline.
import assert from "node:assert/strict";
import { test } from "node:test";
import { profile, projects, experience, interests } from "../app/data/portfolio.ts";
import { listed, places } from "../app/sections/registry.ts";

const base = process.env.SMOKE_URL?.replace(/\/$/, "");
const skip = base ? false : "set SMOKE_URL to a running build to run the smoke checks";

const cache = new Map();
async function get(path) {
  if (!cache.has(path)) {
    const res = await fetch(base + path, { redirect: "manual" });
    cache.set(path, { status: res.status, type: res.headers.get("content-type") ?? "", body: await res.text() });
  }
  return cache.get(path);
}
// The HTML escapes apostrophes and ampersands; compare like with like
const html = (text) => text.replace(/&/g, "&amp;").replace(/'/g, "&#x27;");

test("every listed route answers 200 with its own title", { skip }, async () => {
  const titles = new Set();
  for (const s of listed) {
    const { status, body } = await get(s.href);
    assert.equal(status, 200, `${s.href}: status`);
    const title = body.match(/<title>([^<]*)<\/title>/)?.[1];
    assert.ok(title, `${s.href}: no <title>`);
    titles.add(title);
  }
  assert.equal(titles.size, listed.length, "titles are unique");
});

test("an unknown address is a 404 with the way back", { skip }, async () => {
  const { status, body } = await get("/a-path-that-isnt-on-the-map");
  assert.equal(status, 404);
  assert.match(body, /href="\/"/);
});

test("the section starter isn't served (audit F2)", { skip }, async () => {
  assert.equal((await get("/greenhouse")).status, 404);
});

test("every page has the skip link and its main content in the HTML", { skip }, async () => {
  for (const s of listed) {
    const { body } = await get(s.href);
    assert.match(body, /class="skip-link"/, `${s.href}: skip link`);
    assert.match(body, /id="content"/, `${s.href}: skip target`);
    assert.match(body, /<main/, `${s.href}: <main>`);
    assert.match(body, /<h1/, `${s.href}: <h1>`);
  }
});

test("every page links to every listed place (the menu and lists are in the HTML)", { skip }, async () => {
  for (const s of listed) {
    const { body } = await get(s.href);
    for (const place of places) assert.ok(body.includes(`href="${place.href}"`), `${s.href} has no link to ${place.href}`);
  }
});

test("the home page names me and links to GitHub, LinkedIn and the résumé", { skip }, async () => {
  const { body } = await get("/");
  assert.ok(body.includes(profile.name));
  for (const href of [profile.githubUrl, profile.linkedinUrl, profile.resumeUrl]) assert.ok(body.includes(`href="${href}"`), `home: ${href}`);
});

test("all four projects are on /projects, the first with its code and demo links", { skip }, async () => {
  // The projects are tabs: every title is a tab in the HTML, and the chosen
  // project's notes (the first, until one is chosen) are written out.
  // Each project's own links are checked by choosing it, in the browser.
  const { body } = await get("/projects");
  assert.equal(projects.length, 4);
  for (const project of projects) assert.ok(body.includes(html(project.title)), `projects: ${project.title}`);
  const [first] = projects;
  assert.ok(body.includes(`href="${first.githubUrl}"`), `projects: ${first.githubUrl}`);
  if (first.liveUrl) assert.ok(body.includes(`href="${first.liveUrl}"`), `projects: ${first.liveUrl}`);
});

test("every role, interest and contact address is readable without scripts", { skip }, async () => {
  const exp = (await get("/experience")).body;
  for (const stop of experience) assert.ok(exp.includes(html(stop.role)), `experience: ${stop.role}`);
  const int = (await get("/interests")).body;
  for (const interest of interests) assert.ok(int.includes(html(interest.name)), `interests: ${interest.name}`);
  const contact = (await get("/contact")).body;
  for (const email of profile.emails) assert.ok(contact.includes(`mailto:${email.address}`), `contact: ${email.address}`);
  assert.ok(contact.includes(`href="${profile.resumeUrl}"`), "contact: résumé");
});

test("the résumé is served as a PDF", { skip }, async () => {
  const res = await fetch(base + profile.resumeUrl, { method: "HEAD" });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /^application\/pdf/);
});

test("the home page introduces me and leads to the projects and contact on both layouts (audit I1)", { skip }, async () => {
  const { body } = await get("/");
  assert.ok(body.includes(html(profile.intro)), "home: introduction");
  // Not kept to one layout: the introduction and both actions are on every screen
  assert.match(body, /<p class="park-about">/, "home: introduction is on both layouts");
  assert.match(body, /<div class="park-actions">/, "home: actions are on both layouts");
  assert.match(body, /href="\/projects"[^>]*>View projects</, "home: View projects");
  assert.match(body, /href="\/contact"[^>]*>Contact</, "home: Contact");
});

test("the corner menu is called Sections on every layout (audit I1)", { skip }, async () => {
  for (const s of listed) {
    const { body } = await get(s.href);
    const button = body.match(/<button[^>]*popoverTarget="places-menu"[^>]*>([\s\S]*?)<\/button>/i);
    assert.ok(button, `${s.href}: the menu button`);
    assert.equal(button[1].replace(/<[^>]+>/g, "").trim(), "Sections", `${s.href}: menu button label`);
    assert.match(body, /<nav id="places-menu"[^>]*aria-label="Sections"/, `${s.href}: menu name`);
  }
});

test("the arcade's card panel is a tab stop after the chosen cabinet (audit F5)", { skip }, async () => {
  const { body } = await get("/interests");
  const panel = body.match(/<div[^>]*id="cabinet-card"[^>]*>/)?.[0];
  assert.ok(panel, "interests: the card panel");
  assert.match(panel, /role="tabpanel"/);
  assert.match(panel, /tabindex="0"/i, "interests: the panel takes focus");
  assert.match(panel, /aria-live="polite"/, "interests: the new card is still announced");
});

test("copy and music feedback are live regions drawn on screen, not screen-reader-only", { skip }, async () => {
  const contact = (await get("/contact")).body;
  const copyStatus = contact.match(/<p[^>]*role="status"[^>]*>/)?.[0];
  assert.ok(copyStatus, "contact: the copy status");
  assert.doesNotMatch(copyStatus, /sr-only/, "contact: the copy status is visible");
  for (const s of listed) {
    const { body } = await get(s.href);
    assert.match(body, /<span role="status" class="music-status">/, `${s.href}: the music status`);
  }
});
