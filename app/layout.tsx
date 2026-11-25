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

// Headings and station names: Newsreader, a book-and-newspaper serif,
// sober and editorial. The name alone is set in its italic (city.css,
// .hero-name), the one personal, hand-set touch: that single face (500
// italic) is loaded on its own, so the rest of the italic never ships.
// Text: Hanken Grotesk, a calm, open grotesque, easy to read at small sizes
// (docs/city/style.md, "Type").
//
// All three faces are kept in app/fonts (OFL texts alongside) and set with
// next/font/local, served from the site itself: their Latin subsets alone,
// as Google Fonts cuts them (every character the site uses is in it), so
// the stylesheet carries one @font-face for each and none for scripts the
// page never shows. Newsreader upright is its variable weight axis (its
// optical size axis left out: it doubles the file for a barely visible
// change); Hanken Grotesk variable (the site uses 400 to 700).
const display = localFont({
  src: "./fonts/newsreader-latin.woff2",
  weight: "200 800",
  variable: "--font-newsreader",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
const signature = localFont({
  src: "./fonts/newsreader-latin-500-italic.woff2",
  weight: "500",
  style: "italic",
  variable: "--font-newsreader-italic",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
const text = localFont({
  src: "./fonts/hanken-grotesk-latin.woff2",
  weight: "100 900",
  variable: "--font-hanken",
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

// Three papers, chosen by the visitor (lib/paper.ts), never by the system:
// each paper sets its own color-scheme (city.css), so form controls and
// scrollbars match it. The theme-color here is the default cream paper's
// ground; the Paper picker sets it to the chosen paper's once the page is
// here (ui/PaperPicker.tsx)
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
      className={`${display.variable} ${signature.variable} ${text.variable}`}
      // The scripts below set data-paper, data-still and data-track on <html> before React hydrates
      suppressHydrationWarning
    >
      <head>
        {/* The paper, before the first paint: the visitor's saved choice,
            cream by default (lib/paper.ts) */}
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
