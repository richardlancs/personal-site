# Performance: measured, then changed (10 November 2026)

Commit 7 of the audit (`perf(scene): reduce measured rendering costs`).
What was measured before anything in the renderer changed, what the
traces showed, the two changes they justified, the same measurements
after, and what a lab on one laptop can't say.

- Before: `436854f` (commit 2 of the audit; the renderer as on `main`)
- After: commit 6 (still view) + commit 7, built locally
- Production: https://personal-site-flame-eight-52.vercel.app (live,
  read-only, deployed from `main`; same renderer as "before")

## Setup

| | |
|---|---|
| Machine | Apple M2, 8 GB, macOS 15.6, on mains power; other agents' builds and browsers were running on the same machine at times (see "Limits") |
| Browser | Google Chrome 157 headless, WebGL on Metal through ANGLE (`--use-angle=metal --enable-gpu --ignore-gpu-blocklist`), so the world is drawn as a visitor's would be, not replaced by the painting |
| Lighthouse | 13.6.0 through `npx` (not a dependency), performance category only, fresh Chrome profile per run (cold: no cache, no storage) |
| Lighthouse mobile | its default: 412×823 at DPR 1.75, simulated throttling, 150 ms RTT, 1.6 Mbps down, 4× CPU slowdown. The benchmark index varied from 1,804.5 to 3,238.5 across the runs (the machine was shared with other work); "before-2" (1,982.5–2,070 mobile, 1,804.5–2,031 desktop) and "after-2" (2,052–2,062.5 mobile, 2,002–2,070 desktop) ran at matching indexes, which is why the comparison uses them |
| Lighthouse desktop | `--preset=desktop`: 1350×940 at DPR 1, simulated throttling, 40 ms RTT, 10 Mbps, no CPU slowdown |
| Local server | `npm run build && npx next start` (production build) |
| Traces | Playwright 1.66 driving the same Chrome; CPU slowdown through CDP `Emulation.setCPUThrottlingRate` (1× and 4×); 1440×1000 desktop and 390×844 touch phone (DPR 2, the mobile renderer tier) |

Scripts (reproducible; Playwright and Lighthouse are external tools):

- `docs/audit/scripts/lighthouse.mjs <url> <out> [runs] [profiles]`:
  N cold runs per profile, every run's JSON, and `summary.json` with the
  median, min and max of score, FCP, LCP, TBT, CLS and Speed Index plus
  the settings Lighthouse used. A run whose Chrome falls over is retried
  and recorded.
- `docs/audit/scripts/trace.mjs <base> <out.json> [runs] [cpu]`: frame
  timing and main-thread work, separate from Lighthouse: the world's own
  marks (`world:first-frame`, `world:<scene>`, `park:<stage>`,
  `tex:<name>`; new: `world:shaders-ready`), long tasks, long animation
  frames with their scripts, and `requestAnimationFrame` deltas during
  the walk-in, at rest, and during a park → workshop journey.
- `docs/audit/scripts/budget.mjs [.next]`: byte budgets for a build
  (below); exits 1 when one is exceeded.
- `docs/audit/scripts/motion.mjs <base>`: still view and interrupted
  journeys (commit 6); not a performance measure, listed for completeness.

## Lighthouse, the park page (`/`), 3 cold runs each

Median (min–max). Times in ms.

| Profile | Build | Score | FCP | LCP | TBT | CLS | SI |
|---|---|---|---|---|---|---|---|
| mobile | production (live) | 67 (57–69) | 921 (908–930) | 2,161 (2,108–3,868) | 5,796 (4,362–7,752) | 0 | 3,885 (2,893–4,052) |
| mobile | before, set 1 | 67 (66–67) | 764 (761–787) | 2,695 (2,688–2,701) | 3,464 (3,377–3,893) | 0 | 2,601 (2,446–2,832) |
| mobile | before, set 2 | 67 (67–68) | 755 (755–757) | 2,656 (2,640–2,666) | 2,392 (2,384–2,821) | 0 | 2,634 (2,533–3,224) |
| mobile | after, set 1 | 69 (68–69) | 756 (755–756) | 2,654 (2,648–2,666) | 1,937 (1,788–2,268) | 0 | 2,711 (2,665–2,757) |
| mobile | after, set 2 | 69 (68–69) | 756 (755–757) | 2,658 (2,653–2,663) | 1,919 (1,871–2,065) | 0 | 2,667 (2,536–2,679) |
| desktop | production (live) | 66 (64–68) | 293 (257–305) | 293 (257–305) | 1,803 (1,163–2,317) | 0 | 2,135 (1,743–2,622) |
| desktop | before, set 1 | 61 (60–67) | 213 (209–232) | 213 (209–232) | 4,725 (1,233–6,556) | 0 | 3,780 (1,883–5,704) |
| desktop | before, set 2 | 70 (65–71) | 207 (206–233) | 207 (206–233) | 975 (861–1,427) | 0 | 1,550 (1,490–2,258) |
| desktop | after, set 1 | 74 (74–76) | 206 (205–206) | 206 (205–206) | 629 (558–641) | 0 | 1,375 (1,334–1,383) |
| desktop | after, set 2 | 75 (74–76) | 206 (206–208) | 206 (206–208) | 578 (567–632) | 0 | 1,363 (1,343–1,438) |

Raw runs (TBT, ms): production mobile 4,362 / 7,752 / 5,796, desktop
1,803 / 1,163 / 2,317; before mobile 3,377 / 3,464 / 3,893 and 2,821 /
2,384 / 2,392, desktop 1,233 / 4,725 / 6,556 and 1,427 / 975 / 861;
after mobile 2,268 / 1,788 / 1,937 and 1,919 / 1,871 / 2,065, desktop
641 / 558 / 629 and 632 / 567 / 578. A first attempt at the "before"
mobile set had one run at TBT 18,000 ms (a single 10 s task) and one
Chrome crash ("Target closed"); it was discarded and the set re-run, and
the script now retries and records such failures. Every JSON report is
kept with the audit evidence (not in git).

Reading it:

- **TBT is the metric that moves, and the only poor one.** FCP, LCP, CLS
  and Speed Index are unchanged within noise (CLS is 0 everywhere). The
  "before" desktop TBT swung from 0.9 s to 6.6 s between runs: the
  first frame's wait for the GPU (below) is what varies. After, the
  desktop runs sit at 0.56–0.64 s and mobile at 1.8–2.3 s: lower and far
  steadier. Against the better of the two "before" sets: desktop TBT
  −35 to −40 %, mobile −19 %.
- Lab LCP on the mobile profile is ~2.65 s locally (2.16 s median on
  production's CDN), at the 2.5 s line. It's the page's words (the 3D
  world never paints the LCP element: it loads after the page), so it's
  network and font timing under simulated slow 4G, not the renderer.
  Nothing here changed it.

## Traces: where the main thread goes

`trace.mjs`, 3 runs per row, median [min–max], ms. "Blocking" is the sum
over long tasks of the part beyond 50 ms (TBT's definition, observed,
not simulated).

| | desktop 1× before | after | desktop 4× before | after | phone 1× before | after | phone 4× before | after |
|---|---|---|---|---|---|---|---|---|
| park build (`world:park`) | 343 [314–443] | 316 [307–317] | 1,388 | 1,275 | 249 | 235 | 1,309 | 1,017 |
| first frame (`world:first-frame`) | 801 [773–1,078] | 933 [879–1,012] | 2,060 | 2,174 | 798 | 887 | 2,507 | 2,295 |
| blocking before the first frame | 424 | 376 | 1,842 | 1,713 | 390 | 311 | 2,320 | 1,678 |
| longest frame in the walk-in | 500 [467–833] | 200 [200–200] | 1,817 | 883 | 467 [400–633] | 117 [117–133] | 2,133 | 533 |
| blocking in the walk-in (3 s) | 260 | 228 | 1,049 | 1,245 | 128 | 66 | 1,417 | 454 |
| at rest: fps / p95 frame | 59.8 / 16.8 | 59.9 / 16.8 | 59.6 / 16.8 | 59.6 / 16.8 | 59.4 / 16.8 | 59.9 / 16.7 | 59.2 / 16.8 | 59.8 / 16.7 |
| journey: longest frame | 83 [67–583] | 83 [67–117] | 133 [83–150] | 133 [117–750] | 150 [100–333] | 67 [67–67] | 367 [283–450] | 267 [233–283] |
| journey: longest task | 89 [78–285] | 85 [79–121] | 136 | 129 [114–651] | 154 [100–283] | 69 [68–78] | 325 [280–365] | 223 [182–255] |

(One "after" phone 4× run had a 6.2 s first frame; the range of that
column is wide for that one run. Console errors: none in any run.)

Single traced runs with Chrome's own tracing (desktop, 1×) show what the
long tasks are made of:

| Task | Before | After |
|---|---|---|
| park build (React render of the scene) | 420 ms | 468 ms (unchanged work) |
| the first frame | 344 ms, of which 250 ms waiting for the GPU (`CommandBufferHelper::Finish`: shader compile and link) | 147 ms, of which 65 ms waiting; plus 91 ms before it (85 ms waiting) when the shaders are requested |
| fonts loaded, signs repainted | 213 ms | 193 ms (unchanged work) |
| far scenery (idle) | 271 ms | 224 ms (unchanged work) |
| journey: the frame the workshop first appears in | 234 ms, 107 ms waiting for the GPU | 98 ms, 76 ms waiting |
| journey: the frame a monitor's screenshot first shows | 130 ms, 60 ms of it decoding the image on the main thread | gone (decoded off the main thread) |

At rest the world holds 60 fps on this machine at both tiers, with or
without a 4× CPU slowdown; per-frame script is about 4–5 ms on desktop
(three.js's render traversal and matrix updates). Nothing to fix there.

## What the traces identified, and what changed

1. **Shader compile and link inside frames.** The single largest wait
   on the main thread was the first frame blocking on the GPU while
   the scene's shader programs compiled and linked (250 ms here; Lighthouse's runs show
   it can take seconds), and again at every journey's threshold, when
   the next place is first drawn with its own lights. Now
   (`World3D.tsx`, `Warm`): the first place's shaders are requested with
   `renderer.compileAsync` (the `KHR_parallel_shader_compile` path), the
   frame loop starts when they're ready (at most 2.5 s later, whatever
   the driver does), and each place built ahead of time has its shaders
   compiled in idle time with its own lights, its sun casting shadows,
   fog, and the painterly pass's render target bound, so the programs
   are the ones its frames will ask for; its painted textures are
   uploaded (`initTexture`) at the same time. The first frame comes
   ~90–130 ms later (the words don't wait for it), and the walk-in's
   worst frame drops from 0.5 s to 0.2 s on desktop and from 0.47 s to
   0.12 s on the phone tier.
2. **Screenshots decoded on the main thread.** The workshop's monitors
   loaded their screenshots as `<img>` textures, which Chrome decoded
   during the frame that first showed them (60 ms). They now go through
   `createImageBitmap` (`THREE.ImageBitmapLoader`, decoded off the main
   thread), flipped by the texture's UV transform rather than by an
   option some browsers lack; browsers without `createImageBitmap` keep
   the old loader.

Checked unchanged: the same four places photographed at rest in still
view before and after (`rest-shot`, pixel diff): the park is identical
(0.01 % of pixels, none by more than 48/765); the interiors differ only
along edges by a sub-pixel camera offset, because commit 6 makes the
wide-screen framing snap rather than glide in still view. The monitors'
screenshots are the right way up.

Kept as they were: lazy loading of the world after the page, the
renderer tiers and pixel-ratio caps, stopping the frame loop when the
tab is hidden, the world is off screen or covered by the sheet,
on-demand frames in still view, the painting where WebGL is missing.

## What wasn't changed, and why

- **The park's build (0.24–0.34 s at 1×, 1.0–1.4 s at 4×)** is the next
  largest task, and the remaining TBT is mostly it. Splitting it across
  frames would mean making the scene's construction asynchronous
  (Suspense or staged state) through a 420-line file; the per-stage
  marks say the trees (≈170 ms) and grass (≈100 ms) dominate. Worth it
  only with a real mid-range phone showing it matters; not done here.
- **The other places built in idle time (14–121 ms each, up to 0.6 s at
  4×)** can delay a click that lands during one. Input delay wasn't
  measured (no INP in the lab); left.
- **Bytes.** The 3D chunk is 1,058,023 bytes (288,428 gzip): three.js,
  React Three Fiber and the scenes. All script parse and compile on the
  page is 111–121 ms in the "before" mobile runs' main-thread breakdown
  (simulated 4×), small next to script evaluation (4.6–6.2 s there,
  mostly the build and the frames; 4.2–4.4 s after). Not split; budgeted instead (below).
- **Durations of the camera's journeys** (park → place 0.9 + 0.8 s,
  place → place 0.5 + 0.8 s, back to the park 0.55 + 1.0 s): measured
  with a script, after all places were built, three rounds: the page's
  words are fully in 387–462 ms after a click (route change, the 0.08 s
  `--arrive-delay`, the 0.28 s `.arrive`), the camera arrives 1.33–2.0 s
  after it. The words already land in the audit's 300–500 ms band and
  never wait for the camera, and still view now cuts journeys for
  anyone who wants them gone, so the durations were left alone. No
  shorter durations were trialled with people; that would be the way to
  decide it.

## Budgets

`npm run perf:budget` (`node docs/audit/scripts/budget.mjs`) after
`npm run build`. Gzip -9 bytes unless marked raw; baselines from
`436854f` and from this commit. CSS is measured on the integration
branch: the navigation, design and still-view commits (3–6) took it from
11,654 to 15,552 bytes, so its limit was set from that with the same
headroom as the rest.

| Budget | Limit | Before | After |
|---|---|---|---|
| initial JS of any page (its own `<script src>`s) | 205,000 | 193,785 | 194,150 |
| largest chunk, gzip | 300,000 | 287,831 | 288,428 |
| largest chunk, raw | 1,100,000 | 1,056,413 | 1,058,023 |
| all JS | 520,000 | 492,642 | 492,141 |
| all CSS | 17,000 | 11,654 | 15,552 |

Lab targets to hold with `lighthouse.mjs` (3 runs, median), not enforced
in CI (there is none): CLS ≤ 0.1, desktop TBT ≤ 1,000 ms, mobile TBT ≤
2,500 ms, desktop LCP ≤ 1,000 ms, mobile LCP ≤ 3,000 ms.

## Limits

- **Lab is not field.** The audit's targets are field p75: LCP ≤ 2.5 s,
  INP ≤ 200 ms, CLS ≤ 0.1. Nothing here measures them: there is no
  field data (no RUM, no CrUX entry for the site), and Lighthouse's
  TBT is a lab proxy for responsiveness, not INP. Lab CLS of 0 and a
  ~2.2–2.7 s lab LCP on a simulated slow phone are consistent with the
  targets, not proof of them.
- **No real mid-range device.** Everything ran on an M2 laptop; the
  "phone" is Chrome's emulation with a 4× CPU slowdown, which doesn't
  slow the GPU. Shader compile times in particular differ a lot between
  GPUs and drivers (Windows' ANGLE on D3D11 is known to be slow at it),
  which is where the change above matters most, and where it's least
  measured.
- **Shared machine.** Other agents were building and running browsers
  at times; the two "before" sets differ by more than the after sets
  do, which is why both are reported. Same-session, same-machine
  comparisons are fair; absolute numbers are this machine's.
- **Production** was measured once, three runs per profile, through the
  public internet; it runs the "before" renderer.
