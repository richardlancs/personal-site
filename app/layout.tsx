import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
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

// Headings, the name and station names: Fraunces, a soft old-style serif
// with the look of printed ink, its optical size axis on, so the name is
// set in its high-contrast display cut and small labels in its sturdy text
// cut. Text: Figtree, a plain, warm geometric sans, easy to read at small
// sizes (docs/city/style.md, "Type").
//
// Both come through next/font/google: fetched at build and served from the
// site itself (no request to Google from the visitor), Latin only, SIL Open
// Font License. Fraunces is variable (weight and optical size; its other
// axes left out to keep the file small); Figtree variable (the site uses
// 400 to 700; next/font's Turbopack loader takes no weight range).
const display = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-fraunces",
  display: "swap",
});
const text = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
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
      className={`${display.variable} ${text.variable}`}
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
