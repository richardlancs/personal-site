# Audit baseline (10 November 2026)

The state of the site before the audit work on branch
`audit/portfolio-polish-2026-11-10`, so every later change can be compared
against it. The audit itself: *Richard Lan — Website audit and
implementation brief*, 10 November 2026 (findings F1–F5, improvements
I1–I5).

- Base commit: `e32397c` (`main`, same as `origin/main`)
- Production: https://personal-site-flame-eight-52.vercel.app
- Local measurement build: `npm run build && npx next start -p 3100`

## Environment

| | |
|---|---|
| Machine | Apple M2, 8 GB, macOS 15.6 |
| Node | 26.12.0 |
| Browser for checks | Google Chrome 157.0.8103.39 (headless, driven by Playwright 1.66, `channel: "chrome"`, WebGL on Metal through ANGLE) |
| next | 16.4.2 (Turbopack) |
| react / react-dom | 19.3.0 |
| three | 0.186.1 |
| @react-three/fiber | 9.8.2 |
| tailwindcss | 4.3.3 |
| typescript | 5.9.3 |
| eslint | 9.39.5 (eslint-config-next 16.4.2) |

## Routes

| Route | Production | Local build | Title |
|---|---|---|---|
| `/` | 200 | 200 | Richard Lan \| Software Engineering Portfolio |
| `/about` | 200 | 200 | About \| Richard Lan |
| `/projects` | 200 | 200 | Projects \| Richard Lan |
| `/experience` | 200 | 200 | Experience \| Richard Lan |
| `/interests` | 200 | 200 | Interests \| Richard Lan |
| `/contact` | 200 | 200 | Contact \| Richard Lan |
| `/map` | 200 | 200 | Map of the park \| Richard Lan |
| `/greenhouse` | 200 (template, `noindex, nofollow`) | 200 | Greenhouse \| Richard Lan |
| `/robots.txt` | 404 | 404 | |
| `/sitemap.xml` | 404 | 404 | |
| unknown path | 404 | 404 | Not found |
| `/resume/richard-lan-resume.pdf` | 200 `application/pdf` | 200 | |

No horizontal overflow on any of the seven routes at 1440×1000 or 390×844,
and no page errors or console errors (`screenshots/before/log.json`).

## Findings, reproduced against `e32397c` and production

| Audit | Reproduced | Evidence |
|---|---|---|
| F1 default favicon | Yes | Production `/favicon.ico` is byte-identical to `app/favicon.ico` (the create-next-app icon, SHA-1 `9bd95591…`); no other icon is declared |
| F2 `/greenhouse` public | Yes | 200 on production; the HTML contains `app/data/portfolio.ts`, `listed: true` and `noindex, nofollow` |
| F3 "Choose one to play", INSERT COIN | Yes | The hint is in `/interests` HTML (`registry.ts`); INSERT COIN is drawn into the cabinet screens' canvas texture (`world3d/scenes/Arcade.tsx`) |
| F4 "Choose a line, or scroll, to read it" | Yes | In `/experience` HTML (`registry.ts`) |
| F5 Interests tabpanel not focusable | Yes | `role="tabpanel"` with no `tabindex` and no focusable children (`Cabinets.tsx`) |
| Metadata | Yes | No canonical, Open Graph or Twitter tags in the HTML; robots.txt and sitemap.xml are 404 |

## Validation before any change

- `npm test`: 15 passed.
- `npm run lint`, `npx tsc --noEmit`, `npm run build`: **failed in this
  checkout**, all on `garage-poker/`, a separate repository cloned inside
  the folder and not tracked here. Vercel builds from git, so production
  was never affected. Commit 1 excludes that folder (and `.claude/`
  worktrees) from ESLint and TypeScript. After that, lint and type check
  are clean, the build succeeds, and `npm test` is 23 passed with the
  smoke checks below.

## Smoke checks

`tests/smoke.test.mjs` fetches a running build (`SMOKE_URL=… npm test`):
all listed routes return 200 with unique titles; an unknown path is a 404
with a link home; every page has the skip link, `<main>` and an `<h1>` in
its HTML; every page links to every listed place; the home page links
GitHub, LinkedIn and the résumé; every project title, role, interest and
email address is in the server HTML (readable before scripts or WebGL run);
the résumé is served as `application/pdf`. Without `SMOKE_URL` these are
skipped, so `npm test` stays offline.

One thing they made visible: the projects are tabs, so the server HTML has
every project's title but only the first project's notes and links. That
is the tab pattern working as designed, not a defect; each project's links
are checked by choosing it in the browser.

## Performance setup

Bundle, from the local production build: the largest JavaScript chunk (the
3D world: three.js, React Three Fiber and the scenes) is 1,056,496 bytes,
287,884 gzip -9, matching the audit's 1,056,496 decoded and 292,011 bytes
on the wire. All of `.next/static/chunks` is 1.7 MB uncompressed.

Lighthouse runs, traces, the method used and the before/after numbers are
in `docs/audit/performance.md` (commit 7).

## Screenshots

`screenshots/before/`: the seven routes at 1440×1000 (`desktop-*`) and
390×844 (`mobile-*`), JPEG quality 70, taken 5 s after load. The capture
script is in `docs/audit/scripts/shots.mjs`.
