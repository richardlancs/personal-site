"use client";

import { useEffect, useRef, useState } from "react";
import { isFlat } from "../world/flat";
import { world } from "../world3d/store";
import wipeArt from "../../assets/intro/wipe.webp";
import { CAP_MS, DURATION, FILM_START, cover, painting, wipe } from "./timeline";

// The home page's intro, on wide screens only, on every full load of the
// home page: a short painted film (a kid running down an overgrown
// hillside path toward the park, made with AI video tools from a painting
// made in ChatGPT; public/intro/, docs/world/intro-prompts.md), then a wipe
// of tall grass into the park, which has been loading underneath all
// along. 9.2 s, never more than 10 (timeline.ts).
//
// A deliberate exception to "words never wait for the world" (CLAUDE.md,
// Motion): the page's words wait under it. It's skippable (the glass key,
// Escape, a click anywhere), never shown in still view (so not with
// reduced motion) or on the phone layout (CSS hides it before any script
// runs; the poster is a CSS background there and the film's source is only
// set by script on the wide layout, so neither is ever fetched), and it
// doesn't play again on client navigation back to the home page.

const FILM = { av1: "/intro/intro.av1.mp4", h264: "/intro/intro.h264.mp4", poster: "/intro/intro-poster.webp" };

// Whether this document was first loaded on the home page (a client
// navigation back to it doesn't count), and whether the intro has played
let played = false;
function firstLoadHere() {
  if (played) return false;
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const first = nav ? new URL(nav.name).pathname : location.pathname;
  return first === "/" && location.pathname === "/";
}

// Development only: ?intro=3 holds the intro at 3 s (for measuring and
// photographing it)
function heldAt() {
  if (process.env.NODE_ENV === "production") return null;
  const v = new URLSearchParams(location.search).get("intro");
  return v == null ? null : Number(v);
}

export default function Intro() {
  const [show, setShow] = useState(() => typeof window === "undefined" || firstLoadHere());
  const root = useRef<HTMLDivElement>(null);
  const film = useRef<HTMLVideoElement>(null);
  const grass = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;
    played = true;
    const el = root.current!;
    // Phones and still view never see it (CSS has hidden it already)
    if (isFlat() || world.get().still) {
      const id = requestAnimationFrame(() => setShow(false));
      return () => cancelAnimationFrame(id);
    }
    // The page under it can't be reached until it's done
    const blocked: HTMLElement[] = [];
    for (const node of [...document.body.children, ...(el.parentElement?.children ?? [])])
      if (node instanceof HTMLElement && !node.contains(el) && !node.inert) {
        node.inert = true;
        blocked.push(node);
      }

    // The film: AV1 where it plays, H.264 otherwise; set only now, so a
    // layout that never shows the intro never downloads it
    const v = film.current!;
    v.src = v.canPlayType('video/mp4; codecs="av01.0.08M.08"') ? FILM.av1 : FILM.h264;
    const held = heldAt();
    if (held != null) {
      v.addEventListener("loadedmetadata", () => (v.currentTime = Math.max(0, held - FILM_START)), { once: true });
      v.load();
    }

    let frame = 0;
    let ended = false;
    let fade = 0;
    let started = false;
    const end = () => {
      if (ended) return;
      ended = true;
      cancelAnimationFrame(frame);
      v.pause();
      el.dataset.done = "";
      const focusInside = el.contains(document.activeElement);
      for (const node of blocked) node.inert = false;
      // If the visitor was on the skip key, carry them to the page's first
      // words; if not, leave focus where it is
      const name = document.getElementById("park-name");
      if (name && focusInside) {
        name.tabIndex = -1;
        name.focus({ preventScroll: true });
      }
      fade = window.setTimeout(() => setShow(false), 260);
    };

    // Its clock is the page's: it began with the first paint (the cream
    // cover is in the HTML), so a slow start eats into the opening, never
    // into the 10 s
    const draw = () => {
      const t = held ?? performance.now() / 1000;
      if (!started && held == null && t >= FILM_START) {
        started = true;
        v.play().catch(() => {}); // no autoplay: the poster holds, the wipe still comes
      }
      el.style.setProperty("--intro-cover", String(cover(t)));
      el.style.opacity = String(painting(t));
      if (grass.current) grass.current.style.transform = `translate(-50%, ${(1 - wipe(t)) * 105}%)`;
      if (held == null && t >= DURATION) return end();
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    // However the frames go (a slow machine, a hidden tab), it's over by 10 s
    const cap = held == null ? window.setTimeout(end, Math.max(0, CAP_MS - 260 - performance.now())) : 0;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") end();
    };
    window.addEventListener("keydown", onKey);
    const hide = () => {
      if (isFlat()) end();
    };
    window.addEventListener("resize", hide);
    el.addEventListener("click", end);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(cap);
      clearTimeout(fade);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", hide);
      el.removeEventListener("click", end);
      for (const node of blocked) node.inert = false;
      v.removeAttribute("src");
    };
  }, [show]);

  if (!show) return null;
  const vars = { "--intro-poster": `url(${FILM.poster})`, "--intro-wipe": `url(${wipeArt.src})` } as React.CSSProperties;
  return (
    <div ref={root} className="intro" style={vars}>
      <div className="intro-scene" aria-hidden="true">
        <video ref={film} className="intro-film" muted playsInline preload="none" disablePictureInPicture disableRemotePlayback />
        <div ref={grass} className="intro-layer" data-layer="wipe" />
        <div className="intro-cover" />
      </div>
      <button type="button" className="glass intro-skip">
        Skip intro
      </button>
    </div>
  );
}
