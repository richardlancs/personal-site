// Performance budgets for a production build (run `npm run build` first).
// Fails (exit 1) when the built site grows past them, so growth is a
// decision rather than an accident. The numbers are bytes, gzip -9 unless
// marked raw; the baseline they were set from is in docs/audit/performance.md.
//
//   node docs/audit/scripts/budget.mjs [.next]
//
// - initial JS of each page: the scripts its HTML loads before anything
//   else (the 3D world is not among them: it loads after the page)
// - the largest chunk (the 3D world: three.js, React Three Fiber, scenes)
// - all JS and all CSS in the build
import { readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";

const dir = process.argv[2] || ".next";
const budgets = {
  // baselines: 436854f (before the audit's motion and scene work) / commit 7
  // (CSS: after commits 3-6 brought the home actions, the design pass and
  // still view, 15,552; the limit keeps the same ~10% headroom)
  pageInitialJs: 205_000, // 193,785 / 194,150 (projects, the largest)
  largestChunkGzip: 300_000, // 287,831 / 288,428
  largestChunkRaw: 1_100_000, // 1,056,413 / 1,058,023
  totalJs: 520_000, // 492,642 / 492,141
  totalCss: 17_000, // 11,654 / 15,552
};

const gz = (file) => gzipSync(readFileSync(file), { level: 9 }).length;
const walk = (d, out = []) => {
  for (const name of readdirSync(d)) {
    const p = `${d}/${name}`;
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

const files = walk(`${dir}/static`);
const js = files.filter((f) => f.endsWith(".js")).map((f) => ({ f, raw: statSync(f).size, gz: gz(f) }));
const css = files.filter((f) => f.endsWith(".css")).map((f) => ({ f, gz: gz(f) }));
const largest = js.reduce((a, b) => (b.raw > a.raw ? b : a));
const measured = {
  largestChunkGzip: largest.gz,
  largestChunkRaw: largest.raw,
  totalJs: js.reduce((a, b) => a + b.gz, 0),
  totalCss: css.reduce((a, b) => a + b.gz, 0),
};

// Each prerendered page's own scripts
const pages = walk(`${dir}/server/app`).filter((f) => f.endsWith(".html") && !/_global-error|_not-found/.test(f));
const perPage = {};
for (const page of pages) {
  const html = readFileSync(page, "utf8");
  const srcs = [...new Set([...html.matchAll(/<script src="\/_next\/(static\/[^"]+\.js)"/g)].map((m) => m[1]))];
  perPage[page.slice(`${dir}/server/app/`.length)] = srcs.reduce((sum, src) => sum + gz(`${dir}/${src}`), 0);
}
measured.pageInitialJs = Math.max(...Object.values(perPage));

let failed = false;
for (const [key, limit] of Object.entries(budgets)) {
  const value = measured[key];
  const ok = value <= limit;
  failed ||= !ok;
  console.log(`${ok ? "ok  " : "OVER"} ${key.padEnd(18)} ${String(value).padStart(9)} / ${limit}`);
}
console.log("initial JS per page (gzip):", JSON.stringify(perPage));
console.log("largest chunk:", largest.f.split("/").pop());
process.exit(failed ? 1 : 0);
