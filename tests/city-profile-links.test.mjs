// The profile's links (components/city2d/ProfileLinks.tsx): GitHub,
// LinkedIn and the résumé, one component for the hero, About and Contact,
// each an icon and a label, one résumé label everywhere.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const links = read("app/components/city2d/ProfileLinks.tsx");

test("three links, from profile, each with an aria-hidden icon and a label", () => {
  assert.match(links, /href=\{profile\.githubUrl\}/);
  assert.match(links, /href=\{profile\.linkedinUrl\}/);
  assert.match(links, /<ResumeLink\b/);
  assert.doesNotMatch(links, /resumeUrl/);
  for (const label of ["GitHub", "LinkedIn", "Résumé", "Email"]) assert.match(links, new RegExp(`<Icon size=\\{size\\}>[^\\n]*\\n\\s*${label}\\n`), label);
  for (const m of links.matchAll(/<svg\b[^>]*>/g)) assert.match(m[0], /aria-hidden="true"/);
  for (const m of links.matchAll(/target="_blank"[^>]*/g)) assert.match(m[0], /rel="noopener noreferrer"/);
  assert.doesNotMatch(links, /^["']use client["']/m);
});

test("one résumé label everywhere, and every place uses the shared links", () => {
  for (const [file, variant] of [
    ["app/components/city2d/sections/Hero.tsx", "text"],
    ["app/components/city2d/sections/About.tsx", "keys"],
    ["app/components/city2d/sections/Contact.tsx", "keys"],
  ]) {
    const source = read(file);
    assert.match(source, new RegExp(`<ProfileLinks variant="${variant}"`), file);
    assert.doesNotMatch(source, /profile\.(githubUrl|linkedinUrl)/, `${file} writes no link of its own`);
    // The hero's résumé is a glass key beside "View projects", with the
    // same label; elsewhere it comes from the shared links
    if (file.endsWith("Hero.tsx")) assert.match(source, /<ResumeLink className="glass">Résumé<\/ResumeLink>/);
    else assert.doesNotMatch(source, /<ResumeLink/, file);
  }
  assert.doesNotMatch(links, /Résumé \(PDF\)/);
});

test("text links in the hero and About, glass keys in Contact, with no important utilities", () => {
  assert.match(links, /"glass profile-key w-full min-\[480px\]:w-auto"/);
  assert.match(links, /"text-link text-link-solo gap-2"/);
  const css = read("app/city.css");
  assert.match(css, /\.profile-key \{\s*justify-content: flex-start;/);
  assert.match(css, /\.glass-lg \{[^}]*min-height: 56px;/);
});

test("the hero's row is one style: GitHub, LinkedIn and the email, each an icon and a label; no résumé twice", () => {
  assert.match(links, /resume = true/);
  assert.match(links, /\{resume && \(/);
  assert.match(links, /href=\{`mailto:\$\{email\}`\} className=\{className\}/);
  assert.match(links, /<Icon size=\{size\}>\{paths\.email\}<\/Icon>/);
  const hero = read("app/components/city2d/sections/Hero.tsx");
  assert.match(hero, /<ProfileLinks variant="text" resume=\{false\} email=\{profile\.emails\[0\]\?\.address\} \/>/);
});
