// Cold Lighthouse runs of one URL, several times per profile, with the
// median and range of each metric. Lighthouse isn't a dependency of the
// site; it runs through npx at a pinned version. Each run starts a fresh
// Chrome with a new, empty profile (no cache, no storage).
//
//   CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
//     node docs/audit/scripts/lighthouse.mjs <url> <out-dir> [runs=3] [profiles=mobile,desktop]
//
// "mobile" is Lighthouse's default (Moto G Power-sized screen, simulated
// slow 4G, 4x CPU slowdown); "desktop" is its desktop preset. The GPU
// flags let the 3D world draw (as it would for a visitor) instead of
// falling back to the painting.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const [url, out, runsArg = "3", profilesArg = "mobile,desktop"] = process.argv.slice(2);
if (!url || !out) {
  console.error("usage: node lighthouse.mjs <url> <out-dir> [runs] [profiles]");
  process.exit(2);
}
const LIGHTHOUSE = process.env.LIGHTHOUSE || "lighthouse@13.6.0";
const runs = Number(runsArg);
const profiles = profilesArg.split(",");
mkdirSync(out, { recursive: true });

const metrics = {
  score: (r) => r.categories.performance.score * 100,
  fcp: (r) => r.audits["first-contentful-paint"].numericValue,
  lcp: (r) => r.audits["largest-contentful-paint"].numericValue,
  tbt: (r) => r.audits["total-blocking-time"].numericValue,
  cls: (r) => r.audits["cumulative-layout-shift"].numericValue,
  si: (r) => r.audits["speed-index"].numericValue,
};

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

const summary = {};
const failures = [];
for (const profile of profiles) {
  const rows = [];
  for (let i = 1; i <= runs; i++) {
    const file = `${out}/${profile}-${i}.json`;
    const args = [
      "-y",
      LIGHTHOUSE,
      url,
      "--only-categories=performance",
      "--output=json",
      `--output-path=${file}`,
      "--quiet",
      "--chrome-flags=--headless=new --use-angle=metal --enable-gpu --ignore-gpu-blocklist",
      ...(profile === "desktop" ? ["--preset=desktop"] : []),
    ];
    // A run whose Chrome falls over (it happens, rarely) is retried, and
    // the failure is recorded rather than hidden
    let attempt = 0;
    for (;;) {
      try {
        execFileSync("npx", args, { stdio: "inherit" });
        break;
      } catch (error) {
        attempt++;
        failures.push({ profile, run: i, attempt, error: String(error.message).split("\n")[0] });
        if (attempt >= 3) throw error;
      }
    }
    const report = JSON.parse(readFileSync(file, "utf8"));
    const row = Object.fromEntries(Object.entries(metrics).map(([k, f]) => [k, f(report)]));
    const s = report.configSettings;
    row.settings = {
      formFactor: s.formFactor,
      screen: `${s.screenEmulation.width}x${s.screenEmulation.height}@${s.screenEmulation.deviceScaleFactor}`,
      throttlingMethod: s.throttlingMethod,
      rttMs: s.throttling.rttMs,
      throughputKbps: s.throttling.throughputKbps,
      cpuSlowdown: s.throttling.cpuSlowdownMultiplier,
      lighthouse: report.lighthouseVersion,
      userAgent: report.environment?.hostUserAgent,
      benchmarkIndex: report.environment?.benchmarkIndex,
    };
    rows.push(row);
    console.log(profile, i, JSON.stringify(Object.fromEntries(Object.keys(metrics).map((k) => [k, Math.round(row[k] * 1000) / 1000]))));
  }
  summary[profile] = {
    settings: rows[0].settings,
    runs: rows.map((r) => Object.fromEntries(Object.keys(metrics).map((k) => [k, r[k]]))),
    median: Object.fromEntries(Object.keys(metrics).map((k) => [k, median(rows.map((r) => r[k]))])),
    min: Object.fromEntries(Object.keys(metrics).map((k) => [k, Math.min(...rows.map((r) => r[k]))])),
    max: Object.fromEntries(Object.keys(metrics).map((k) => [k, Math.max(...rows.map((r) => r[k]))])),
  };
}
writeFileSync(`${out}/summary.json`, JSON.stringify({ url, date: new Date().toISOString(), failures, summary }, null, 2));
if (failures.length) console.log("failed attempts (retried):", JSON.stringify(failures));
console.log(JSON.stringify(summary, (k, v) => (typeof v === "number" ? Math.round(v * 1000) / 1000 : v), 2));
