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
    // 65 for the painting on the flat layout (a painting, seen small);
    // 85 for it full-size; 75 (the default) for everything else
    qualities: [65, 75, 85],
    formats: ["image/avif", "image/webp"],
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
