import type { Metadata } from "next";
import { Noto_Serif_SC, Shippori_Mincho_B1, Zen_Kaku_Gothic_New } from "next/font/google";
import WorldShell from "./components/world3d/WorldShell";
import WorldControls from "./components/world/WorldControls";
import "./globals.css";

// Headings: a mincho with a slight ink spread, like letterpress on
// old notices. Text: a calm gothic, like real wayfinding signs.
const display = Shippori_Mincho_B1({
  weight: ["500", "600"],
  subsets: ["latin"],
  variable: "--font-shippori",
});
// The Chinese on the world's signs: Shippori Mincho has no Simplified
// Chinese glyphs, so they fall back to this mincho. Not preloaded: Google
// serves it in small Unicode slices, and only the slices for the few
// characters used are ever downloaded.
const chinese = Noto_Serif_SC({
  weight: ["600"],
  preload: false,
  variable: "--font-noto-sc",
});
const text = Zen_Kaku_Gothic_New({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-zen-kaku",
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
