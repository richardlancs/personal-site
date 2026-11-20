"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { FRAME_MS, MAX_DPR, PRECIP_SEED, RAIN_SLANT, flakeX, seedParticles, stepParticles, type Particle, type PrecipKind } from "../../lib/precip";
import { REDUCED_MOTION } from "../../lib/still";

// The weather over a district's band (city.css, "The band's weather"):
// inside the band, over its plates, under its foot's fade. Decorative, so
// all of it is aria-hidden and takes no clicks.
//
// - The haze: cloud over the towers' tops, as thick as the weather's
//   --city-haze (lib/cityLook.ts), darker rather than paler at night.
// - Rain's wet sheen along the foot, and snow's pale wash: CSS alone,
//   keyed on <html data-weather>, so they show in still view too and the
//   weather reads without anything moving.
// - Rain's streaks and snow's flakes: one canvas (lib/precip.ts does the
//   maths), which exists only while it's raining or snowing and motion is
//   welcome: never in still view (<html data-still="on">) or under
//   prefers-reduced-motion. Its loop runs at most 30 frames a second, and
//   only while the band is on screen and the tab is shown.
//
// The weather and still view are read off <html> (CityDriver.tsx and the
// still script write them there; neither has a store for them): one
// MutationObserver for every band on the page.

type Watch = () => void;
const watchers = new Set<Watch>();
let observer: MutationObserver | null = null;
let motion: MediaQueryList | null = null;
const notify = () => watchers.forEach((w) => w());

function subscribe(watch: Watch) {
  watchers.add(watch);
  if (!observer) {
    observer = new MutationObserver(notify);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-weather", "data-still"] });
    motion = matchMedia(REDUCED_MOTION);
    motion.addEventListener("change", notify);
  }
  return () => {
    watchers.delete(watch);
    if (watchers.size === 0) {
      observer?.disconnect();
      observer = null;
      motion?.removeEventListener("change", notify);
      motion = null;
    }
  };
}

// What the canvas draws: rain or snow, or nothing (other weather, still
// view, reduced motion)
function precipitation(): PrecipKind | null {
  const html = document.documentElement;
  if (html.dataset.still === "on") return null;
  if (matchMedia(REDUCED_MOTION).matches) return null;
  const weather = html.dataset.weather;
  return weather === "rain" || weather === "snow" ? weather : null;
}

const serverPrecipitation = () => null;

// The streaks and flakes take the page's text colour (--text), faintly
function inkOf(el: Element): string {
  const hex = getComputedStyle(el).getPropertyValue("--text").trim();
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "230 233 238";
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

function draw(ctx: CanvasRenderingContext2D, kind: PrecipKind, particles: Particle[], time: number, width: number, height: number, ink: string) {
  ctx.clearRect(0, 0, width, height);
  if (kind === "rain") {
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    ctx.strokeStyle = `rgb(${ink})`;
    for (const p of particles) {
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.size * RAIN_SLANT, p.y - p.size);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = `rgb(${ink})`;
    for (const p of particles) {
      const x = flakeX(p, time, width);
      // Soft: a faint halo round a small core
      ctx.globalAlpha = p.alpha * 0.35;
      ctx.beginPath();
      ctx.arc(x, p.y, p.size * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

export default function WeatherOverlay() {
  const root = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const kind = useSyncExternalStore(subscribe, precipitation, serverPrecipitation);

  useEffect(() => {
    const el = root.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!kind || !el || !canvas || !ctx) return;

    const ink = inkOf(el);
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let frame = 0;
    let last = -1;
    let elapsed = 0;
    let onScreen = false;

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w === width && h === height) return;
      width = w;
      height = h;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = seedParticles(kind, w, h, PRECIP_SEED);
      draw(ctx, kind, particles, elapsed, width, height, ink);
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      // At most 30 frames a second: skip any that come sooner
      if (last >= 0 && now - last < FRAME_MS - 1) return;
      // After a pause (off screen, a hidden tab) carry on from where it was
      const dt = last < 0 ? 0 : Math.min(now - last, 100) / 1000;
      last = now;
      elapsed += dt;
      stepParticles(kind, particles, dt, width, height);
      draw(ctx, kind, particles, elapsed, width, height, ink);
    };

    const start = () => {
      if (frame || !onScreen || document.hidden) return;
      last = -1;
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const update = () => (onScreen && !document.hidden ? start() : stop());

    resize();
    const sizes = new ResizeObserver(resize);
    sizes.observe(el);
    const seen = new IntersectionObserver((entries) => {
      onScreen = entries.some((e) => e.isIntersecting);
      update();
    });
    seen.observe(el);
    document.addEventListener("visibilitychange", update);

    return () => {
      stop();
      seen.disconnect();
      sizes.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [kind]);

  return (
    <div ref={root} className="band-weather" aria-hidden="true">
      <div className="band-haze" />
      <div className="band-wash" />
      {kind && <canvas ref={canvasRef} className="band-precip" />}
      <div className="band-sheen" />
    </div>
  );
}
