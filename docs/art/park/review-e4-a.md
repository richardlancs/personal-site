# Review: E4 candidate e4-a and scripted lamplight (A, B)

Candidate: `art/park/edits/e4/e4-a.png` (ChatGPT download "Golden-Hour Overgrown Park Plaza.png", sha256 `e78bc580…`). Current master v03 unchanged; no v04.

## e4-a: too bright, do not apply

- ChatGPT re-rendered the whole painting and moved the pavilion up by about 18 px (beyond the composite script's ±12 px search). Composited with a measured shift of (-1, -18), added as `--shift` to `composite.mjs`. 0 pixels changed outside the E4 mask.
- Panes: luminance 0.461 (target 0.22–0.32), warmth 172, **43% near-white**. Brighter than the notice board (0.40) and the sunlit side opening (0.44): reads as a lit objective marker.
- Wall spill: warmth +24 to +30 (limit ~15), but the brightness stays within limits.
- Geometry: ChatGPT added a cross of glazing bars that v03's window doesn't have; frame position within 1 px after alignment.

## Scripted lamplight from v03's own pixels (`scripts/art/lamp.mjs`, `e4-lamp.json`)

Panes are recoloured toward a dim amber with a soft falloff from a lamp low inside the room; a little of the old view stays as texture; the frame's inner edge and a ~8 px band of wall get a faint warm tint that fades to exactly 0 at the region edge.

| | v03 | e4-a | A (faint) | B (soft) | Target |
|---|---|---|---|---|---|
| Pane luminance | 0.197 | 0.461 | 0.213 | **0.245** | 0.22–0.32 |
| Pane warmth (R−B) | 58 | 172 | 110 | **123** | ≥ 75 |
| Pane near-white | 0.3% | 43.1% | 0% | **0%** | ≤ 2% |
| Wall right, lum / warmth | 0.148 / 61 | 0.143 / 85 | 0.149 / 62 | 0.150 / 63 | ≤ +15% / ≤ +15 |
| Wall below, lum / warmth | 0.183 / 61 | 0.205 / 91 | 0.186 / 63 | 0.188 / 65 | same |
| Changed outside E4 region | | 0 | 0 | 0 | 0 |
| Geometry | | adds glazing bars | unchanged (no pixels move) | unchanged | ±1 px |

A narrowly misses the brightness range; B meets every numeric criterion.

**Visual:** B reads at 1× and 2× as a warm window in a shaded wall, clearly secondary to the notice board. At 4× it reads more as warm amber glass than as a room with a lamp in it: the script can tint, but it can't paint interior depth (a curtain edge, a shelf, a lamp's pool of light).

## Options

1. **Apply B** as v04: subtle, coherent, all criteria met.
2. **Hybrid:** take e4-a's painted interior (it has a convincing lit-room look) and tone it down to B's brightness and warmth before compositing, so the depth comes from ChatGPT and the restraint from the script. It would also bring in e4-a's glazing bars, which change the window's design.
3. **E4-b in ChatGPT** asking for half the brightness; likely to repeat e4-a's problems.
