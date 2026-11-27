// The interests (components/city2d/sections/Interests.tsx): one <details>
// per interest from app/data/portfolio.ts, the first open, with the
// interest's photos from public/interests/<scene>/ (lib/interestPhotos.ts)
// as polaroids on a scrapbook page (Scrapbook.tsx; city.css, "The interests' scrapbook pages")
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { interests } from "../app/data/portfolio.ts";
import { interestPhotos } from "../app/lib/interestPhotos.ts";

const root = new URL("../", import.meta.url).pathname;
const read = (f) => readFileSync(`${root}${f}`, "utf8");
const source = readFileSync(`${root}app/components/city2d/sections/Interests.tsx`, "utf8");

// A temp public/interests with one folder, chess
const base = mkdtempSync(path.join(tmpdir(), "interests-"));
const chess = path.join(base, "chess");
mkdirSync(chess);
for (const file of ["10-x.jpg", "2-x.jpg", "1-board.PNG", "a b.webp", "c.avif", "d.jpeg", "f-placeholder.svg", "notes.txt", ".gitkeep", ".hidden.jpg", "e.gif"]) {
  writeFileSync(path.join(chess, file), "");
}
after(() => rmSync(base, { recursive: true, force: true }));

test("interestPhotos keeps image files only, in numeric file-name order", () => {
  const files = interestPhotos("chess", "Chess", undefined, base).map((p) => p.file);
  assert.deepEqual(files, ["1-board.PNG", "2-x.jpg", "10-x.jpg", "a b.webp", "c.avif", "d.jpeg", "f-placeholder.svg"]);
  assert.deepEqual(interestPhotos("chess", "Chess", undefined, base).filter((p) => p.placeholder).map((p) => p.file), ["f-placeholder.svg"]);
});

test("interestPhotos builds public URLs, encoding file names", () => {
  const photos = interestPhotos("chess", "Chess", undefined, base);
  assert.equal(photos[1].src, "/interests/chess/2-x.jpg");
  assert.equal(photos.find((p) => p.file === "a b.webp")?.src, "/interests/chess/a%20b.webp");
});

test("interestPhotos uses a caption as alt, else names the photo", () => {
  const photos = interestPhotos("chess", "Chess", { "2-x.jpg": "A long endgame" }, base);
  assert.equal(photos[0].alt, "Chess, photo 1");
  assert.equal(photos[1].alt, "A long endgame");
  assert.equal(photos[2].alt, "Chess, photo 3");
});

test("interestPhotos returns [] for a missing folder, and never throws", () => {
  assert.deepEqual(interestPhotos("poker", "Poker", undefined, base), []);
  assert.deepEqual(interestPhotos("chess", "Chess", undefined, path.join(base, "nowhere")), []);
});

test("the real folders exist for every interest, so photos can just be dropped in", () => {
  for (const interest of interests) {
    assert.ok(Array.isArray(interestPhotos(interest.scene, interest.name)));
    readFileSync(`${root}public/interests/${interest.scene}/.gitkeep`);
  }
});

test("every interest is a <details name=\"interests\">, only the first open", () => {
  assert.ok(interests.length > 0);
  assert.match(source, /import\s*\{[^}]*\binterests\b[^}]*\}\s*from\s*"[./]+\/data\/portfolio"/);
  assert.match(source, /interests\.map\(\(interest, i\)/);
  const details = source.match(/<details\s[^>]*>/g) ?? [];
  assert.equal(details.length, 1, "one <details> inside the map");
  assert.match(details[0], /name="interests"/);
  assert.match(details[0], /open=\{i === 0\}/);
  // its summary a full-width glass key, at least 56px tall (city.css)
  assert.match(source, /<summary className="glass w-full list-none /);
  assert.match(read("app/city.css"), /\.interest > summary \{\s*min-height: 3\.5rem;/, "the summary is at least 56px tall");
  assert.match(source, /<span aria-hidden="true"[^>]*>\s*<span className="group-open:hidden">Show<\/span>\s*<span className="hidden group-open:inline">Hide<\/span>/);
  assert.match(source, /<Heading level=\{3\}[^>]*>\s*\{interest\.name\}\s*<\/Heading>/);
  assert.match(source, /\{interest\.description\}/);
  assert.match(source, /^export default function Interests\(\)/m);
  assert.doesNotMatch(source, /^["']use client["']/m, "a server component");
});

test("the scrapbook is rendered only when there are photos, its polaroids from plain props", () => {
  assert.match(source, /interestPhotos\(interest\.scene, interest\.name, interest\.captions\)/);
  assert.match(source, /\{photos\.length > 0 && \(/);
  assert.match(source, /<Scrapbook\b/);
  assert.doesNotMatch(source, /\.css";/, "its rules live in city.css (one stylesheet compresses smaller)");
  const book = read("app/components/city2d/Scrapbook.tsx");
  assert.match(book, /^"use client";/);
  assert.doesNotMatch(book, /data\/portfolio/, "never the data file in a client component");
  assert.match(book, /<Image\b[^>]*\bfill\b/);
  assert.match(book, /unoptimized=\{photo\.src\.endsWith\("\.svg"\)\}/);
  assert.match(book, /aria-label="Previous photo"/);
  assert.match(book, /aria-label="Next photo"/);
  assert.match(book, /aria-live="polite"/);
  assert.equal((book.match(/className="glass glass-icon"/g) ?? []).length, 2);
  // flipping only moves, behind the still view and reduced-motion guard
  const all = read("app/city.css");
  const css = all.slice(all.indexOf("/* The interests' scrapbook pages"));
  assert.ok(css.length < all.length, "the scrapbook's rules are in city.css");
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\bwhite\b|\bblack\b/i, "colours only from the paper tokens");
  assert.doesNotMatch(css, /animation|infinite/);
  for (const m of css.matchAll(/transition:([^;]*);/g)) assert.doesNotMatch(m[1].replace(/transform|opacity/g, ""), /[a-z-]+ var\(--t-/, m[0]);
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\) \{\s*:root:not\(\[data-still="on"\]\) \[data-stack\] li \{\s*transition:/);
});

test("every interest has its placeholder photos until real ones go in", () => {
  for (const interest of interests) {
    const photos = interestPhotos(interest.scene, interest.name);
    assert.ok(photos.length > 0, interest.name);
  }
  assert.ok(interestPhotos("basketball", "Basketball").some((p) => p.placeholder && p.file.endsWith(".svg")));
});

test("no canvas, no 3D, no place names", () => {
  assert.doesNotMatch(source, /canvas/i);
  assert.doesNotMatch(source, /three|@react-three/);
  assert.doesNotMatch(source, /Lujiazui|Longtang|Century Avenue|Line 2|Nanjing Road|The Bund/);
});

test("every svg is hidden from assistive technology", () => {
  const svgs = source.match(/<svg\b[^>]*>/g) ?? [];
  assert.ok(svgs.length >= 2);
  for (const svg of svgs) assert.match(svg, /aria-hidden="true"/, svg);
});

test("no fixed pixel widths, no emoji, no per-card colour rotation", () => {
  assert.doesNotMatch(source, /\bw-\[\d+(\.\d+)?px\]/);
  assert.doesNotMatch(source, /(?<![-\w])width:\s*\d+(\.\d+)?px/);
  assert.doesNotMatch(source, /\p{Extended_Pictographic}/u);
  assert.doesNotMatch(source, /lantern/);
  assert.doesNotMatch(source, /accents\[/);
});
