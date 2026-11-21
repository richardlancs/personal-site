"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import { twoDHref } from "../../lib/cityRoutes";
import { isFlat } from "./flat";
import { onIdle } from "./idle";
import { SAVE_DATA_MB, pickTier, readTierInput, type Quality } from "./tiers";

// The 3D city's shell, on every /city page (app/city/layout.tsx). It
// probes for WebGL2 once, reads Save-Data and picks the renderer's tier,
// then loads the canvas (City3D.tsx, its own chunk: nothing 3D is fetched
// before this decides). Until then, and wherever the city can't be drawn,
// the section's painting (the band, CityPage.tsx) stays where the scene
// would be and the page reads as it does without JavaScript.
//
// html[data-city3d] says which (city-pages.css shows and hides by it):
//   "on"        the canvas is drawing; the band is hidden under it
//   "fallback"  no WebGL2, or the canvas failed, or lost its context twice
//   "saving"    Save-Data is on: "Load the 3D city" waits for a press
//   "lost"      the GPU dropped the context: "Restart the 3D city"
//
// The canvas's chunk comes through React's own lazy(), not next/dynamic:
// it is only ever rendered on the client, after the probe (mode is null on
// the server and until an effect sets it), so it needs none of
// next/dynamic's server-side machinery, which would otherwise be in
// /city's first load (cityInitialJs, docs/audit/scripts/budget.mjs).
const City3D = lazy(() => import("./City3D"));

type Mode = "on" | "fallback" | "saving" | "lost";

class Guard extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// One probe per visit: a WebGL2 context (then released) and the tier read
// from it; null without WebGL2
type Probe = { tier: Quality; saveData: boolean } | null;
let probed: Probe | undefined;
function probe(): Probe {
  if (probed !== undefined) return probed;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) return (probed = null);
    const input = readTierInput(gl, location.search);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    probed = { tier: pickTier(input), saveData: input.saveData };
  } catch {
    probed = null;
  }
  return probed;
}

export default function CityShell() {
  const pathname = usePathname();
  const [mode, setMode] = useState<Mode | null>(null);
  const [tier, setTier] = useState<Quality>("high");
  // Bumped to remount the canvas after a lost context
  const [generation, setGeneration] = useState(0);
  const [losses, setLosses] = useState(0);
  // Whether this route is the one showing. Leaving /city doesn't unmount
  // it (the router keeps a visited route in a hidden React Activity, for
  // an instant way back): its effects are cleaned up but the tree stays.
  // So the canvas is let go when that happens, and its renderer, scene and
  // WebGL context with it (R3F releases them when <Canvas> unmounts; the
  // kit's shared materials go in City3D's own cleanup); coming back builds
  // a new one. A context lost while away is then nothing to handle: there
  // is none.
  const [showing, setShowing] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setShowing(true), 0);
    return () => {
      window.clearTimeout(id);
      setShowing(false);
    };
  }, []);
  const inCity = pathname === "/city" || pathname.startsWith("/city/");

  // Decide once, after hydration. Narrow screens give the page's sheet a
  // moment to paint first; wide ones start straight away.
  useEffect(() => {
    const start = () => {
      const p = probe();
      if (!p) return setMode("fallback");
      setTier(p.tier);
      setMode(p.saveData ? "saving" : "on");
    };
    if (!isFlat()) {
      const id = window.setTimeout(start, 0);
      return () => window.clearTimeout(id);
    }
    return onIdle(start, 1200);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (mode) html.setAttribute("data-city3d", mode);
    return () => html.removeAttribute("data-city3d");
  }, [mode]);

  // Back on /city after a lost context: the canvas is a new one, so the
  // loss is over
  useEffect(() => {
    if (!showing) return;
    const id = window.setTimeout(() => setMode((m) => (m === "lost" ? "on" : m)), 0);
    return () => window.clearTimeout(id);
  }, [showing]);

  // The GPU can drop the context (a driver reset, too many tabs). The
  // canvas's event is cancelled so the browser may give it back; until
  // then the band shows, with a key to restart. A second loss in a visit
  // leaves the fallback for good. (The events don't bubble: captured.)
  useEffect(() => {
    const lost = (e: Event) => {
      if (!(e.target as Element | null)?.closest?.(".city3d")) return;
      e.preventDefault();
      setLosses((n) => n + 1);
    };
    const restored = (e: Event) => {
      if (!(e.target as Element | null)?.closest?.(".city3d")) return;
      setGeneration((g) => g + 1);
      setMode((m) => (m === "lost" ? "on" : m));
    };
    document.addEventListener("webglcontextlost", lost, true);
    document.addEventListener("webglcontextrestored", restored, true);
    return () => {
      document.removeEventListener("webglcontextlost", lost, true);
      document.removeEventListener("webglcontextrestored", restored, true);
    };
  }, []);
  useEffect(() => {
    if (losses === 0) return;
    // (an effect: the event handler only counts)
    const id = window.setTimeout(() => setMode(losses > 1 ? "fallback" : "lost"), 0);
    return () => window.clearTimeout(id);
  }, [losses]);

  // The key goes away as it's pressed: focus goes on to the page showing's
  // heading, not to the document
  const toHeading = () => {
    const main = [...document.querySelectorAll<HTMLElement>("main.city-page")].find((m) => m.checkVisibility?.() ?? true);
    main?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
  };
  const restart = () => {
    setGeneration((g) => g + 1);
    setMode("on");
    toHeading();
  };

  return (
    <>
      {showing && inCity && (mode === "on" || mode === "lost") && (
        <Guard key={generation} onError={() => setMode("fallback")}>
          <Suspense fallback={null}>
            <City3D tier={tier} />
          </Suspense>
        </Guard>
      )}
      {mode === "fallback" && (
        <p className="city3d-note">
          Your browser can&apos;t draw the 3D city.{" "}
          <Link href={twoDHref(pathname)} className="text-link">
            Read this on the 2D page
          </Link>
        </p>
      )}
      {mode === "saving" && (
        <p className="city3d-note">
          <button type="button" className="glass" onClick={() => (setMode("on"), toHeading())}>
            Load the 3D city (about {SAVE_DATA_MB} MB)
          </button>
        </p>
      )}
      {mode === "lost" && (
        <p className="city3d-note">
          The 3D city stopped drawing.{" "}
          <button type="button" className="glass" onClick={restart}>
            Restart the 3D city
          </button>
        </p>
      )}
    </>
  );
}
