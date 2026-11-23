// The city's painting (components/city2d/DistrictBand.tsx: the journey's
// panorama, or a station's band read top to bottom), the driver that sets
// its sky on <html> from Richmond Hill's clock (CityDriver.tsx), the tiles
// themselves (app/assets/city/panorama/; their joins: city-panorama.test)
// and the hero over the first stop (sections/Hero.tsx).
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const read = (path) => readFileSync(`${root}${path}`, "utf8");

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
  // The journey's tiles ask for their drawn width (as tall as the stage, or
  // the strip on phones); a station's band, read top to bottom, the screen's
  assert.match(src, /sizes: whole \? tileSizes\(tile\.w\) : "100vw"/);
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
  // Below the first tile the no-script plate is lazy too
  assert.match(src, /loading=\{i \? "lazy" : undefined\}/);
});

test("the bands wait on one shared observer, half a screen ahead", () => {
  const near = read("app/components/city2d/useNear.ts");
  assert.equal((near.match(/new IntersectionObserver\(/g) ?? []).length, 1, "one observer");
  assert.match(near, /if \(!observer\) \{/, "made once, shared by every band");
  // No look-ahead before the first scroll; after it, at every scroll (the
  // journey's tiles off the stage's clipped edge are never reported)
  assert.match(near, /addEventListener\("scroll", onFirstScroll, \{ passive: true \}\)/);
  assert.match(near, /scrolled \|\| \(!deepLink\(\) && within\(entry\.target, 0\)\)/);
  assert.match(near, /rootMargin: ROOT_MARGIN/);
  // Half a screen every way: down the stacked page, along the journey
  assert.match(near, /const ROOT_MARGIN = "50%"/);
  assert.match(near, /r\.right > -n && r\.left < window\.innerWidth \+ n/, "ahead sideways too");
  assert.match(near, /r\.width > 0 &&/, "nothing hidden is near (a station's band on the journey)");
  assert.match(near, /unobserve\(/, "each band is let go once seen");
  const band = read("app/components/city2d/DistrictBand.tsx");
  assert.match(band, /useNear\(ref, home && showing\(whole\) && !deepLinked\(\)\)/, "the home tile of the band that shows skips the wait");
  assert.match(band, /blend === null \|\| !near \? \[\]/, "no plate before the tile is near");
  assert.match(band, /fetchPriority=\{home \? "high" : "low"\}/);
});

test("each station's band, read top to bottom, is its own stop's tile", () => {
  const station = read("app/components/city2d/Station.tsx");
  assert.match(station, /<DistrictBand stop=\{pageSections\.indexOf\(section\)\} /);
  const band = read("app/components/city2d/DistrictBand.tsx");
  assert.match(station, /tiles=\{\[bandTiles\[pageSections\.indexOf\(section\)\]\]\}/);
  assert.match(band, /whole \? tiles\.map\(\(tile, i\) => <Tile key=\{i\} tile=\{tile\} i=\{i\} whole \/>\) : <Tile tile=\{tiles\[0\]\} i=\{stop\} whole=\{false\} \/>/);
  assert.match(read("app/city.css"), /\.band-plate img,\s*\.band-noscript \{[^}]*object-fit: cover;/);
});

test("about, experience and contact sit on the lighter ground, and each band fades into its own", () => {
  const css = read("app/city.css");
  assert.match(css, /\.station:is\(#about, #experience, #contact\) \{\s*--ground: var\(--ink-2\);/);
  assert.match(css, /\.band::before \{[^}]*var\(--ground/);
});

test("only the home tile loads early; the others wait until they're near", () => {
  const band = read("app/components/city2d/DistrictBand.tsx");
  // Mounted only once near (useNear is the lazy loading: the browser's own
  // would wait until a tile is past the stage's clip, on the screen), and
  // only the journey's home tile skips the wait and asks first
  assert.doesNotMatch(band, /priority=\{true\}|preload/);
  assert.match(band, /const home = i === 0 && whole;/);
  assert.match(band, /loading="eager"/);
  assert.match(band, /fetchPriority=\{home \? "high" : "low"\}/);
  // The journey's panorama is CityTrack's, once, in the stage
  assert.match(read("app/page.tsx"), /<DistrictBand tiles=\{bandTiles\} \/>/);
});

test("the driver waits for the clock and writes the sky on <html>", () => {
  const src = read("app/components/city2d/CityDriver.tsx");
  assert.match(src, /now === 0/);
  assert.match(src, /documentElement/);
  assert.match(src, /cityVars\(/);
  // The preview only in development
  assert.match(src, /process\.env\.NODE_ENV === "development"/);
  // No three.js (the 3D city is gone; nothing may bring it back onto the page)
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

test("every tile of the panorama has both plates, the same size, none over 600 KB", () => {
  const pano = read("app/components/city2d/panoramaImages.ts");
  const count = (pano.match(/\{ day: day\d\d, night: night\d\d \}/g) ?? []).length;
  assert.equal(count, 6);
  for (let i = 1; i <= count; i++) {
    const [day, night] = ["day", "night"].map((t) => `${root}app/assets/city/panorama/${t}-0${i}.webp`);
    for (const f of [day, night]) {
      assert.ok(existsSync(f), f);
      assert.ok(statSync(f).size <= 600 * 1024, `${f} is ${statSync(f).size} bytes`);
    }
    assert.deepEqual(webpSize(day), webpSize(night), `tile ${i}: the day and night plates differ in size`);
  }
});

test("the hero has the name, the headline, the school, one primary action and the links as text, and no paragraph", () => {
  const src = read("app/components/city2d/sections/Hero.tsx");
  assert.ok(!src.includes('"use client"'), "the hero is a server component");
  assert.match(src, /<h1[^>]*>\{profile\.name\}<\/h1>/);
  // Words only from the data: the headline, and the school and programme
  // (the education entry); no other paragraph
  assert.match(src, /<p className="[^"]*headline[^"]*"[^>]*>\{profile\.headline\}<\/p>/);
  assert.match(src, /experience\.find\(\(entry\) => entry\.kind === "education"\)/);
  assert.match(src, /\{school\.role\}, \{school\.organization\}/);
  assert.equal((src.match(/<p[ >]/g) ?? []).length, 2, "the headline and the school, nothing else");
  // One primary action; Contact, the shared links and the email as text links
  assert.equal((src.match(/className="glass/g) ?? []).length, 1);
  assert.match(src, /<a href="#projects" className="glass glass-primary">/);
  assert.match(src, /<a href="#contact" className="text-link text-link-solo">/);
  assert.match(src, /<ProfileLinks variant="text" \/>/);
  assert.match(src, /href=\{`mailto:\$\{email\.address\}`\} className="text-link text-link-solo"/);
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
  // The home tile: 1672 x 941, so drawn 1.777 times the stage's height (or the phone's strip, 30% of it and 64px)
  const ratio = 1672 / 941;
  const run = (iso, { width = 1440, height = 900, dpr = 1, hash = "", pathname = "/", track = "on" } = {}) => {
    const added = [];
    const vars = {};
    const attrs = {};
    const RealDate = Date;
    const fixed = new RealDate(iso).getTime();
    class FakeDate extends RealDate { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } }
    const document = {
      createElement: () => ({ setAttribute(k, v) { this[k] = v; } }),
      head: { appendChild: (l) => added.push(l) },
      documentElement: { style: { setProperty: (k, v) => (vars[k] = v) }, setAttribute: (k, v) => (attrs[k] = v), getAttribute: (k) => (k === "data-track" ? track : null) },
    };
    const window = { innerWidth: width, innerHeight: height, devicePixelRatio: dpr };
    new Function("document", "Date", "window", "location", platePreloadScript(place, srcset("day"), srcset("night"), ratio))(document, FakeDate, window, { hash, pathname });
    return { links: added.map((l) => `${l.rel} ${l.as} ${l.href} ${l.fetchpriority}`), plate: vars["--home-plate"] ?? null, which: attrs["data-home-plate"] ?? null };
  };
  const noon = run("2026-06-21T16:00:00Z");
  // 900 tall: drawn 1599 px wide, so the 1920 file of this list
  assert.deepEqual(noon, { links: ["preload image /img/day?w=1920 high"], plate: 'url("/img/day?w=1920")', which: "day" }, "noon, 1440 x 900 at 1x");
  assert.deepEqual(run("2026-06-21T04:00:00Z").which, "night", "midnight");
  // The preload and the painted background are one URL, picked from the
  // tile's sizes: a phone's strip, 390 x 844, is 0.3 * 844 + 64 = 317 tall,
  // drawn 563 wide; at 3x, capped at 1.5, 845 device px, so 1080; at 1x, 640
  const phone = run("2026-06-21T16:00:00Z", { width: 390, height: 844, dpr: 3 });
  assert.equal(phone.links[0], "preload image /img/day?w=1080 high");
  assert.equal(phone.plate, 'url("/img/day?w=1080")', "a phone's density capped at 1.5");
  assert.equal(run("2026-06-21T16:00:00Z", { width: 390, height: 844 }).plate, 'url("/img/day?w=640")');
  assert.equal(run("2026-06-21T16:00:00Z", { width: 1440, dpr: 2 }).plate, 'url("/img/day?w=3840")', "no cap on wide screens");
  assert.equal(run("2026-06-21T16:00:00Z", { width: 844, height: 390 }).plate, 'url("/img/day?w=1080")', "a phone on its side: the stage's height");
  assert.equal(run("2026-06-21T16:00:00Z", { width: 2560, height: 1440, dpr: 2 }).plate, 'url("/img/day?w=3840")', "the largest when none is wide enough");
  // Read top to bottom (no journey), the stations' bands have no home tile: nothing fetched
  assert.deepEqual(run("2026-06-21T16:00:00Z", { track: null }), { links: [], plate: null, which: null });
  // Twilight: the plate the blend is closer to (day before sunset, night after)
  const { sunset } = solarSun("2026-06-21", 43.87111, -79.43725);
  assert.equal(run(new Date((sunset - 600) * 1000).toISOString()).which, "day", "ten minutes before sunset");
  assert.equal(run(new Date((sunset + 600) * 1000).toISOString()).which, "night", "ten minutes after sunset");
  // A deep link lands below the home band: nothing fetched or painted
  assert.deepEqual(run("2026-06-21T16:00:00Z", { hash: "#projects" }), { links: [], plate: null, which: null });
  assert.equal(run("2026-06-21T16:00:00Z", { hash: "#home" }).which, "day");
  // Another page (the 404) has no home band: nothing fetched
  assert.deepEqual(run("2026-06-21T16:00:00Z", { pathname: "/no-such-page" }), { links: [], plate: null, which: null });
  const layout = read("app/layout.tsx");
  assert.match(layout, /__html: PLATE_PRELOAD/);
});

test("the head script and the home tile take the plate's URL from one source", () => {
  // The script's candidates are the tile's own srcset (getImageProps with
  // the tile's sizes) and its shape; the tile's <img> for the painted plate
  // reuses the exact URL the script set, read back off <html>
  const layout = read("app/layout.tsx");
  assert.match(layout, /getImageProps\(\{ src: home\[plate\], alt: "", fill: true, sizes: tileSizes\(home\.w\), quality: HOME_QUALITY\[plate\] \}\)/, "the tile's own srcset, sizes and quality");
  assert.match(layout, /platePreloadScript\(richmondHill, tileSrcSet\("day"\), tileSrcSet\("night"\), home\.w \/ HEIGHT\)/);
  // The same quality on the tile's own <img>, and allowed by the config: 60 by day, 40 by night
  assert.match(read("app/components/city2d/DistrictBand.tsx"), /quality: home \? HOME_QUALITY\[plate\] : undefined/);
  assert.match(read("app/components/city2d/homePlate.ts"), /export const HOME_QUALITY: Record<Plate, number> = \{ day: 60, night: 40 \};/);
  assert.match(read("next.config.ts"), /qualities: \[40, 60, 75\]/);
  const helper = read("app/components/city2d/homePlate.ts");
  assert.match(helper, /\(max-aspect-ratio: 1\/1\) calc\(\$\{\+\(r \* 30\)\.toFixed\(2\)\}vh \+ \$\{Math\.round\(r \* 64\)\}px\), \$\{\+\(r \* 100\)\.toFixed\(2\)\}vh/, "sizes and the script's widths agree");
  const script = read("app/lib/platePreload.ts");
  assert.match(script, /need=\$\{ratio\}\*\(ph\?0\.3\*vh\+64:vh\)/);
  assert.match(script, /l\.href=url/);
  assert.match(script, /setProperty\("--home-plate",'url\("'\+url\+'"\)'\)/, "the painted URL is the preloaded one");
  assert.match(helper, /getPropertyValue\("--home-plate"\)/);
  assert.match(helper, /getAttribute\("data-home-plate"\)/);
  const band = read("app/components/city2d/DistrictBand.tsx");
  assert.match(band, /paintedHomePlate\(\)/);
  assert.match(band, /painted\?\.plate === plate \? \{ src: painted\.src, unoptimized: true \}/, "the painted plate's <img> asks for that same file");
  assert.match(band, /data-home=\{home \? "" : undefined\}/);
  const css = read("app/city.css");
  assert.match(css, /:root\[data-home-plate\] \.band-tile\[data-home\] \{\s*background: var\(--home-plate\) center \/ cover no-repeat;/);
});

test("a deep link fetches no home plate: the head script and the bands wait for the jump", () => {
  const near = read("app/components/city2d/useNear.ts");
  assert.match(near, /function deepLink\(\)/);
  assert.match(near, /addEventListener\("scrollend", done/, "the smooth jump's end, not its first step");
  assert.match(near, /scrolled \|\| \(!deepLink\(\) && within\(entry\.target, 0\)\)/);
  const band = read("app/components/city2d/DistrictBand.tsx");
  assert.match(band, /useNear\(ref, home && showing\(whole\) && !deepLinked\(\)\)/);
  assert.match(read("app/lib/platePreload.ts"), /var h=location\.hash;if\(location\.pathname!=="\/"\|\|h&&h!=="#"&&h!=="#home"\|\|document\.documentElement\.getAttribute\("data-track"\)!=="on"\)return;/);
});
