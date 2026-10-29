# Review: scripted E2 relighting (previews A, B, C)

Source of truth: `art/park/masters/pk-d-v01.png` (unchanged, hash verified).
Script: `scripts/art/relight.mjs`; settings, geometry and masks:
`docs/art/park/e2-relight.json`. Nothing applied; no v02.

## How it works

Three adjustments, each with its own soft mask (view: `reports/e2-relight-masks.png`;
red = foliage shade, yellow = board light, cyan = paving light):

1. **Foliage around the board: darker and cooler.** Mask = an elliptical
   zone around the board × a colour test for foliage (green to yellow-green
   hues with some saturation), so wood, paper and paving are excluded by what
   they are, not by a drawn shape. Darkening multiplies, so leaf texture
   keeps its contrast; blue is raised and red lowered in the shaded leaves.
2. **The board: warm light from the upper left.** Mask = the board's
   silhouette minus any leaf pixels inside it. The light multiplies (wood
   grain keeps its contrast), is strongest toward the upper left, and is
   capped at half of each pixel's remaining headroom, so the paper can't be
   pushed to white and no existing white is dimmed.
3. **Paving at the board's base: e2-a's light only.** The light pool is
   transferred as a blurred brightness ratio (e2-a ÷ v01, 5 px blur) and
   applied to **v01's own pixels**, so every stone and joint is v01's and
   stays continuous; only the light changes. e2-a's paving was 1 px off v01
   and is re-aligned first. The pool stays clear of the fountain and the
   fingerpost.

**Region** (`e2-relight.json` → `region`): the E2 mask extended over the
foliage above the fingerpost (whose top is at y≈425), with a notch that fits
the fingerpost's lower arm where it crosses the board's left post.
Foliage and paving changes fade to **exactly 0** at the region edge, using a
true distance fade over 36 px. A blurred mask wasn't exactly zero at
concave corners, which is why the distance fade was added.

### Problems found and fixed while tuning

| Round | Problem | Fix |
|---|---|---|
| 1 | Foliage and paving zones reached the region edge at partial strength (13–30 level step) | Distance-based fade, exactly 0 at the edge |
| 1 | Notch 8 px taller than the arm: the board post was lit up to a straight edge | Notch fitted to the arm (y 477–506) |
| 1 | All presets too timid (C barely visible in the squint test) | Strengths raised, foliage zone core widened |
| 2 | Board looked washed out: an additive lift raised the dark grain most | Multiplicative light |
| 2 | Pale rectangle at the roof's upper-right corner: leaves inside the board outline were lit | Leaf pixels excluded from the board mask |
| 3 | Highlight roll-off dimmed existing paper whites (A) or pushed paper to white (B, C) | Light capped by remaining headroom |

## Results

### Checks on every preset

| Check | A | B | C |
|---|---|---|---|
| Pixels changed outside the region | 0 | 0 | 0 |
| Changes at the region edge | Only at the arm notch, where the arm's own edge covers them (4× check: `reports/e2-relight-C-notch-4x.png`) | same | same |
| Visible seams, halos, vignette, flat patches (1×, 2×) | None | None | None |
| Board geometry and paper detail | Unchanged (only light changes; no pixels move) | same | same |

### Measurements

The standard `measure.mjs` boxes for "foliage behind" and "foliage above"
also contain the fallen beam and the board's roof, which this pass treats
as wood, not foliage. So the table shows foliage-only boxes as well: above
(x 960–1100, y 385–409), right (x 1108–1180, y 398–452), left
(x 900–938, y 380–414).

| Measure | v01 | e2-a (rejected) | A | B | C | Target |
|---|---|---|---|---|---|---|
| Board face luminance | 0.342 | 0.507 | 0.388 | 0.412 | **0.428** | ≥ 0.48 (quality first) |
| Texture contrast on the board (luminance SD) | 0.210 | 0.263 | 0.232 | 0.237 | 0.238 | not lower than v01 ✅ |
| Face vs foliage above (foliage only) | 2.01 | 2.84 | 2.49 | 2.80 | **3.06** | ≥ 3.0 |
| Face vs foliage right (foliage only) | 3.18 | 3.87 | 4.14 | 4.80 | **5.41** | ≥ 3.5 |
| Face vs foliage left (foliage only) | 2.19 | 3.13 | 2.51 | 2.69 | 2.83 | limited: the fingerpost sits there |
| Face vs "behind" (standard box, incl. beam) | 2.29 | 3.30 | 2.83 | 3.14 | 3.41 | ≥ 3.5 |
| Foliage blue ÷ red, above / right | 0.52 / 0.77 | 0.32 / 0.50 | 0.54 / 0.85 | 0.55 / 0.88 | 0.55 / 0.90 | cooler than v01 ✅ |
| Board face near-white (≥ 250) | 7.3% | 36.8% | 13.2% | 14.2% | 14.2% | ≤ 12% (see note) |
| Existing paper whites dimmed | | 179 px | 0 | 0 | 0 | 0 ✅ |
| Paving patch luminance | 0.440 | 0.559 | 0.440 | 0.480 | 0.501 | |
| Brightest midground blocks | Paving at the board's base | Board | Paving at base, then board | same | same | Board or its base ✅ |

Note on near-white: the extra ~7 points are paper that sat at about 245–249
and now reads 250–252, a change of at most a few levels. The cap stops
anything from being pushed further, and there's no flat blown patch at 2×.
e2-a's paper, by contrast, went to white over a third of the face.

### Visual (`reports/e2-relight-sheet-1x.png`, `e2-relight-squint-sheet.png`, `e2-relight-{A,B,C}-board-2x.png`)

- **A:** a slight deepening of the trees; the board is a little warmer. Hard
  to tell from v01 at a glance.
- **B:** the trees around the board read as shade; the board's wood is
  warmer and the paper keeps its cream and pale blue. A faint warm pool at
  its base.
- **C:** the clearest separation. The board's roof line and posts stand
  against deep blue-green shade, and the pool at its base is visible. At
  1× it still reads as afternoon shade, not a vignette; the leaves keep
  their texture.
- In the squint test, B and C make the board a distinct pale shape against
  darker foliage, which v01 doesn't have. It still doesn't jump out the way
  e2-a's does; that intensity came from the glow we rejected.

## Recommendation: C

C is the only preset that changes the hierarchy you can see at a glance
while still looking like the same painting: no glow, no halo, unchanged
detail, cooler shadows, 0 pixels touched outside the documented region.
Brightness alone stays below the 0.48 target; that's the deliberate trade
for keeping the paper's tones. If C's shade feels heavy in the full painting,
B is the fallback; the strengths in `e2-relight.json` can be set anywhere in
between.

## What a script can't do

It can only re-light what's already painted. It can't create **painted
sunlight shapes**: the crisp, leaf-dappled edge of a sunbeam across the
board's face and the paving, the thing that made e2-a's paving look like a
real shaft of light. If, after C, the board still doesn't feel like it
stands in its own beam, the next step is a ChatGPT edit **limited to the
paving and the board's face**, brought in the same way as the paving here
(as a brightness ratio onto v01's pixels, so the stones and paper texture
stay v01's).
