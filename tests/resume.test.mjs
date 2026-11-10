// The résumé viewer (app/components/resume): what keeps it light and keeps
// the résumé reachable. Its behaviour in a browser is checked by
// docs/ui/scripts/resume-viewer.mjs.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";
import { profile } from "../app/data/portfolio.ts";

const root = new URL("..", import.meta.url).pathname;
const read = (path) => readFileSync(root + path, "utf8");
const walk = (dir, out = []) => {
  for (const name of readdirSync(root + dir)) {
    const path = `${dir}/${name}`;
    if (statSync(root + path).isDirectory()) walk(path, out);
    else if (/\.(tsx?|mjs)$/.test(name)) out.push(path);
  }
  return out;
};
const sources = walk("app");

test("pdf.js is only ever loaded on demand, from the viewer's loader", () => {
  for (const file of sources) {
    const code = read(file);
    // Type-only imports vanish from the build; anything else would put
    // pdf.js in a page's JS
    const statics = [...code.matchAll(/^import\s+(?!type\b)[^;]*from\s+["']pdfjs-dist[^"']*["']/gm)];
    assert.equal(statics.length, 0, `${file} imports pdfjs-dist statically`);
    if (file !== "app/components/resume/pdf.ts") assert.ok(!/import\(\s*["']pdfjs-dist/.test(code), `${file} loads pdfjs-dist; only resume/pdf.ts should`);
  }
  const loader = read("app/components/resume/pdf.ts");
  assert.match(loader, /import\("pdfjs-dist\/legacy\/build\/pdf\.mjs"\)/);
  assert.match(loader, /new Worker\(new URL\("pdfjs-dist\/legacy\/build\/pdf\.worker\.min\.mjs", import\.meta\.url\)/);
});

test("the viewer itself is loaded on demand, by the host alone", () => {
  for (const file of sources) {
    const code = read(file);
    assert.ok(!/^import\s+(?!type\b)[^;]*from\s+["'][^"']*ResumeViewer["']/m.test(code), `${file} imports ResumeViewer statically`);
  }
  assert.match(read("app/components/resume/ResumeHost.tsx"), /import\("\.\/ResumeViewer"\)/);
  assert.match(read("app/layout.tsx"), /<ResumeHost \/>/);
});

test("pdfjs-dist is pinned to an exact version", () => {
  const { dependencies } = JSON.parse(read("package.json"));
  assert.match(dependencies["pdfjs-dist"] ?? "", /^\d+\.\d+\.\d+$/);
});

test("every résumé link is a real link to the PDF that opens the viewer", () => {
  // Only two places name the PDF's address: the link component, and the
  // contact page's directory line (marked to open the viewer)
  const users = sources.filter((file) => read(file).includes("profile.resumeUrl"));
  assert.deepEqual(users.sort(), ["app/components/resume/ResumeLink.tsx", "app/contact/page.tsx"]);
  assert.match(read("app/contact/page.tsx"), /href: profile\.resumeUrl, viewer: true/);
  const link = read("app/components/resume/ResumeLink.tsx");
  assert.match(link, /href=\{profile\.resumeUrl\}/);
  assert.match(link, /data-resume=""/);
  assert.match(read("app/components/locations/Payphone.tsx"), /data-resume=\{line\.viewer \? "" : undefined\}/);
  // The link component stays a server component: the listener is the host's
  assert.ok(!link.includes('"use client"'));
  for (const page of ["app/page.tsx", "app/about/page.tsx"]) assert.match(read(page), /<ResumeLink[\s>]/, `${page} uses ResumeLink`);
  assert.ok(existsSync(`${root}public${profile.resumeUrl}`));
});

test("the viewer's styles use the palette's tokens, not colours of their own", () => {
  const css = read("app/components/resume/resume.css");
  assert.deepEqual(css.match(/#[0-9a-f]{3,8}\b/gi) ?? [], []);
});

// After `npm run build`: no page's initial scripts carry pdf.js or the viewer
const built = existsSync(`${root}.next/server/app/index.html`);
test("no page's initial scripts include pdf.js or the viewer", { skip: !built && "no production build" }, () => {
  const pages = readdirSync(`${root}.next/server/app`).filter((f) => f.endsWith(".html"));
  for (const page of pages) {
    const html = readFileSync(`${root}.next/server/app/${page}`, "utf8");
    for (const [, src] of html.matchAll(/<script src="\/_next\/(static\/[^"]+\.js)"/g)) {
      const js = readFileSync(`${root}.next/${src}`, "utf8");
      assert.ok(!js.includes("GlobalWorkerOptions"), `${page}: ${src} contains pdf.js`);
      assert.ok(!js.includes("resume-percent"), `${page}: ${src} contains the viewer`);
    }
  }
});
