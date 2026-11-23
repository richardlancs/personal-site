# UX and motion principles for this site

Richard asked (20 November 2026) for these nineteen principles to be
applied to the site wherever they honestly fit, and for future work to keep
applying them. Source: the reel "19 Principles of UX & Animation" by
@bendoescareer (https://www.instagram.com/reel/Df7ehKURrLy/), read from its
on-screen captions. The wording below is a paraphrase.

They are applied **inside** this site's standing rules, which win when the
two disagree:

- Still view (`html[data-still="on"]`) and `prefers-reduced-motion`: nothing
  moves. Every rule below has a no-motion form (usually: the end state,
  at once).
- Motion is subtle and short. Nothing loops or moves by itself. No scroll
  hijacking. Only `transform` and `opacity` animate.
- Hover effects sit under `@media (hover: hover)`; pointer-following
  effects also need `(pointer: fine)`.
- Accessibility and readability come before any effect. Content never
  waits for an animation to become readable or usable.
- The page's JavaScript and CSS budgets (`docs/audit/scripts/budget.mjs`)
  still hold: prefer CSS; any script must be tiny.

One place holds the numbers: the motion tokens in `app/city.css`
(`--ease-out`, `--ease-in-out`, `--ease-spring`, `--t-fast`, `--t-base`,
`--t-slow`, `--stagger`). Use them; do not write durations or curves inline.

## The nineteen, and what each means here

| # | Principle | In one line | On this site |
|---|---|---|---|
| 1 | Exaggeration | Push a reaction a little past real life so it reads. | A failed copy gives its button a short shake; a success gives a clear tick, not a faint tint. |
| 2 | Origin awareness | Things grow out of what was pressed, not from nowhere. | The Sections menu opens from its key; the résumé dialog from the link that opened it; a `<details>` unfolds from its summary. Set `transform-origin` to the trigger. |
| 3 | Staggering | Bring things in one after another, not all at once. | A section's items arrive in order as each first comes up over the foot of the screen (`--stagger` apart, six steps at most), once and never again: one observer (`components/ui/arrive.ts`) marks them, a short transition plays. Anything already on screen, landed on by a jump, found or focused is simply there. |
| 4 | Squash and stretch | A little give makes things feel soft, not stiff. | The rarer keys ("View projects", "Live demo", "Code", "Email me", "Contact", Copy) compress slightly on press and settle back with a small overshoot. |
| 5 | Rubber banding | Past the end it stretches, then springs back. | Leave the browser's own overscroll alone; menus and the photo grids use `overscroll-behavior` so the page behind does not move. Do not fake it. |
| 6 | Doherty threshold | Answer within 400 ms or it feels like waiting. | Every press shows a response at once; paintings keep their gradient until loaded; nothing blocks on the network before reacting. |
| 7 | Anticipation | A small wind-up says what is about to happen. | Hover and focus states preview the action (the arrow nudges, the chevron leans) before the click. |
| 8 | Fitts's law | Bigger and closer is faster to hit. | Primary actions are the largest targets and sit where the eye already is: "Email me", "Live demo" and "Code" directly under each title; 44 px minimum everywhere. |
| 9 | Slow in, slow out | Nothing real starts or stops instantly. | All movement eases (`--ease-out` to arrive, `--ease-in-out` to travel). No linear motion except the scroll-linked metro map. |
| 10 | Hick's law | Fewer choices, faster picks. | Two actions in the hero, one primary action per group, six sections; fold the rest. Do not add options without removing one. |
| 11 | Follow-through | Details keep moving a beat after the main thing stops. | The metro map's point pulses after the fill lands; the copy tick draws itself a beat after the key gives; a lifted picture settles a moment after its frame. |
| 12 | Arcs | Real things move on curves. | Used very sparingly: the press sheen tips slightly as it crosses a key. Arrivals are a short straight rise (8 px), not an arc. |
| 13 | Von Restorff effect | The one that looks different gets noticed. | Exactly one warm (lantern) action per view; the current section and the current role are the only things marked in light blue. Never two "special" things side by side. |
| 14 | Timing | Too slow is laggy, too fast is jumpy: under 300 ms. | Interface transitions are `--t-fast` (120 ms) to `--t-base` (200 ms); only large surfaces (dialog, menu) use `--t-slow` (280 ms). |
| 15 | Interruptible motion | Let people change their mind mid-animation. | Use CSS transitions, not keyframe sequences, for anything a second press can reverse (menu, details, hover); never lock input during a transition. |
| 16 | Secondary action | A small extra motion backs up the main one. | The copy tick draws itself (the status line says "Copied", once); the chevron turns as a panel opens; the "Email me" icon lifts on hover. One secondary action per interaction. |
| 17 | Solid drawing | Give flat interface some depth. | Project pictures and interest photos lift 3 px with a soft shadow and tilt toward a fine pointer by at most 1.5° each way; flat for touch, still view and reduced motion. |
| 18 | Frequency of use | If people do it fifty times a day, skip the animation. | Jumping between sections, the top bar's keys, the Sections menu's rows and the metro map respond at once (a tint, no give or light); only rare, larger moments (opening the résumé, a section's first arrival) get a flourish. |
| 19 | Peak-end rule | People remember the best part and the ending. | The page ends on Contact with one clear action and a satisfying confirmation; the strongest project comes first. |

## When adding or changing interface

Go down the table and ask of each principle: does it apply here, and is it
honoured? Apply the ones that fit; never add motion only to tick a box
(principles 10, 13 and 18 argue for less). Then check: still view and
reduced motion show the end state with no movement; the keyboard path is
unchanged; nothing waits on an animation; the budgets still pass.
