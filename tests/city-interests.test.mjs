// The interests (components/city2d/sections/Interests.tsx): one <details>
// per interest from app/data/portfolio.ts, the first open, with the
// interest's photos from public/interests/<scene>/ (lib/interestPhotos.ts)
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { interests } from "../app/data/portfolio.ts";
import { interestPhotos } from "../app/lib/interestPhotos.ts";

const root = new URL("../", import.meta.url).pathname;
const source = readFileSync(`${root}app/components/city2d/sections/Interests.tsx`, "utf8");

// A temp public/interests with one folder, chess
const base = mkdtempSync(path.join(tmpdir(), "interests-"));
const chess = path.join(base, "chess");
mkdirSync(chess);
for (const file of ["10-x.jpg", "2-x.jpg", "1-board.PNG", "a b.webp", "c.avif", "d.jpeg", "notes.txt", ".gitkeep", ".hidden.jpg", "e.gif"]) {
  writeFileSync(path.join(chess, file), "");
}
after(() => rmSync(base, { recursive: true, force: true }));

test("interestPhotos keeps image files only, in numeric file-name order", () => {
  const files = interestPhotos("chess", "Chess", undefined, base).map((p) => p.file);
  assert.deepEqual(files, ["1-board.PNG", "2-x.jpg", "10-x.jpg", "a b.webp", "c.avif", "d.jpeg"]);
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
  assert.match(source, /<summary\b[^>]*min-h-14/, "the summary is at least 56px tall");
  assert.match(source, /<Heading level=\{3\}[^>]*>\s*\{interest\.name\}\s*<\/Heading>/);
  assert.match(source, /\{interest\.description\}/);
  assert.match(source, /^export default function Interests\(\{ where = "2d" \}/m);
  assert.doesNotMatch(source, /^["']use client["']/m, "a server component");
});

test("the gallery is rendered only when there are photos", () => {
  assert.match(source, /interestPhotos\(interest\.scene, interest\.name, interest\.captions\)/);
  assert.match(source, /\{photos\.length > 0 && \(/);
  assert.match(source, /<Image\b[^>]*\bfill\b/);
  assert.match(source, /aspect-\[4\/3\]/);
  assert.match(source, /object-cover/);
  assert.match(source, /target="_blank"\s+rel="noopener noreferrer"/);
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
