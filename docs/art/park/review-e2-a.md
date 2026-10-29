# Review: E2 candidate e2-a (notice board light)

Candidate: `art/park/edits/e2/e2-a.png`, a copy of the ChatGPT download
"Golden-Hour Overgrown City Park.png" (sha256 `885a6bb7…`, 1536×1024).
Composited onto v01 with the E2 mask (fingerpost, fountain and greenhouse
excluded). Nothing applied; v01 unchanged.

## Verdict: do not apply

It moves the board toward being the focal point, but the light reads as the
board glowing rather than sun falling on it, and the foliage behind got
warmer and brighter instead of darker and cooler. Four of the eight
criteria fail.

## Measurements (composited preview vs v01)

| # | Check | v01 | e2-a | e2-a colour-matched | Pass |
|---|---|---|---|---|---|
| 1 | Board face luminance | 0.342 | **0.507** | n/a | ≥ 0.48 ✅ |
| 2a | Face vs foliage behind | 2.29:1 | 3.30:1 | 2.89:1 | ≥ 3.5 ❌ |
| 2b | Face vs foliage above | 1.82:1 | 2.32:1 | 2.14:1 | ≥ 3.0 ❌ |
| 3 | Foliage behind, blue ÷ red | 0.51 | **0.39** (warmer) | 0.52 | ≥ 0.56 ❌ |
| 4 | Brightest midground block | Paving in front (0.54) | **The board (0.63)**, then the paving (0.57) | n/a | ✅ |
| 5 | Board face near-white (≥ 250) | 7.3% | **36.8%** | 0.5% | ≤ 12% ❌ |
| 6 | Geometry | | Board edge map best shift 0, 0; outline, roof, posts, beam unchanged | | ✅ |
| 7 | Seams | | Extra brightness step: +3.1 levels across the left edge, none at the bottom; foliage brightness changes along a near-vertical line at x≈930 above the fingerpost | | ⚠️ borderline |
| 8 | Outside the mask | | 0 pixels changed; fingerpost, fountain, greenhouse are v01's | | ✅ |

ChatGPT redrew the whole painting again (average difference outside the
mask: 21 levels) and moved the fingerpost's arms onto the board. The mask
kept v01's fingerpost, so that doesn't reach the result.

## What it looks like (2×: `reports/e2-a-board-2x.png`)

- **The board looks lit from inside.** The paper notices bleach to near
  white with a soft bright rim along the inner posts; the face loses its
  colours and texture. The brief asked specifically not to have this.
- **The foliage above-left of the board turned golden and sunlit**, the
  opposite of the requested shade, and it ends along the mask's left edge.
- **What works:** the warm patch on the paving at the board's base, the
  board now winning the squint test (`reports/e2-a-squint.png`), unchanged
  geometry, notices still unreadable.
- Colour matching removes the glow and the warmth but also most of the
  gain (2.89 and 2.14:1), so it doesn't pass either.

## Next options

1. **E2-b in ChatGPT** with the stricter prompt below.
2. **A scripted dodge-and-burn pass on v01**, no ChatGPT: darken and cool
   the foliage behind and above the board inside the E2 mask, give the
   board a capped warm lift, and optionally take only e2-a's paving light
   patch (y ≈ 560–625), which is the part that worked. It's predictable,
   adjustable and reversible like the colour grade, but it can't invent new
   leaf-shadow shapes.

### E2-b prompt

```text
In the selected area only, keep the exact same image and change only the
light, subtly. The small roofed wooden notice board stands in a patch of
warm late-afternoon sunlight coming from the upper left. Its paper notices
keep their faded colours and texture: warm cream and pale blue, not white,
and still unreadable. Sunlight also falls on the paving stones at its base,
with crisp leaf-shaped shadows at the edges of the sunlit patch.

The trees and bushes directly behind and above the board are in shadow,
NOT in sunlight: make them darker and cooler than they are now, deep green
with blue-green shade, so the board stands out against them.

The board must not glow or look lit from inside: no white highlights, no
bright rim along its edges, no halo, no yellow tint added to the foliage.
Keep the board, its roof, posts, notices, the fallen beam, the paving and
the trees in exactly the same position, size and shape. Do not change the
wooden fingerpost. Do not change anything outside the selection.
```
