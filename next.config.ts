import type { NextConfig } from "next";

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
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Every image asks for the default, 75 (65 and 85 were never asked for)
    qualities: [75],
    formats: ["image/avif", "image/webp"],
    // Optimized copies are kept a month rather than 4 hours: the sources
    // (screenshots, the painting) change only with a deploy, which starts
    // a fresh cache anyway
    minimumCacheTTL: 2_678_400,
  },
  // public/ files are served with max-age=0, so every visit asked again
  // for the music (2.7 MB, on demand) and the screenshots. Their names
  // aren't content-hashed, so a day's cache plus a week of serving the
  // old copy while checking, not "immutable". ":path+" (at least one
  // segment), so the /projects page itself keeps its own headers.
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
