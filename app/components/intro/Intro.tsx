"use client";

import { useEffect, useRef, useState } from "react";
import { isFlat } from "../world/flat";
import { world } from "../world3d/store";
import farArt from "../../assets/intro/far.webp";
import frontArt from "../../assets/intro/front.webp";
import midArt from "../../assets/intro/mid.webp";
import nearArt from "../../assets/intro/near.webp";
import skyArt from "../../assets/intro/sky.webp";
import wipeArt from "../../assets/intro/wipe.webp";
import { drawKid } from "./kid";
import { ART, CAP_MS, DURATION, LAYERS, cover, kid, layer, onLayer, painting, wipe, type Layer } from "./timeline";

// The home page's intro, on wide screens only, on every full load of the
// home page: a walk down a painted, overgrown hillside, a kid running past
// into the world, and a wipe of tall grass into the park, which has been
// loading underneath all along. 9.5 s, never more than 10 (timeline.ts).
//
// A deliberate exception to "words never wait for the world" (CLAUDE.md,
// Motion): the page's words wait under it. It's skippable (the glass key,
// Escape, a click anywhere), never shown in still view (so not with
// reduced motion) or on the phone layout (CSS hides it before any script
// runs, and its pictures are CSS backgrounds there, so never fetched),
// and it doesn't play again on client navigation back to the home page.
//
// The painted layers are images made in ChatGPT (app/assets/intro/, their
// prompts in docs/world/intro-prompts.md): the one part of the world not
// made in code. The kid is drawn in code (kid.ts).

const art: Record<Layer | "wipe", string> = {
  sky: skyArt.src,
  far: farArt.src,
  mid: midArt.src,
  near: nearArt.src,
  front: frontArt.src,
  wipe: wipeArt.src,
};

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
  const skip = useRef<HTMLButtonElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const layers = useRef<Partial<Record<Layer | "wipe", HTMLDivElement | null>>>({});

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

    const held = heldAt();
    // Its clock is the page's: it began with the first paint (the cream
    // cover is in the HTML), so a slow start eats into the opening, never
    // into the 10 s
    let frame = 0;
    let ended = false;
    let fade = 0;
    const ctx = canvas.current!.getContext("2d")!;

    const end = () => {
      if (ended) return;
      ended = true;
      cancelAnimationFrame(frame);
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

    const draw = () => {
      const t = held ?? performance.now() / 1000;
      const W = innerWidth;
      const H = innerHeight;
      for (const name of LAYERS) {
        const l = layer(name, t);
        const node = layers.current[name];
        if (node) node.style.transform = `translate(calc(-50% + ${l.x * 100}%), ${l.y * 100}%) scale(${l.scale})`;
      }
      const w = wipe(t);
      const wipeNode = layers.current.wipe;
      if (wipeNode) wipeNode.style.transform = `translate(-50%, ${(1 - w) * 105}%)`;
      el.style.setProperty("--intro-cover", String(cover(t)));
      el.style.opacity = String(painting(t));

      // The kid, carried by the hillside and then the fields as they move.
      // The layers are a box covering the screen, anchored to its foot
      // (.intro-layer): fractions of it map to the screen like this
      const c = canvas.current!;
      const dpr = Math.min(2, devicePixelRatio || 1);
      if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) {
        c.width = Math.round(W * dpr);
        c.height = Math.round(H * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const k = kid(t);
      if (k) {
        const bw = Math.max(W, (H * ART.w) / ART.h);
        const bh = (bw * ART.h) / ART.w;
        const a = onLayer("near", t, k.x, k.y);
        const b = onLayer("mid", t, k.x, k.y);
        const mix = (p: number, q: number) => p + (q - p) * k.field;
        const sx = (W - bw) / 2 + mix(a.x, b.x) * bw;
        const sy = H - bh + mix(a.y, b.y) * bh;
        const sh = k.h * mix(a.scale, b.scale) * bh;
        // Close to the lens, the kid passes too fast to see sharp: two
        // fainter frames trail behind
        // So close the lens can't hold them sharp: soft until they're on
        // the path
        const soft = Math.max(0, k.h - 0.3) * 7;
        ctx.filter = soft > 0.3 ? `blur(${soft.toFixed(1)}px)` : "none";
        if (k.h > 0.4) {
          ctx.globalAlpha = k.alpha * 0.25;
          drawKid(ctx, sx - sh * 0.06, sy + sh * 0.08, sh * 1.04, (k.phase + 0.9) % 1);
          ctx.globalAlpha = k.alpha * 0.4;
          drawKid(ctx, sx - sh * 0.03, sy + sh * 0.04, sh * 1.02, (k.phase + 0.95) % 1);
        }
        ctx.globalAlpha = k.alpha;
        drawKid(ctx, sx, sy, sh, k.phase);
        ctx.globalAlpha = 1;
        ctx.filter = "none";
      }
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
    };
  }, [show]);

  if (!show) return null;
  const vars = Object.fromEntries(Object.entries(art).map(([k, v]) => [`--intro-${k}`, `url(${v})`])) as React.CSSProperties;
  return (
    <div ref={root} className="intro" style={vars}>
      <div className="intro-scene" aria-hidden="true">
        {/* Back to front; the kid runs between the hillside and the tall
            grass nearest the lens */}
        {LAYERS.map((name) => (
          <div key={name} className="intro-depth" data-layer={name}>
            <div ref={(n) => void (layers.current[name] = n)} className="intro-layer" data-layer={name} />
            {name === "near" && <canvas ref={canvas} className="intro-kid" />}
          </div>
        ))}
        <div ref={(n) => void (layers.current.wipe = n)} className="intro-layer" data-layer="wipe" />
        <div className="intro-cover" />
      </div>
      <button ref={skip} type="button" className="glass intro-skip">
        Skip intro
      </button>
    </div>
  );
}
