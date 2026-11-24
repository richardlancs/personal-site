import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { getImageProps } from "next/image";
import CityDriver from "./components/city2d/CityDriver";
import { HOME_QUALITY, tileSizes } from "./components/city2d/homePlate";
import { HEIGHT } from "./components/city2d/panorama";
import { bandTiles } from "./components/city2d/panoramaImages";
import TopBar from "./components/city2d/TopBar";
import ResumeHost from "./components/resume/ResumeHost";
import GlassPress from "./components/ui/GlassPress";
import { STILL_SCRIPT } from "./lib/still";
import { richmondHill } from "./data/weather";
import { platePreloadScript } from "./lib/platePreload";
import { TRACK_SCRIPT } from "./lib/track";
import { siteUrl } from "./sections/registry";
import "./city.css";
import "./motion.css";
import "./reveal.css";
import "./city-track.css";

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

// The home tile of the panorama, day and night: the tile's own srcset, from
// which the head script picks one file to fetch and paint before hydration
// (the tile's <img> then uses that same file: homePlate.ts)
const home = bandTiles[0];
const tileSrcSet = (plate: "day" | "night") => getImageProps({ src: home[plate], alt: "", fill: true, sizes: tileSizes(home.w), quality: HOME_QUALITY[plate] }).props.srcSet ?? "";
const PLATE_PRELOAD = platePreloadScript(richmondHill, tileSrcSet("day"), tileSrcSet("night"), home.w / HEIGHT);

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${display.variable} ${text.variable}`}
      // The scripts below set data-still and data-track on <html> before React hydrates
      suppressHydrationWarning
    >
      <head>
        {/* Still view, before the first paint: the system's reduced-motion
            setting (lib/still.ts) */}
        <script dangerouslySetInnerHTML={{ __html: STILL_SCRIPT }} />
        {/* The horizontal journey, on before the first paint where scripts
            run and the screen has room (lib/track.ts) */}
        <script dangerouslySetInnerHTML={{ __html: TRACK_SCRIPT }} />
        {/* The panorama's home tile, by day or by night, fetched and painted
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
