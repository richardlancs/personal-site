import type { NextConfig } from "next";

// The 3D city open unless closed: the same test as app/lib/city3dLive.ts
const city3dLive = process.env.NEXT_PUBLIC_CITY3D !== "off";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
    // Turbopack's on-disk cache has twice served a stale globals.css here:
    // once in `next dev` after scripted edits, and once in a Vercel build
    // (new HTML shipped with the previous deploy's stylesheet). Builds
    // take about 20 s without it; a wrong stylesheet in production costs
    // more.
    turbopackFileSystemCacheForDev: false,
    turbopackFileSystemCacheForBuild: false,
  },
  // Development-only pages are named page.dev.tsx (app/city/dev/kit/): the
  // "dev.tsx" extension is a page only in `next dev`, so a production
  // build has no such route and no chunk for it
  pageExtensions: process.env.NODE_ENV === "development" ? ["dev.tsx", "tsx", "ts", "jsx", "js"] : ["tsx", "ts", "jsx", "js"],
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Every image asks for the default, 75, except the home band's plate,
    // 60 (components/city2d/plates.ts: HOME_QUALITY), the page's largest
    // paint, a painting that holds up at it
    qualities: [60, 75],
    formats: ["image/avif", "image/webp"],
    // Optimized copies are kept a month rather than 4 hours: the sources
    // (screenshots, the painting) change only with a deploy, which starts
    // a fresh cache anyway
    minimumCacheTTL: 2_678_400,
  },
  // One page now (app/page.tsx): the old one-page-per-section addresses
  // go to their station's anchor, so links already shared keep working.
  // Temporary, so the addresses stay free for the 3D city (a later plan).
  // The map is gone; it goes to the top. (A fragment such as
  // /projects#skills never reaches the server: it lands on #projects.)
  async redirects() {
    return [
      { source: "/about", destination: "/#about", permanent: false },
      { source: "/projects", destination: "/#projects", permanent: false },
      { source: "/experience", destination: "/#experience", permanent: false },
      { source: "/interests", destination: "/#interests", permanent: false },
      { source: "/contact", destination: "/#contact", permanent: false },
      { source: "/map", destination: "/", permanent: false },
      // Temporary too: the city's addresses go to the 2D page until it opens
      ...(city3dLive
        ? []
        : [
            { source: "/city", destination: "/", permanent: false },
            { source: "/city/:path*", destination: "/", permanent: false },
          ]),
    ];
  },
  // public/ files are served with max-age=0, so every visit asked again
  // for the music (2.7 MB, on demand) and the screenshots. Their names
  // aren't content-hashed, so a day's cache plus a week of serving the
  // old copy while checking, not "immutable". ":path+" (at least one
  // segment), so /projects itself stays a redirect.
  async headers() {
    const cached = [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }];
    return [
      { source: "/audio/:path+", headers: cached },
      { source: "/projects/:path+", headers: cached },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
