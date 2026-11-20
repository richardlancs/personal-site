// The contact section (components/city2d/sections/Contact.tsx) and its one
// client piece, the Copy key (sections/CopyButton.tsx). Source-level checks.
// The section starts with one "Email me" button to the first address in
// profile.emails; the other ways to reach him follow under a hairline.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { profile } from "../app/data/portfolio.ts";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const contact = read("app/components/city2d/sections/Contact.tsx");
const copy = read("app/components/city2d/sections/CopyButton.tsx");

// The section component itself (after the icon helpers), with the shared
// key class written in where it is used
const keyClass = contact.match(/const keyClass = ("[^"]*")/)?.[1] ?? '""';
const markup = contact.slice(contact.indexOf("export default function Contact")).replaceAll("className={keyClass}", `className=${keyClass}`);
// Opening tags of interactive elements, in source order
const interactive = [...markup.matchAll(/<(a|button|ResumeLink|CopyButton)\b[^>]*>/gs)].map((match) => match[0]);

test("the first interactive element is the 'Email me' button to the first address", () => {
  assert.ok(profile.emails.length > 0, "there are emails to show");
  const [first] = interactive;
  assert.ok(first, "there is an interactive element");
  assert.match(first, /^<a\b/, "an <a>");
  assert.match(first, /href=\{`mailto:\$\{primary\.address\}`\}/, "mailto: the primary address");
  assert.match(first, /className="glass glass-primary\b[^"]*"/, "glass glass-primary");
  assert.match(first, /\bglass-lg\b/, "the large key (56px tall)");
  assert.doesNotMatch(contact, /![\s"]/, "no important utilities");
  assert.match(contact, /const primary = profile\.emails\[0\]/, "the primary address is the first in the data");
  // Its visible text is "Email me", after an icon hidden from the accessibility tree
  const button = markup.match(/<a\b[^>]*glass-primary[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? "";
  assert.match(button, /\{mailIcon\}/, "a mail icon");
  assert.match(button.replace(/\{mailIcon\}/, ""), /^\s*Email me\s*$/, "visible text 'Email me'");
});

test("the primary address is printed under the button, wrapping, with its label and a Copy key", () => {
  assert.match(interactive[1] ?? "", /^<CopyButton value=\{primary\.address\}/, "Copy is the next control");
  const between = markup.slice(markup.indexOf("Email me"), markup.indexOf("<CopyButton value={primary.address}"));
  assert.match(between, /\{primary\.label\}/, "its label, as plain text");
  assert.match(between, /<span\b[^>]*(break-all|overflow-wrap:anywhere)[^>]*>\s*\{primary\.address\}/, "the address as wrapping text");
});

test("the other addresses are compact rows: label, a mailto link and Copy; no h3 per email", () => {
  assert.match(contact, /profile\.emails\.slice\(1\)\.map\(/, "maps the rest of profile.emails");
  assert.doesNotMatch(contact, /profile\.emails\[1\]/, "never hard-codes the second email");
  assert.match(contact, /href=\{`mailto:\$\{email\.address\}`\}/, "a mailto link per address");
  assert.match(contact, /\{email\.label\}/, "each address's label");
  assert.match(contact, /<CopyButton value=\{email\.address\}/, "a Copy key per address");
  const h3s = [...markup.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/g)];
  assert.equal(h3s.length, 1, "one h3 in the section");
  assert.match(h3s[0][1], /^\s*Other ways to reach me\s*$/, "the h3 is 'Other ways to reach me'");
  assert.match(h3s[0][0], /font-display/, "in the display face");
});

test("GitHub, LinkedIn and the résumé are the shared profile links, as glass keys, after the other addresses", () => {
  assert.match(contact, /import ProfileLinks from "\.\.\/ProfileLinks"/);
  assert.match(markup, /<ProfileLinks variant="keys" \/>/);
  assert.doesNotMatch(contact, /resumeUrl/, "never the résumé's address directly");
  assert.doesNotMatch(contact, /Colophon/, "the page renders the colophon once, at its foot");
  assert.ok(markup.indexOf("<ProfileLinks") > markup.indexOf("slice(1)"), "keys after the other addresses");
  for (const match of contact.matchAll(/target="_blank"[^>]*/g)) assert.match(match[0], /rel="noopener noreferrer"/);
  for (const match of contact.matchAll(/<svg\b[^>]*>/g)) assert.match(match[0], /aria-hidden="true"/, "every icon aria-hidden");
});

test("the keys sit in a row, stacked under 480px", () => {
  assert.match(markup, /<ul\b[^>]*className="[^"]*\bflex-col\b[^"]*\bmin-\[480px\]:flex-row\b/, "a column, a row from 480px");
});

test("the contact section is a server component; only the copy key is a client one", () => {
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
  // Only success reverts on a timer; the failure branch sets no timeout
  const failure = copy.slice(copy.indexOf("catch {"));
  assert.doesNotMatch(failure.slice(0, failure.indexOf("}")), /setTimeout/, "a failure stays until the next press");
});

test("no fixed pixel widths and no CJK characters", () => {
  for (const [name, source] of [["Contact", contact], ["CopyButton", copy]]) {
    assert.doesNotMatch(source, /\bw-\[\d+px\]|width:\s*\d+px|min-w-\[\d+px\]|max-w-\[\d+px\]/, `${name}: fixed width`);
    assert.doesNotMatch(source, /[぀-ヿ㐀-鿿]/, `${name}: CJK`);
  }
});
