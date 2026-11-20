import { readdirSync } from "node:fs";
import path from "node:path";

// The photos for one interest: every image file in public/interests/<scene>/,
// in file-name order (01-…, 02-…, 10-… sort as numbers), so adding a picture
// is dropping a file in that folder (docs/adding-interest-photos.md).
//
// Server-only: it reads the disk. Import it from server components only
// (the "server-only" package isn't a dependency here, so nothing enforces
// that). A synchronous read is a "predictable value" under cacheComponents:
// it runs while the page is prerendered and its result is part of the
// static HTML, so a deployed site shows new files after a rebuild.

export type InterestPhoto = { src: string; alt: string; file: string };

const IMAGE = /\.(jpe?g|png|webp|avif)$/i;
// (turbopackIgnore: the folder is read while the page is prerendered and
// public/ is served as it is, so the build needn't trace these paths;
// without it Turbopack traces the whole project into the build output)
const PUBLIC_INTERESTS = path.join(/* turbopackIgnore: true */ process.cwd(), "public", "interests");

export function interestPhotos(
  scene: string,
  name: string,
  captions?: Record<string, string>,
  baseDir: string = PUBLIC_INTERESTS,
): InterestPhoto[] {
  let files: string[];
  try {
    files = readdirSync(/* turbopackIgnore: true */ path.join(baseDir, scene));
  } catch {
    return [];
  }
  return files
    .filter((file) => !file.startsWith(".") && IMAGE.test(file))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((file, i) => ({
      src: `/interests/${encodeURIComponent(scene)}/${encodeURIComponent(file)}`,
      alt: captions?.[file] ?? `${name}, photo ${i + 1}`,
      file,
    }));
}
