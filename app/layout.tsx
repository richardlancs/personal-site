import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import TopBar from "./components/city2d/TopBar";
import ResumeHost from "./components/resume/ResumeHost";
import GlassPress from "./components/ui/GlassPress";
import { PAPER_SCRIPT } from "./lib/paper";
import { STILL_SCRIPT } from "./lib/still";
import { TRACK_SCRIPT } from "./lib/track";
import { siteUrl } from "./sections/registry";
import "./city.css";
import "./motion.css";
import "./reveal.css";
import "./city-track.css";

// Headings, station names and the name: Fredoka, a round, bouncy display
// face with soft terminals: cheerful, a little childlike, still easy to
// read at a glance. Text: Nunito, a rounded sans of the same warmth, calm
// and very readable at small sizes (docs/city/style.md, "Type"). The name
// is upright, never italic.
//
// Both are kept in app/fonts (OFL texts alongside) and set with
// next/font/local, served from the site itself: their Latin subsets alone,
// as Google Fonts cuts them (every character the site uses is in it), so
// the stylesheet carries one @font-face for each and none for scripts the
// page never shows. Each is its variable weight axis (Fredoka 300 to 700,
// Nunito 200 to 1000; the site uses 400 to 700).
const display = localFont({
  src: "./fonts/fredoka-latin.woff2",
  weight: "300 700",
  variable: "--font-fredoka",
  display: "swap",
});
const text = localFont({
  src: "./fonts/nunito-latin.woff2",
  weight: "200 1000",
  variable: "--font-nunito",
  display: "swap",
});
// The big headings, the name and each section's title: Oleo Script at its
// bold (Soytutype, OFL; its text alongside), a rounded brush script, the
// most composed of the free fonts close to the Tentsurfer Richard chose
// (27 November 2026: Tentsurfer's free file is for personal use only and
// doesn't cover a webfont). Its Latin subset, as Google Fonts cuts it
const heading = localFont({
  src: "./fonts/oleo-script-latin.woff2",
  weight: "700",
  variable: "--font-oleo",
  display: "swap",
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

// Two papers, day and night, chosen by the visitor (lib/paper.ts), never by
// the system: each paper sets its own color-scheme (city.css), so form
// controls and scrollbars match it. The theme-color here is the default
// cream paper's ground; the day/night key sets it to the chosen paper's
// once the page is here (ui/DayNight.tsx)
export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: "#efe7d6",
  // The page may run under a phone's notch and home bar; the layout pads
  // for them with env(safe-area-inset-*)
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${display.variable} ${text.variable} ${heading.variable}`}
      // The scripts below set data-paper, data-still and data-track on <html> before React hydrates
      suppressHydrationWarning
    >
      <head>
        {/* The paper, before the first paint: the visitor's saved choice,
            day (cream) by default (lib/paper.ts) */}
        <script dangerouslySetInnerHTML={{ __html: PAPER_SCRIPT }} />
        {/* Still view, before the first paint: the system's reduced-motion
            setting (lib/still.ts) */}
        <script dangerouslySetInnerHTML={{ __html: STILL_SCRIPT }} />
        {/* The horizontal journey, on before the first paint where scripts
            run and the screen has room (lib/track.ts) */}
        <script dangerouslySetInnerHTML={{ __html: TRACK_SCRIPT }} />
      </head>
      <body>
        <a href="#content" className="skip-link glass">
          Skip to the page
        </a>
        <TopBar />
        <div id="content" tabIndex={-1} className="outline-none">
          {children}
        </div>
        {/* The résumé, read in the page: opened by any résumé link */}
        <ResumeHost />
        {/* The press on every glass button (city.css, .glass) */}
        <GlassPress />
      </body>
    </html>
  );
}
