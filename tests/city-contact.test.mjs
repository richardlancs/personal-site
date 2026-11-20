// The contact station (components/city2d/sections/Contact.tsx) and its one
// client piece, the Copy key (sections/CopyButton.tsx). Source-level checks.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { profile } from "../app/data/portfolio.ts";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const contact = read("app/components/city2d/sections/Contact.tsx");
const copy = read("app/components/city2d/sections/CopyButton.tsx");

test("every email is a row with a mailto link and a copy key", () => {
  assert.ok(profile.emails.length > 0, "there are emails to show");
  assert.match(contact, /profile\.emails\.map\(/, "maps profile.emails");
  assert.match(contact, /mailto:\$\{email\.address\}/, "builds mailto: hrefs");
  assert.match(contact, /email\.label/, "shows each email's label");
  assert.match(contact, /<CopyButton value=\{email\.address\}/, "a copy key per address");
});

test("GitHub, LinkedIn and the résumé are linked, the résumé through ResumeLink", () => {
  assert.match(contact, /import ResumeLink from "\.\.\/\.\.\/resume\/ResumeLink"/);
  assert.match(contact, /<ResumeLink\b/);
  assert.match(contact, /profile\.githubUrl/);
  assert.match(contact, /profile\.linkedinUrl/);
  assert.doesNotMatch(contact, /resumeUrl/, "never the résumé's address directly");
  assert.doesNotMatch(contact, /Colophon/, "the page renders the colophon once, at its foot");
  for (const match of contact.matchAll(/target="_blank"[^>]*/g)) assert.match(match[0], /rel="noopener noreferrer"/);
});

test("the contact station is a server component; only the copy key is a client one", () => {
  assert.doesNotMatch(contact, /^\s*["']use client["']/);
  assert.match(copy, /^"use client";/);
});

test("the copy key gives live, visible feedback and handles a missing or refused clipboard", () => {
  assert.match(copy, /className="glass"/, "a glass key");
  assert.match(copy, /aria-live="polite"/);
  assert.match(copy, /<p\s[^>]*role="status"/, "the status is a <p role=status>, as the smoke test looks for");
  assert.doesNotMatch(copy.match(/<p\s[^>]*role="status"[^>]*>/s)?.[0] ?? "", /sr-only/, "drawn on screen");
  assert.match(copy, /data-copied=/);
  assert.match(copy, /sr-only">\s*\{value\}/, "the key's name says which address it copies");
  assert.match(copy, /navigator\.clipboard\?\.writeText/, "checks the clipboard exists");
  assert.match(copy, /catch\s*\{/, "a catch for clipboard failure");
  assert.match(copy, /by hand/, "the failure says to copy it by hand");
  assert.match(copy, /useEffect\(\(\) => \(\) => window\.clearTimeout\(/, "clears its timer on unmount");
});

test("no fixed pixel widths and no CJK characters", () => {
  for (const [name, source] of [["Contact", contact], ["CopyButton", copy]]) {
    assert.doesNotMatch(source, /\bw-\[\d+px\]|width:\s*\d+px|min-w-\[\d+px\]|max-w-\[\d+px\]/, `${name}: fixed width`);
    assert.doesNotMatch(source, /[぀-ヿ㐀-鿿]/, `${name}: CJK`);
  }
});
