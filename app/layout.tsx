import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { getImageProps } from "next/image";
import CityDriver from "./components/city2d/CityDriver";
import { BAND_SIZES, BAND_WIDTH, HOME_QUALITY, plates } from "./components/city2d/plates";
import TopBar from "./components/city2d/TopBar";
import ResumeHost from "./components/resume/ResumeHost";
import GlassPress from "./components/ui/GlassPress";
import { STILL_SCRIPT } from "./lib/still";
import { richmondHill } from "./data/weather";
import { platePreloadScript } from "./lib/platePreload";
import { siteUrl } from "./sections/registry";
import "./city.css";
import "./motion.css";
import "./reveal.css";

// Headings and station names: Rajdhani, a squared, narrow sans with the
// look of signage. Text: Nunito, a rounded sans, friendly and easy to read
// at small sizes (docs/city/style.md, "Type").
//
// Both are kept in app/fonts/ (downloaded from Google Fonts; SIL Open Font
// License, alongside), Latin only. Rajdhani has no variable cut, so its
// three weights are three files; Nunito is variable, 400 to 700.
const display = localFont({
  src: [
    { path: "./fonts/rajdhani-latin-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/rajdhani-latin-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/rajdhani-latin-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-rajdhani",
  display: "swap",
  adjustFontFallback: "Arial",
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

// One dark theme, always (city.css): the browser is told so too, so form
// controls and scrollbars are dark whatever the system appearance
export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#08090c",
  // The page may run under a phone's notch and home bar; the layout pads
  // for them with env(safe-area-inset-*)
  viewportFit: "cover",
};

// The home band's plate, day and night: the band's own srcset, from which
// the head script picks one file to fetch and paint before hydration (the
// band's <img> then uses that same file: homePlate.ts)
const bandSrcSet = (plate: (typeof plates)["lujiazui"]["day"]) => getImageProps({ src: plate, alt: "", fill: true, sizes: BAND_SIZES, quality: HOME_QUALITY }).props.srcSet ?? "";
const PLATE_PRELOAD = platePreloadScript(richmondHill, bandSrcSet(plates.lujiazui.day), bandSrcSet(plates.lujiazui.night), BAND_WIDTH);

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
            or the system's reduced-motion setting (lib/still.ts) */}
        <script dangerouslySetInnerHTML={{ __html: STILL_SCRIPT }} />
        {/* The home band's plate, by day or by night, fetched and painted
            while the HTML parses (lib/platePreload.ts); not on a deep link */}
        <script dangerouslySetInnerHTML={{ __html: PLATE_PRELOAD }} />
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
        {/* The sky over the bands, from Richmond Hill's clock (on <html>) */}
        <CityDriver />
        {/* The press on every glass button (city.css, .glass) */}
        <GlassPress />
      </body>
    </html>
  );
}
