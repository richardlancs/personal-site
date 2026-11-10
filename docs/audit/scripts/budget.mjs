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
// - all JS and all CSS in the build, except the résumé viewer's
// - the résumé viewer's JS (pdf.js, its worker and the viewer) and CSS, loaded only
//   when the résumé is opened: on its own budget, so it can't hide growth
//   in what every visit downloads (and the world stays the largest chunk)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";

const dir = process.argv[2] || ".next";
const budgets = {
  // Baselines: 436854f (before the audit's motion and scene work) / the
  // audit's commit 7 / feature/richmond-hill-weather (Richmond Hill weather
  // and daylight, rain and snow, the remodelled vegetation's shaders, the
  // corner display: about 12 KB gzip of the world chunk, 6 KB of page JS).
  // Limits keep about 5% headroom over the last. Loading rain and snow on
  // demand was tried: their own code is 2.5 KB and the split cost every
  // visit 1.8 KB, so they stay in the world chunk.
  pageInitialJs: 210_000, // 193,785 / 194,150 / 199,980 (projects, the largest)
  largestChunkGzip: 316_000, // 287,831 / 288,428 / 300,650
  largestChunkRaw: 1_150_000, // 1,056,413 / 1,058,023 / 1,090,438
  totalJs: 536_000, // 492,642 / 492,141 / 510,283
  totalCss: 18_000, // 11,654 / 15,552 / 16,788
  // feature/baby-blue-glass-resume: pdfjs-dist 5.4.624's legacy build
  // (141,641), its worker (301,558) and the viewer (4,726)
  resumeJs: 470_000, // 447,925
  resumeCss: 2_500, // 1,915
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
// pdf.js and its worker name these; so does the viewer that drives them
const isResume = (f) => /WorkerMessageHandler|PDFWorker/.test(readFileSync(f, "utf8"));
const allJs = files.filter((f) => f.endsWith(".js")).map((f) => ({ f, raw: statSync(f).size, gz: gz(f), resume: isResume(f) }));
const js = allJs.filter((c) => !c.resume);
const allCss = files.filter((f) => f.endsWith(".css")).map((f) => ({ f, gz: gz(f), resume: readFileSync(f, "utf8").includes(".resume-lock") }));
const css = allCss.filter((c) => !c.resume);
const largest = js.reduce((a, b) => (b.raw > a.raw ? b : a));
const measured = {
  largestChunkGzip: largest.gz,
  largestChunkRaw: largest.raw,
  totalJs: js.reduce((a, b) => a + b.gz, 0),
  totalCss: css.reduce((a, b) => a + b.gz, 0),
  resumeJs: allJs.filter((c) => c.resume).reduce((a, b) => a + b.gz, 0),
  resumeCss: allCss.filter((c) => c.resume).reduce((a, b) => a + b.gz, 0),
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
