import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import SkyDriver from "./components/weather/SkyDriver";
import { STILL_SCRIPT } from "./components/world3d/still";
import WorldShell from "./components/world3d/WorldShell";
import WorldControls from "./components/world/WorldControls";
import { siteUrl } from "./sections/registry";
import "./globals.css";

// Headings: Shippori Mincho B1, a mincho with a slight ink spread, like
// letterpress on old notices. Text: Zen Kaku Gothic New, a calm gothic,
// like real wayfinding signs.
//
// Both are Japanese families, and only their Latin is used here, so the
// Latin files are kept in app/fonts/ (downloaded from Google Fonts; SIL
// Open Font License, alongside). Through next/font/google each family
// arrives as about 120 Unicode slices per weight: 200 KB of extra CSS on
// every page, and (a next/font quirk with several weights) 313 slice files
// preloaded, about 8 MB. To add a weight, add its Latin file here.
const display = localFont({
  src: [
    { path: "./fonts/shippori-mincho-b1-latin-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/shippori-mincho-b1-latin-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-shippori",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
const text = localFont({
  src: [
    { path: "./fonts/zen-kaku-gothic-new-latin-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/zen-kaku-gothic-new-latin-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/zen-kaku-gothic-new-latin-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-zen-kaku",
  display: "swap",
});
// The Chinese on the world's signs comes from Noto Serif SC: one 9 KB
// file with just the characters the signs use (app/fonts/signs.txt).
// Through next/font/google it was 34 KB of CSS on every page and about
// 460 KB of slices on wide screens. To add a character, add it to
// signs.txt and download the subset again (the URL is in that file's
// test, tests/content.test.mjs).
const chinese = localFont({
  src: "./fonts/noto-serif-sc-signs-600.woff2",
  weight: "600",
  preload: false,
  variable: "--font-noto-sc",
});

export const metadata: Metadata = {
  // Makes canonical addresses and share images absolute (sections/registry.ts)
  metadataBase: new URL(siteUrl),
  title: {
    default: "Richard Lan | Software Engineering Portfolio",
    template: "%s | Richard Lan",
  },
  description:
    "Portfolio of Richard Lan, a Computer Science student at the University of Waterloo seeking software engineering internship and co-op roles.",
};

// One theme, always (globals.css): the browser is told so too, so form
// controls and scrollbars never switch to a dark style on their own
export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#fff9f2",
  // The page may run under a phone's notch and home bar; the layout pads
  // for them with env(safe-area-inset-*)
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${display.variable} ${chinese.variable} ${text.variable}`}
      // The script below sets data-still on <html> before React hydrates
      suppressHydrationWarning
    >
      <head>
        {/* Still view, before the first paint: the visitor's saved choice,
            or the system's reduced-motion setting (world3d/still.ts) */}
        <script dangerouslySetInnerHTML={{ __html: STILL_SCRIPT }} />
      </head>
      <body>
        <a href="#content" className="skip-link">
          Skip to the page
        </a>
        <WorldControls />
        {/* The world stays on screen across pages; each page moves its
            camera to a place (components/world3d/World3D.tsx) */}
        <WorldShell />
        {/* Richmond Hill's weather and daylight, into the world's sky */}
        <SkyDriver />
        <div id="content" tabIndex={-1} className="outline-none">
          {children}
        </div>
      </body>
    </html>
  );
}
