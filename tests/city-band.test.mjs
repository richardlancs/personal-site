// The bands of painting at the top of each station (components/city2d/
// DistrictBand.tsx), the driver that sets their sky on <html> from
// Richmond Hill's clock (CityDriver.tsx), the plates themselves
// (app/assets/city/) and the hero over the first band (sections/Hero.tsx).
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";
import { pageSections } from "../app/sections/registry.ts";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");
const districts = [...new Set(pageSections.map((s) => s.district))];

// A WebP's pixel size from its header: lossy (VP8), lossless (VP8L) or
// extended (VP8X)
function webpSize(path) {
  const b = readFileSync(path);
  assert.equal(b.toString("ascii", 0, 4), "RIFF", path);
  assert.equal(b.toString("ascii", 8, 12), "WEBP", path);
  const chunk = b.toString("ascii", 12, 16);
  if (chunk === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (chunk === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (chunk === "VP8L") {
    const bits = b.readUInt32LE(21);
    return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
  }
  throw new Error(`${path}: unknown WebP chunk ${chunk}`);
}

test("the band reserves its height and never sets text over the painting", () => {
  const css = read("app/city.css");
  assert.match(css, /\.band\s*\{[^}]*aspect-ratio:\s*21\s*\/\s*9/);
  assert.match(css, /\.band\s*\{[^}]*max-height:/, "a very wide window still shows what's under the band");
  const band = read("app/components/city2d/DistrictBand.tsx");
  assert.match(band, /aria-hidden="true"/);
  // Nothing but the plates (and the no-script plate) is drawn in it
  assert.doesNotMatch(band, /<(p|h[1-6]|span)[\s>]/);
});

test("the band keeps its gradient when a plate fails, and has a no-script plate", () => {
  const src = read("app/components/city2d/DistrictBand.tsx");
  assert.match(src, /onError/);
  assert.match(src, /<noscript>/);
  assert.match(src, /alt=""/);
  assert.doesNotMatch(src, /alt="[^"]+"/, "every plate is decorative");
  assert.match(src, /platesNeeded\(/, "only the plates in use are mounted");
  // The home band: (max-width: 767px) 175vw, 100vw, so the phone crop asks
  // for a wide enough plate; the bands below ask for the screen's width
  // (a phone-sized file on a phone)
  assert.match(src, /sizes: priority \? BAND_SIZES : BELOW_SIZES/);
  assert.match(read("app/components/city2d/plates.ts"), /export const BELOW_SIZES = "100vw";/);
  assert.match(read("app/components/city2d/plates.ts"), /BAND_WIDTH = \{ phoneMax: 767, phoneScale: 1\.75 \}/);
  // No blurred stand-in to snap out of: the plate fades in once loaded
  assert.doesNotMatch(src, /placeholder="blur"/);
  assert.match(src, /onLoad=/);
  assert.match(src, /data-loaded=/);
  const css = read("app/city.css");
  assert.match(css, /\.band-plate img \{\s*opacity: 0;/);
  assert.match(css, /\.band-plate\[data-loaded\] img \{\s*opacity: 1;/);
  // A short fade on the motion tokens (--t-slow, under 300 ms), never a long one
  assert.match(css, /:root:not\(\[data-still="on"\]\) \.band-plate img \{\s*transition: opacity var\(--t-slow\)/);
  assert.match(css, /--t-slow: 280ms;/);
  // Below the first band the no-script plate is lazy too
  assert.match(src, /loading=\{priority \? undefined : "lazy"\}/);
});

test("the bands wait on one shared observer, half a screen ahead", () => {
  const near = read("app/components/city2d/useNear.ts");
  assert.equal((near.match(/new IntersectionObserver\(/g) ?? []).length, 1, "one observer");
  assert.match(near, /if \(!observer\) \{/, "made once, shared by every band");
  assert.match(near, /addEventListener\("scroll", onFirstScroll, \{ once: true, passive: true \}\)/, "no look-ahead before the first scroll");
  assert.match(near, /scrolled \|\| \(!deepLink\(\) && within\(entry\.target, 0\)\)/);
  assert.match(near, /rootMargin: ROOT_MARGIN/);
  assert.match(near, /const ROOT_MARGIN = "50% 0px"/);
  assert.match(near, /unobserve\(/, "each band is let go once seen");
  const band = read("app/components/city2d/DistrictBand.tsx");
  assert.match(band, /useNear\(ref, priority && !deepLinked\(\)\)/, "home skips the wait");
  assert.match(band, /blend === null \|\| !near \? \[\]/, "no plate before the band is near");
  assert.match(band, /fetchPriority=\{priority \? "high" : "low"\}/);
});

test("each district's crop keeps its subject, on both plates", () => {
  const plates = read("app/components/city2d/plates.ts");
  for (const d of ["lujiazui", "longtang", "towers", "metro", '"nanjing-road"', "bund"]) assert.match(plates, new RegExp(`\\n  ${d}: "\\d+% \\d+%"`), d);
  assert.match(read("app/components/city2d/DistrictBand.tsx"), /"--focal": focal\[district\]/);
  assert.match(read("app/city.css"), /object-position: var\(--focal, center\)/);
});

test("about, experience and contact sit on the lighter ground, and each band fades into its own", () => {
  const css = read("app/city.css");
  assert.match(css, /\.station:is\(#about, #experience, #contact\) \{\s*--ground: var\(--ink-2\);/);
  assert.match(css, /\.band::before \{[^}]*var\(--ground/);
});

test("only the home band loads early; the others wait until they're near", () => {
  const station = read("app/components/city2d/Station.tsx");
  assert.match(station, /<DistrictBand district=\{section\.district\}/);
  const band = read("app/components/city2d/DistrictBand.tsx");
  // Eager loading only behind the prop; next/image is lazy otherwise
  assert.doesNotMatch(band, /loading="eager"|priority=\{true\}|preload/);
  assert.match(band, /loading=\{priority \? "eager" : undefined\}/);
  assert.match(station, /priority=\{section\.id === "home"\}/);
});

test("the driver waits for the clock and writes the sky on <html>", () => {
  const src = read("app/components/city2d/CityDriver.tsx");
  assert.match(src, /now === 0/);
  assert.match(src, /documentElement/);
  assert.match(src, /cityVars\(/);
  // The preview only in development
  assert.match(src, /process\.env\.NODE_ENV === "development"/);
  // Nothing of the 3D world comes with it but the preview's parser
  assert.doesNotMatch(src, /from "three"|@react-three/);
  const layout = read("app/layout.tsx");
  assert.match(layout, /<CityDriver \/>/);
});

test("the sky is worked out in one place; the bands run no timers of their own", () => {
  const users = ["app/components/city2d/DistrictBand.tsx", "app/components/city2d/Station.tsx", "app/components/city2d/sections/Hero.tsx", "app/page.tsx", "app/layout.tsx"].filter((f) => read(f).includes("cityVars("));
  assert.deepEqual(users, []);
  const band = read("app/components/city2d/DistrictBand.tsx");
  assert.doesNotMatch(band, /setInterval|setTimeout|useRichmondHill/);
});

test("the band's day/night cross-fade, grade and bottom fade, still in still view", () => {
  const css = read("app/city.css");
  assert.match(css, /var\(--city-night/);
  assert.match(css, /\.band::after\s*\{[^}]*background:\s*var\(--city-grade\)[^}]*opacity:\s*var\(--city-grade-mix[,)][^}]*mix-blend-mode:\s*soft-light/);
  assert.match(css, /var\(--ground/);
  // The sky's slow cross-fade: 3 s, on its own token (scenery, not interface)
  assert.match(css, /--t-sky: 3s;/);
  assert.match(css, /transition:\s*opacity var\(--t-sky\)/);
  // Guarded as the rest of city.css is: none of it moves in still view
  assert.match(css, /:root\[data-still="on"\][^{]*\.band/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{\s*:root:not\(\[data-still\]\)[^{]*\.band/);
});

test("every district has both plates, the same size, none over 600 KB", () => {
  assert.equal(districts.length, 6);
  const plates = read("app/components/city2d/plates.ts");
  for (const d of districts) {
    const [day, night] = ["day", "night"].map((t) => `${root}app/assets/city/${d}-${t}.webp`);
    for (const f of [day, night]) {
      assert.ok(existsSync(f), f);
      assert.ok(statSync(f).size <= 600 * 1024, `${f} is ${statSync(f).size} bytes`);
      assert.ok(plates.includes(`/assets/city/${f.split("/").pop()}"`), `plates.ts imports ${f}`);
    }
    assert.deepEqual(webpSize(day), webpSize(night), `${d}: the day and night plates differ in size`);
  }
});

test("the hero has the name, the headline, two actions and three links, and no paragraph", () => {
  const src = read("app/components/city2d/sections/Hero.tsx");
  assert.ok(!src.includes('"use client"'), "the hero is a server component");
  assert.match(src, /<h1[^>]*>\{profile\.name\}<\/h1>/);
  assert.ok(!/<p[ >]/.test(src.replace(/<p className="[^"]*headline[^"]*"/, "")));
  assert.match(src, /<p className="[^"]*headline[^"]*"[^>]*>\{profile\.headline\}<\/p>/);
  // In 2D, anchors on the page; in the 3D city, next/link to the sections' pages
  assert.match(src, /<a href="#projects" className="glass glass-primary">/);
  assert.match(src, /<a href="#contact" className="glass">/);
  assert.match(src, /<Link href=\{cityPath\("projects"\)\} className="glass glass-primary">/);
  assert.match(src, /<Link href=\{cityPath\("contact"\)\} className="glass">/);
  // GitHub, LinkedIn and the résumé: the shared links, as text links
  assert.match(src, /<ProfileLinks variant="text" \/>/);
});

test("the home plate's head script: the same sun as the site's clock, a file from the band's own srcset, painted before hydration", async () => {
  const { SUN_JS, platePreloadScript } = await import("../app/lib/platePreload.ts");
  const { solarSun, addDays } = await import("../app/lib/time.ts");
  const sun = new Function(`return ${SUN_JS}`)();
  for (let date = "2026-01-01"; date < "2028-01-01"; date = addDays(date, 1)) {
    const [y, m, d] = date.split("-").map(Number);
    const { sunrise, sunset } = solarSun(date, 43.87111, -79.43725);
    assert.deepEqual(sun(y, m, d, 43.87111, -79.43725), [sunrise, sunset], date);
  }
  // Run it in a fake page: at noon, midnight and either side of sunset, at
  // a few widths, and on a deep link
  const place = { latitude: 43.87111, longitude: -79.43725, timeZone: "America/Toronto" };
  const srcset = (p) => [640, 1080, 1920, 3840].map((w) => `/img/${p}?w=${w} ${w}w`).join(", ");
  const band = { phoneMax: 767, phoneScale: 1.75 };
  const run = (iso, { width = 1440, dpr = 1, hash = "", pathname = "/" } = {}) => {
    const added = [];
    const vars = {};
    const attrs = {};
    const RealDate = Date;
    const fixed = new RealDate(iso).getTime();
    class FakeDate extends RealDate { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } }
    const document = {
      createElement: () => ({ setAttribute(k, v) { this[k] = v; } }),
      head: { appendChild: (l) => added.push(l) },
      documentElement: { style: { setProperty: (k, v) => (vars[k] = v) }, setAttribute: (k, v) => (attrs[k] = v) },
    };
    const window = { innerWidth: width, devicePixelRatio: dpr };
    new Function("document", "Date", "window", "location", platePreloadScript(place, srcset("day"), srcset("night"), band))(document, FakeDate, window, { hash, pathname });
    return { links: added.map((l) => `${l.rel} ${l.as} ${l.href} ${l.fetchpriority}`), plate: vars["--home-plate"] ?? null, which: attrs["data-home-plate"] ?? null };
  };
  const noon = run("2026-06-21T16:00:00Z");
  assert.deepEqual(noon, { links: ["preload image /img/day?w=1920 high"], plate: 'url("/img/day?w=1920")', which: "day" }, "noon, 1440 at 1x");
  assert.deepEqual(run("2026-06-21T04:00:00Z").which, "night", "midnight");
  // The preload and the painted background are one URL, picked from the
  // band's sizes: 412px at 1.75x on a phone draws 412 * 1.75 * 1.5 (the
  // phone's cap) = 1082 device px, so the 1920 file of this list; 390 at
  // 1x, 1080; 390 at 3x, capped, 1024, so 1080
  const phone = run("2026-06-21T16:00:00Z", { width: 412, dpr: 1.75 });
  assert.equal(phone.links[0], "preload image /img/day?w=1920 high");
  assert.equal(phone.plate, 'url("/img/day?w=1920")');
  assert.equal(run("2026-06-21T16:00:00Z", { width: 390, dpr: 3 }).plate, 'url("/img/day?w=1080")', "a phone's density capped at 1.5");
  assert.equal(run("2026-06-21T16:00:00Z", { width: 1440, dpr: 2 }).plate, 'url("/img/day?w=3840")', "no cap on wide screens");
  assert.equal(run("2026-06-21T16:00:00Z", { width: 390 }).plate, 'url("/img/day?w=1080")');
  assert.equal(run("2026-06-21T16:00:00Z", { width: 2560, dpr: 2 }).plate, 'url("/img/day?w=3840")', "the largest when none is wide enough");
  // Twilight: the plate the blend is closer to (day before sunset, night after)
  const { sunset } = solarSun("2026-06-21", 43.87111, -79.43725);
  assert.equal(run(new Date((sunset - 600) * 1000).toISOString()).which, "day", "ten minutes before sunset");
  assert.equal(run(new Date((sunset + 600) * 1000).toISOString()).which, "night", "ten minutes after sunset");
  // A deep link lands below the home band: nothing fetched or painted
  assert.deepEqual(run("2026-06-21T16:00:00Z", { hash: "#projects" }), { links: [], plate: null, which: null });
  assert.equal(run("2026-06-21T16:00:00Z", { hash: "#home" }).which, "day");
  // Another page (the 3D city's) has no home band: nothing fetched
  assert.deepEqual(run("2026-06-21T16:00:00Z", { pathname: "/city/projects" }), { links: [], plate: null, which: null });
  const layout = read("app/layout.tsx");
  assert.match(layout, /__html: PLATE_PRELOAD/);
});

test("the head script and the home band take the plate's URL from one source", () => {
  // The script's candidates are the band's own srcset (getImageProps with
  // the band's sizes) and the band's widths; the band's <img> for the
  // painted plate reuses the exact URL the script set, read back off <html>
  const layout = read("app/layout.tsx");
  assert.match(layout, /getImageProps\(\{ src: plate, alt: "", fill: true, sizes: BAND_SIZES, quality: HOME_QUALITY \}\)/, "the band's own srcset and sizes");
  assert.match(layout, /platePreloadScript\(richmondHill, bandSrcSet\(plates\.lujiazui\.day\), bandSrcSet\(plates\.lujiazui\.night\), BAND_WIDTH\)/);
  const plates = read("app/components/city2d/plates.ts");
  assert.match(plates, /BAND_SIZES = `\(max-width: \$\{BAND_WIDTH\.phoneMax\}px\) \$\{BAND_WIDTH\.phoneScale \* 100\}vw, 100vw`/, "sizes and the script's widths are one definition");
  const script = read("app/lib/platePreload.ts");
  assert.match(script, /l\.href=url/);
  assert.match(script, /setProperty\("--home-plate",'url\("'\+url\+'"\)'\)/, "the painted URL is the preloaded one");
  const helper = read("app/components/city2d/homePlate.ts");
  assert.match(helper, /getPropertyValue\("--home-plate"\)/);
  assert.match(helper, /getAttribute\("data-home-plate"\)/);
  const band = read("app/components/city2d/DistrictBand.tsx");
  assert.match(band, /paintedHomePlate\(\)/);
  assert.match(band, /painted\?\.plate === plate \? \{ src: painted\.src, unoptimized: true \}/, "the painted plate's <img> asks for that same file");
  assert.match(band, /data-home=\{priority \? "" : undefined\}/);
  const css = read("app/city.css");
  assert.match(css, /:root\[data-home-plate\] \.band\[data-home\] \{\s*background-image: var\(--home-plate\)/);
  assert.match(css, /background-size: cover/);
});

test("a deep link fetches no home plate: the head script and the bands wait for the jump", () => {
  const near = read("app/components/city2d/useNear.ts");
  assert.match(near, /function deepLink\(\)/);
  assert.match(near, /addEventListener\("scrollend", done/, "the smooth jump's end, not its first step");
  assert.match(near, /scrolled \|\| \(!deepLink\(\) && within\(entry\.target, 0\)\)/);
  const band = read("app/components/city2d/DistrictBand.tsx");
  assert.match(band, /useNear\(ref, priority && !deepLinked\(\)\)/);
  assert.match(read("app/lib/platePreload.ts"), /var h=location\.hash;if\(location\.pathname!=="\/"\|\|h&&h!=="#"&&h!=="#home"\)return;/);
});
