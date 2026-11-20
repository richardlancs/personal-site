# The 3D city: measurements and decisions

The plan: `docs/superpowers/plans/2026-11-19-shanghai-3d.md`. The task
ledger (dispatches, cuts, checkpoints):
`.superpowers/sdd/2026-11-19-shanghai-3d/progress.md`.

## $PARK

`$PARK = de8564004684c90cb88b2da03fae98c88ab13dd9` (`de85640`, "fix: the two
halves of the motion work, fitted and within budget"), the last tree with
the park's code. Later tasks read park files from it with
`git show $PARK:<path>`.

## Task 1: the park retired (20 November 2026)

Budgets before the moves (`node docs/audit/scripts/budget.mjs` after
`rm -rf .next && npm run build`, at $PARK):

| budget | gzip bytes | limit |
|---|---|---|
| homeInitialJs | 199,485 | 200,848 |
| totalJs | 205,120 | 214,000 |
| totalCss | 10,485 | 10,760 |
| resumeJs | 447,951 | 470,000 |
| resumeCss | 1,853 | 2,500 |

After the moves: homeInitialJs **199,389** (96 B less), totalJs 205,024,
totalCss 10,485, resumeJs 447,951, resumeCss 1,853; no three.js on `/`
(0 of 17 chunks). Task 2's gate: homeInitialJs at most 199,389 + 1,000 =
**200,389**.

Moved as they were (`git mv`, imports fixed): `world3d/still.ts` →
`app/lib/still.ts`; `world3d/atmosphere/param.ts` → `app/lib/skyParam.ts`;
`world/StillViewToggle.tsx` → `city2d/`; `world3d/{store,anchors,idle,rng,environment}.ts`
and `world/flat.ts` → `city3d/`; `locations/selector.ts` → `city3d/panels/`;
`world3d/scenes/{arcadeLogic,arcadeMachine}.ts` → `city3d/arcade/`;
`world3d/{textures,glow}.ts` → `city3d/kit/`;
`world3d/atmosphere/{looks,state}.ts`, `DevSkyPanel.tsx` → `city3d/atmosphere/`.
Everything else under `world3d/`, `world/`, `locations/` and `app/globals.css`
deleted. The registry lost its `scene` field. `tiers.ts` imports
`FLAT_QUERY` from `./flat.ts` (its stand-in constant is gone).

Tailwind: `app/city.css` has `@source not "./components/city3d"`, so the
3D code's class names never grow `/`'s stylesheet. The other side of that:
Tailwind utilities written in `city3d/` files are not generated at all.
The city's own interface needs plain classes in a stylesheet the
`/city` layout imports (or classes the 2D code already uses).

## Task 8: the landmarks (noted from its report)

Weakest: Jin Mao, from far. Its identity in the plates is the fine rhythm of the stepped tiers, the fluted corners and a crown of pinnacles; at 1.2 k triangles the far level keeps only a straight shaft with small eave ledges and a stepped gold crown, so its silhouette reads "tiered pagoda-like tower" but not as clearly as the other three. The Shanghai Tower's 120° twist is also subtle in silhouette (the outline is a slightly convex taper); the twist shows through the notch's spiral line and the bands, so it depends on shading and the window shader. The Pearl and the opener are unmistakable even in flat grey.
