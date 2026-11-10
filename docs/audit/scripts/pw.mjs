// A headless Chrome for the audit scripts, separate from any other browser
// session. Playwright isn't a dependency of the site: point PLAYWRIGHT at
// an installed copy (e.g. one under ~/.npm/_npx), or have it resolvable.
//   PLAYWRIGHT=/path/to/node_modules/playwright/index.mjs node docs/audit/scripts/shots.mjs …
const { chromium } = await import(process.env.PLAYWRIGHT || "playwright");
export { chromium };
export const launch = (opts = {}) =>
  chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", ...(opts.args || [])], ...opts });
