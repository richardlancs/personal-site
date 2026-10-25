import type { Metadata } from "next";
import Intro from "./components/Intro";
import "./globals.css";

export const metadata: Metadata = {
  title: "Richard Lan | Software Engineering Portfolio",
  description:
    "Portfolio of Richard Lan, a Computer Science student at the University of Waterloo seeking software engineering internship and co-op roles.",
};

// Runs before the page is drawn: if the visitor previously chose a theme,
// apply it right away so the page doesn't flash light-then-dark.
// Also before the first paint: show the intro (components/Intro.tsx) once
// per session, unless the visitor has asked for less motion.
const introScript = `(function(){try{if(!sessionStorage.getItem("intro-seen")&&!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("intro")}catch(e){}})()`;

const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      data-scroll-behavior="smooth"
      className="h-full"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Intro />
        {children}
      </body>
    </html>
  );
}
