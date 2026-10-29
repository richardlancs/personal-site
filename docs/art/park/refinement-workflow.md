# Desktop Master: Refinement Workflow

How the four approved edits (E3 → E2 → E4 → E1) get from ChatGPT into a
versioned master without changing anything outside each edit's region.
E5 (side paths) waits until these four are done. No upscaling, layers,
phone painting or frontend work until the final desktop master is approved.

## Folders

`art/` is gitignored: source images stay local. Back the folder up (a cloud
drive, for example), because git won't.

```
art/park/
  candidates/pk-d-c01.png     the original ChatGPT painting (read-only, never edited)
  masters/pk-d-vNN.png        versioned masters (read-only). v00 = c01, byte-identical
  edits/e3/ e2/ e4/ e1/       your ChatGPT downloads for each edit: e3-a.png, e3-b.png …
  guides/eN-region.png        the current master with the edit's region outlined
  reports/                    comparisons and heat maps for every preview
  graded/                     colour-corrected copies (the masters stay ungraded)
```

Committed alongside the code:

| File | What it is |
|---|---|
| `docs/art/park/edits.json` | Each edit's region (pixels on the 1536×1024 master) and soft-edge width |
| `docs/art/park/master-log.json` | Every master version: parent, edit, source candidate and its hash, region, alignment, colour match, change statistics, the file's hash |
| `docs/art/park/grade.json` | The colour-correction settings |
| `scripts/art/*.mjs` | The tools below (Node + `sharp`, which Next.js already installs) |

## Tools

```bash
node scripts/art/master.mjs status          # list versions; → marks the current master
node scripts/art/master.mjs guide e2        # outline an edit's region on the current master
node scripts/art/composite.mjs e3 art/park/edits/e3/e3-a.png              # preview
node scripts/art/composite.mjs e3 art/park/edits/e3/e3-a.png --apply      # make it the next master
node scripts/art/master.mjs rollback v01    # make v01 current again (later files are kept)
node scripts/art/master.mjs verify          # check every master against its logged hash
node scripts/art/measure.mjs                # the review-c01 checks on the current master
node scripts/art/grade.mjs                  # colour-corrected copy + before/after comparisons
```

### What `composite.mjs` does

1. **Size check.** The candidate must be 1536×1024. Anything else (a
   screenshot, a resized copy, a square image) is refused.
2. **Alignment.** ChatGPT sometimes nudges the whole picture by a few
   pixels. The script compares a band just outside the region and finds the
   shift (up to ±12 px) that lines the candidate up with the master before
   using it.
3. **Colour check.** It compares a 24 px ring around the region in both
   images and reports how much ChatGPT re-tinted the picture. With
   `--match-colour`, the edited region's colours are mapped back to the
   master's, so the patch doesn't show a seam.
4. **Blend.** Only inside the region, with a soft edge that fades in *inside*
   the region (10–20 px depending on the edit). Outside, the master's pixels
   are copied exactly.
5. **Proof.** It counts pixels outside the region that differ from the
   current master and refuses to write anything if the count isn't zero.
6. **Reports.** `master | candidate | result` side by side, plus heat maps of
   what changed against the current master and against the original c01.
7. **`--apply`** writes the next `pk-d-vNN.png` (read-only) and logs it. Each
   version is a file, so rolling back is just pointing the log back at an
   earlier one.

I tested it on a deliberately bad candidate (whole image shifted 3 px right
and 2 px down, re-tinted, booth replaced): it found the shift, measured the
tint, placed the patch exactly, and changed 0 pixels outside the region.

## Each edit, step by step

1. **I** draw the guide on the current master: `art/park/guides/eN-region.png`.
2. **You**, in a **new ChatGPT chat**, attach the **current master** (the
   file `master.mjs status` marks with →, e.g. `art/park/masters/pk-d-v00.png`
   for E3). Always edit the latest master, never c01 or an older version,
   so the context around each region is already up to date.
3. Click the image, choose the select/brush tool, and paint over the area
   inside the red outline in the guide. Don't attach the guide itself;
   ChatGPT would paint the red line. If the select tool isn't available,
   send the image with the prompt anyway; the script only takes the region.
4. Paste the edit's prompt.
5. If the result looks promising, **download it with ChatGPT's download
   button** (full-size PNG; not a screenshot or copy-paste) and save it as
   `art/park/edits/eN/eN-a.png`. Further attempts: `eN-b.png`, `eN-c.png`.
   Two or three attempts is normal; send me all of them.
6. Tell me which files are ready. Pasting them in the chat as well is
   welcome for discussion, but I work from the saved files.
7. **I** preview each one, show you the comparisons, and recommend one
   (or ask for another attempt, with what to change).
8. **You** approve; **I** run `--apply`, which creates the next master.
9. Next edit, from the new master.

**When ChatGPT re-renders the whole painting** (it did for E3: the
average difference outside the selection was 30 levels, with a new sun
disc, a redrawn skyline and a moved fountain), a rectangle also carries over
the candidate's own background inside it, which risks ghosting along the
edges. The fix is to trace the mask around the edited **object's
silhouette** (+4 px, feather 6) as a `polygon` in `edits.json`, so the
master's own surroundings stay around it.

If an approved edit turns out badly later, `rollback` makes the previous
version current again, and the edits after it are redone from there.

## Acceptance per edit

| Edit | Accept when |
|---|---|
| E3 booth | Reads instantly as a telephone booth at 1× (glass panels, door, payphone visible, warm light inside); same footprint and height; stone post and tree untouched; lighting from the upper left |
| E2 board | The board and the paving around it are the brightest area in the midground (`measure.mjs`: brightest midground block on the board); its silhouette separates from the trees behind; notices stay unreadable; board, fingerpost and paths unmoved |
| E4 pavilion | Warm light visible in the left window at 1×; nothing moved |
| E1 skyline | Text-zone ink contrast ≥ 4.5:1 from y 100 to at least y 330 for x 120–600 (`measure.mjs`); buildings, workshop and mountains keep their shapes, only paler; workshop still recognisable |

Every edit also needs: no seam at the region edge in the compare image, no
people, text or logos, same painterly brushwork as the surroundings.

## After the four edits

1. `grade.mjs` on the final master → `art/park/graded/pk-d-vNN-g01.png`,
   with before/after comparisons (full painting, sky, board, bench shadows).
   The grade cools the shadows toward blue-green, trims saturation by 10%
   and cleans the whites while leaving the warm mid-tones and sunlight
   mostly alone. Settings are in `grade.json`; `strength` scales the whole
   correction from 0 to 1. On c01 it moved the average colour from
   RGB 131/115/79 to 125/116/93. The master stays ungraded, so the grade can
   be retuned or dropped at any time.
2. `measure.mjs` and the composition overlay on the graded image, the same
   checks as `review-c01.md`.
3. You approve the final desktop master. Only then: upscale, layers, phone.

## Baseline (v00 = c01), from `measure.mjs`

- Text zone, x 120–760: ink contrast ≥ 5.9 from y 60 to y 200; from y 200
  down, it drops to 2.7 and below. The extra width compared with the
  earlier 560 px check brings in the **electricity pole's top (x ≈ 610–640,
  from y ≈ 230)**, so the intro line length has to stop at about x 600
  unless E1 softens the pole too. x 120–560 is clear to y 280.
- Brightest blocks: all in the sun glare at the top left (0.76–0.82).
  Brightest in the midground: the plaza in front of the board (0.54). The
  board's face is 0.34 and the trees behind it 0.12.
- Shadow under the bench: RGB 110/89/39 (warm, the cast to correct).

---

## Version history

| Version | Edit | Status | Notes |
|---|---|---|---|
| v00 | Original | Base | Byte-identical to `candidates/pk-d-c01.png` |
| v01 | E3 telephone booth | **Approved** | From `edits/e3/e3-a.png` (ChatGPT download "Golden-Hour Ruins in the Overgrown Park.png"). Booth-silhouette mask, feather 6, 2 px vertical alignment. Changed pixels: 41,788, all inside x 1293–1441, y 401–711; independently verified 0 changed outside the mask. Previews: `reports/v01-full.png`, `reports/v01-booth-2x.png` |

Candidates reviewed but not applied:

| Candidate | Edit | Result | Review |
|---|---|---|---|
| `edits/e2/e2-a.png` | E2 | Not applied: board glows (36.8% near-white), foliage behind warmer instead of cooler | `review-e2-a.md` |
| Scripted relight A, B, C (`reports/e2-relight-*.png`) | E2 | Superseded: C2 applied as v03 | `review-e2-relight.md` |
| `edits/e4/e4-a.png` | E4 | Not applied: window too bright (lum 0.46, 43% near-white), added glazing bars | `review-e4-a.md` |
| Scripted lamplight A, B (`reports/e4-lamp-*.png`) | E4 | Previews; B meets all criteria, awaiting approval | `review-e4-a.md` |

| Version | Edit | Status | Notes |
|---|---|---|---|
| v02 | E2 notice board | **Approved, later superseded by v03** | Scripted relight preset C (`scripts/art/relight.mjs C --apply`, settings in `e2-relight.json`, snapshot in the log). Byte-identical to the approved preview. 46,070 pixels changed, all inside x 888–1182, y 367–618; 0 outside the region vs v01, and 0 outside the E2 + E3 masks vs v00. Previews: `reports/v02-full.png`, `reports/v02-board-2x-vs-v01.png` |

**Found after applying v02:** the board light was capped per colour
channel, so on cream paper blue rose more than red. The paper kept its
detail and both colours, but became slightly paler and less saturated
(warmth R−B 109 → 98, saturation 0.468 → 0.404; `reports/v02-paper-4x-vs-v01.png`).
Preview **C2** (`reports/e2-relight-C2.png`) applies one gain to all three
channels and keeps the paper's cream (warmth 116, saturation 0.476), at
slightly less separation (2.85:1 against the foliage above, vs 3.06). v02
stayed the master until Richard chose C2 (below).

| Version | Edit | Status | Notes |
|---|---|---|---|
| v02 | E2 (preset C) | **Superseded by v03**, kept unchanged | Marked rolled back in the log, with `supersededBy: v03` |
| v03 | E2 (preset C2) | **Approved, current** | An alternative successor to v01 (`relight.mjs C2 --apply` after `master.mjs rollback v01`). Byte-identical to the checked C2 preview. 46,069 pixels changed, all inside x 888–1182, y 367–618; 0 outside the region vs v01, 0 outside E2 + E3 vs v00. Paper cream hue shift 0.00°, saturation +0.009 vs v01. Board face 0.396; vs foliage above 2.85:1. Fine-detail energy on the brightest paper 7% lower (headroom cap gently compressing near-white; not visible at 2×). Previews: `reports/v03-full.png`, `reports/v03-board-2x-vs-v01.png`, `reports/c2-squint-v01-v02-c2.png` |

The authoritative record, with hashes and every parameter, is
`master-log.json`; `node scripts/art/master.mjs verify` re-checks it.

---

## E2: notice board (next)

**Goal:** the board becomes the midground's focal point through believable
sunlight and value contrast, not glow.

**Baseline on v01** (`measure.mjs` plus a contrast check):

| Measure | v01 |
|---|---|
| Board face luminance (x 965–1080, y 440–520) | 0.342 |
| Board face vs foliage directly behind (x 1090–1200, y 400–520) | 2.3:1 |
| Board face vs foliage above it (x 950–1100, y 385–425) | 1.8:1 |
| Foliage behind: blue ÷ red (higher = cooler) | 0.51 |
| Brightest midground block | Paving in front of the board, 0.54 |
| Squint test (`reports/v01-squint.png`) | The board is a pale rectangle about as strong as the paving, the booth and the fountain rim |

**Mask** (`edits.json` → `e2`, see `guides/e2-region.png` and
`guides/e2-region-zoom.png`): a polygon covering the board (x 952–1102,
y 415–565), the foliage and fallen beam behind it, and the paving in front
down to y 625, with a 10 px soft edge. It deliberately leaves out:

- the **fingerpost** (post x 897–907, arms to x 967 at y 478–505), via a
  notch where its lower arm crosses the board's left post;
- the **fountain's column** (x 880–920, from y 610);
- the **greenhouse** (from x 1190).

Whatever ChatGPT does to those, the master's pixels stay.

### Precautions

- Attach **`pk-d-v01.png`**, not v00 (v00 has the old booth).
- Brush over the board, the trees directly behind and above it, and the
  paving in front of it. Keep the brush **off the fingerpost and the
  fountain**. Brushing a bit too wide doesn't matter; the mask decides
  what's kept.
- One try = one new chat. If ChatGPT moves or resizes the board, don't try to
  fix it in the same chat; start again.
- Expect ChatGPT to redraw the whole picture again. That's fine; only the
  mask area is used.
- Things that would break the edit at the mask edge, so watch for them:
  the paving joints at y ≈ 625 (they must still line up), the fallen beam
  where it crosses x 1185, and the board's left post next to the fingerpost
  arm.

### Prompt

```text
In the selected area only, keep the exact same image and change only the
light. A narrow shaft of low golden afternoon sunlight comes through a gap
in the trees from the upper left and falls directly on the small roofed
wooden notice board and on the paving stones in front of it. The board's
face, its roof edge, the left sides of its posts and a patch of paving at
its base are in direct sun, so they become the brightest, warmest surfaces
in this part of the picture. The edges of the sunlit patch are broken up by
crisp, sharp leaf shadows. The posts cast short shadows toward the lower
right.

The foliage directly behind and above the board is in shade: make it a
little darker and cooler, deep green with blue-green shadows, so the
board's silhouette stands out clearly against it.

Keep the notice board, its roof, posts, cork, pins and peeling paper
notices, the fallen beam, the paving and the trees in exactly the same
position, size, shape, perspective and weathered detail. The paper notices
stay faded and unreadable, with no writing. This is natural sunlight
painted in the same gouache style: no glow, bloom, halo, light rays, haze
or lens effect. Do not change anything outside the selection, and do not
change the wooden fingerpost.
```

### Saving the candidate

1. Download with ChatGPT's download button (full-size PNG).
2. Save or rename it to `art/park/edits/e2/e2-a.png` (further tries:
   `e2-b.png`, `e2-c.png`). ChatGPT names downloads after its own title
   for the picture, so rename it, or leave it in Downloads and tell me the
   name.
3. Tell me "E2 ready: e2-a …". I'll preview each one; nothing is applied
   until you approve.

### Acceptance criteria (measured on the composited preview)

| # | Check | Pass |
|---|---|---|
| 1 | Board face brightness | Luminance ≥ 0.48 (from 0.34) |
| 2 | Separation | Board face vs foliage behind ≥ 3.5:1 (from 2.3) and vs foliage above ≥ 3:1 (from 1.8) |
| 3 | Foliage behind is cooler, not just darker | Blue ÷ red ≥ 0.56 (from 0.51), and no darker than about half its current luminance (it must still read as sunlit trees in shade, not a black hole) |
| 4 | Focal point | The brightest midground block is on the board or the paving at its base, and in the squint test the board reads first in the midground, ahead of the fountain rim and the booth |
| 5 | Natural light, not glow | Board-face pixels with any channel ≥ 250 stay at or below 12% (v01: 7.3%, from the pale paper), with no flat blown-out patch; no halo or soft bright fringe around the board's silhouette; the patch's edges are hard, leaf-shaped shadows; post shadows fall lower right |
| 6 | Geometry unchanged | Board outline, roof, posts and beam within ±2 px of v01 (checked by overlay); notice layout the same; no readable text |
| 7 | Seams | None visible at 1× or 2× along the mask, especially the paving joints at y ≈ 625, the beam at x 1185 and the notch around the fingerpost arm |
| 8 | Atmosphere | Same warm late-afternoon light and gouache texture as the rest of the painting; the sky's sun glare stays the brightest thing overall |

Checks 1–4 are numbers from `measure.mjs`; 5–8 I check at 1× and 2× with
the comparison and heat-map images, and you have the final say.

---

## E4: pavilion window (next)

**Intent:** the pavilion (About) should feel inhabited by a memory: a lamp
left on a little while ago. Understated, not a quest marker.

**Measured on v02**, identical in v03 (3× grid: `reports/e4-grid-v02.png`; the pavilion area is byte-identical in v02 and v03):

| Element | Position |
|---|---|
| Window opening (panes show trees through the pavilion) | x 163–192, y 513–546; frame ≈ 161–194, 511–548 |
| Wooden pillar, left of the window | x 145–158 |
| Bench top | y 563 |
| Door | from x 230 |
| Bright side opening, left of the pillar (sunlit, not part of E4) | x 125–143 |

**Mask** (`edits.json` → `e4`; `guides/e4-region.png`,
`guides/e4-region-zoom.png`): x 159–206, y 505–558, soft edge 5 px. That
covers the window, its frame and a narrow band of wall for the spill. The
pillar, bench, door, roof, side opening and trees are outside it, so they
keep v03's pixels whatever ChatGPT does.

**Baseline (v03; same pixels as v02 here):**

| Area | Luminance | Warmth (R−B) | Near-white |
|---|---|---|---|
| Window panes (x 165–190, y 516–544) | 0.197 | 58 | 0.3% |
| Wall right of the window | 0.148 | 61 | 0 |
| Wall below the window | 0.183 | 61 | 0 |
| Sunlit side opening (comparison, not edited) | 0.444 | 105 | 31% |
| Notice board face (comparison, v03) | 0.396 | | |

### Selecting in ChatGPT

- Attach **`art/park/masters/pk-d-v03.png`**.
- Brush the window and a thin margin of wall around it, inside the red box
  in `guides/e4-region-zoom.png`. Keep the brush **off the wooden pillar** to
  its left, the **bench** below, the **door** and the **roof**. A slightly
  loose selection is fine; the mask decides.
- New chat per attempt; if anything moves or the light gets strong, start
  over rather than correcting in the same chat.

### Prompt

```text
In the selected area only: soft amber lamplight from inside the pavilion
shows through this small window, as if a lamp had been left on inside a
little while ago. The panes take on a gentle, warm amber tone, dimmer than
the afternoon sunlight outside, with a hint of a dim interior behind the
glass, such as the edge of a curtain or a shadowy shelf. The inner edges of
the wooden window frame catch a little warm light, and a very faint warm
tint falls on the plaster wall just around the frame.

Keep the window, its frame and panes, the wall, the wooden pillar and the
bench exactly the same in shape, size and position. Keep the late-afternoon
sunlight from the upper left and the painterly gouache style. The lamp
itself is not visible. No glow, bloom, halo, light rays or bright white.
Do not change anything outside the selection.
```

### Saving

Download with ChatGPT's download button and save as
`art/park/edits/e4/e4-a.png` (further tries `e4-b.png` …), or tell me the
file's name in Downloads. Then "E4 ready: e4-a". Nothing is applied until
you approve.

### Acceptance criteria

| # | Check | Pass |
|---|---|---|
| 1 | Amber, not brighter than the sun | Panes warmer (R−B ≥ 75, from 58); luminance between about 0.22 and 0.32, clearly below the sunlit side opening (0.44) and the notice board (0.40) |
| 2 | No glow | Near-white in the panes ≤ 2%; warm tint on the wall fades within ~8 px of the frame; no soft bright fringe, rays or haze |
| 3 | Subtle spill | Wall right of and below the window: luminance up by no more than ~15%, warmth by no more than ~15 |
| 4 | Geometry | Window frame and pane divisions within ±1 px of v03 (edge-map check); the pillar, bench, door and roof are untouched (guaranteed by the mask) |
| 5 | Hierarchy | In the squint test, the pavilion gains a warm point but doesn't compete with the notice board |
| 6 | Mood | Reads at 1× as a lamp left on, a quiet sign someone was here; the lamp itself not visible; same gouache texture |
| 7 | Seams | None at 1× or 2× along the mask, especially beside the pillar (x 159) |

---

## E3: what to deliver first (done, kept for reference)

- **Attach:** `art/park/masters/pk-d-v00.png`
- **Select:** the booth inside the red outline in
  `art/park/guides/e3-region.png` (x 1298–1452, y 408–712). Keep the brush
  off the stone post on the left and the tree trunk on the right.
- **Prompt** (revised from review-c01: the booth keeps its footprint
  instead of getting wider, because the stone post sits right next to it):

```text
In the selected area only: repaint the green structure as an old Japanese
public telephone booth with exactly the same position, width and height: a
tall green metal frame with glass panels on all sides and a glass door with
a vertical handle, one panel cracked, dust and leaf litter on the glass.
Inside, clearly visible through the glass, an old pastel-green payphone on a
small shelf with its receiver on the hook, and a warm small ceiling light
glowing inside the booth. Rust at the hinges, chipped green paint, a vine
climbing one corner. Same sunlight from the upper left, same painterly
style. No text or logos. Do not change anything outside the selection.
```

- **Save as:** `art/park/edits/e3/e3-a.png` (then `e3-b.png`, …)
- **Then tell me:** "E3 ready: e3-a, e3-b".
