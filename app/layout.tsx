import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import ResumeHost from "./components/resume/ResumeHost";
import GlassPress from "./components/ui/GlassPress";
import SkyDriver from "./components/weather/SkyDriver";
import { STILL_SCRIPT } from "./components/world3d/still";
import WorldShell from "./components/world3d/WorldShell";
import WorldControls from "./components/world/WorldControls";
import { siteUrl } from "./sections/registry";
import "./globals.css";

// Headings: Fraunces, a soft, slightly wonky old-style serif, with some
// of the warmth of a storybook. Text: Nunito, a rounded sans, friendly
// and easy to read at small sizes.
//
// Both are variable fonts kept in app/fonts/ (downloaded from Google
// Fonts; SIL Open Font License, alongside), Latin only. Fraunces is cut to
// what the site uses: weights 500 to 700, its optical size fixed at 72
// (display), and its "soft" and "wonky" axes set on (36 KB rather than
// 121 KB for every axis). Nunito covers 400 to 700.
const display = localFont({
  src: "./fonts/fraunces-latin-soft-500-700.woff2",
  weight: "500 700",
  style: "normal",
  variable: "--font-fraunces",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
const text = localFont({
  src: "./fonts/nunito-latin-400-700.woff2",
  weight: "400 700",
  style: "normal",
  variable: "--font-nunito",
  display: "swap",
  adjustFontFallback: "Arial",
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
      className={`${display.variable} ${text.variable}`}
      // The script below sets data-still on <html> before React hydrates
      suppressHydrationWarning
    >
      <head>
        {/* Still view, before the first paint: the visitor's saved choice,
            or the system's reduced-motion setting (world3d/still.ts) */}
        <script dangerouslySetInnerHTML={{ __html: STILL_SCRIPT }} />
      </head>
      <body>
        <a href="#content" className="skip-link glass">
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
        {/* The résumé, read in the page: opened by any résumé link */}
        <ResumeHost />
        {/* The press on every glass button (globals.css, .glass) */}
        <GlassPress />
      </body>
    </html>
  );
}
