# Adding photos to an interest

Each interest on the page (Basketball, Badminton, Chess, Poker) opens to a
scrapbook page: its description beside its photos, shown as a stack of
polaroids you flip through with the arrow keys under it. Adding a photo needs
no code.

## 0. Delete the placeholders first

Until real photos go in, each folder holds three generated stand-ins,
`01-placeholder.svg`, `02-placeholder.svg` and `03-placeholder.svg` (made by
`node scripts/interests/make-placeholders.mjs`; each is captioned
"Placeholder photo" on the page). When you add your own photos to an
interest, delete that folder's `*-placeholder.svg` files. Don't rerun the
script after that: it writes them again.

## 1. Put the file in the interest's folder

| Interest   | Folder                        |
| ---------- | ----------------------------- |
| Basketball | `public/interests/basketball/` |
| Badminton  | `public/interests/badminton/`  |
| Chess      | `public/interests/chess/`      |
| Poker      | `public/interests/poker/`      |

The folder name is the interest's `scene` in `app/data/portfolio.ts`.

- Formats that show up: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, `.svg`
  (upper or lower case). Anything else in the folder is ignored, and so are files whose
  names start with a dot (such as `.gitkeep`, which keeps the empty folder in
  git; leave it there).
- Size: about 1600 px on the long side and under 500 KB is plenty. The site
  makes smaller copies for phones by itself, but a huge original still slows
  the first load of the full-size view.
- Each photo is shown cropped to a square, like a polaroid. Keep the subject
  near the middle.

## 2. Choose the order with the file names

Photos appear in file-name order, and numbers sort as numbers. Start names
with a number:

```
01-first-tournament.jpg
02-team.jpg
10-court-at-night.jpg
```

To move a photo, rename it.

## 3. (Optional) Add a caption

Without a caption a photo is described to screen readers as, for example,
"Chess, photo 2". To give it a caption, add `captions` to that interest in
`app/data/portfolio.ts`, with the exact file name on the left:

```ts
{
  name: "Chess",
  scene: "chess",
  description: "…",
  captions: {
    "01-board.jpg": "A club game, move 30",
  },
},
```

The caption is written on the polaroid's bottom margin and is what screen
readers read. Without one the margin is left blank.

## 4. See it

- On the dev server (`npm run dev`): reload the page.
- On the deployed site: the folder is read when the site is built, so commit
  the files and push; the photos appear after the next build (deploy).

## Before posting a photo

Only put up a photo of other people if they are okay with it being on a public
website.
