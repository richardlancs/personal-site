import type { Metadata } from "next";
import localFont from "next/font/local";
import WorldShell from "./components/world3d/WorldShell";
import WorldControls from "./components/world/WorldControls";
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
  title: {
    default: "Richard Lan | Software Engineering Portfolio",
    template: "%s | Richard Lan",
  },
  description:
    "Portfolio of Richard Lan, a Computer Science student at the University of Waterloo seeking software engineering internship and co-op roles.",
};

// Runs before the page is drawn: if the visitor previously chose a theme,
// apply it right away so the page doesn't flash light-then-dark.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      data-scroll-behavior="smooth"
      className={`${display.variable} ${chinese.variable} ${text.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#content" className="skip-link">
          Skip to the page
        </a>
        <WorldControls />
        {/* The world stays on screen across pages; each page moves its
            camera to a place (components/world3d/World3D.tsx) */}
        <WorldShell />
        <div id="content" tabIndex={-1} className="outline-none">
          {children}
        </div>
      </body>
    </html>
  );
}
