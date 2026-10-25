"use client";

import { useEffect, useRef } from "react";

// The opening animation: a pastel desert at sunset, where a ball rolls down
// one dune, shoots up a ramp, flies off its lip, lands, and grows to fill
// the screen with the site's own background before fading away.
//
// It plays once per browser session. The inline script in layout.tsx adds
// `intro` to <html> before the first paint (unless the visitor prefers
// reduced motion or has already seen it), which is what makes the overlay
// visible; see the "Intro" rules in globals.css. Clicking, tapping or
// pressing Esc skips it.

const SEEN_KEY = "intro-seen";

// Timing after the ball lands, in milliseconds
const SQUASH_MS = 260; // the landing squash, while the ball keeps rolling
const EXPAND_MS = 1300;
const FADE_MS = 600;
// How much of the ball's recent path the trail covers, in seconds
const TRAIL_S = 0.14;
// The expanding circle's edge fades out over this share of its radius
const FEATHER = 0.18;

type Terrain = {
  width: number;
  height: number;
  valley: number; // y of the lowest point
  amp: number; // height of the starting hill above the valley
  ground: (x: number) => number; // y of the ball's ground at x (y grows downward)
  lipX: number; // where the ramp ends and the ball takes off
  startX: number;
  radius: number;
  gravity: number;
};

// The ground the ball travels on, sized to the screen so the slopes look
// the same on a phone and a wide monitor.
function makeTerrain(width: number, height: number): Terrain {
  // Tall phone screens get the scene a little higher, so it isn't all sky
  const valley = height * (height > width ? 0.7 : 0.8);
  const amp = Math.min(height * 0.42, width * 0.3);
  const top = valley - amp; // the starting hill
  const lip = valley - amp * 0.55; // the ramp's lip
  const dune = valley - amp * 0.28; // where the ball lands

  const [hillEnd, rampEnd, duneStart] = [0.42, 0.62, 0.76].map((f) => f * width);
  const hillStart = 0.1 * width;

  const ground = (x: number) => {
    if (x < hillStart) return top;
    if (x < hillEnd) {
      const u = (x - hillStart) / (hillEnd - hillStart);
      return top + (valley - top) * (1 - Math.cos(Math.PI * u)) * 0.5;
    }
    if (x < rampEnd) {
      // Steepens toward the lip, like a skate ramp, so the ball launches upward
      const u = (x - hillEnd) / (rampEnd - hillEnd);
      return valley - (valley - lip) * u * u;
    }
    if (x < duneStart) {
      const u = (x - rampEnd) / (duneStart - rampEnd);
      return lip + (dune - lip) * (1 - Math.cos(Math.PI * u)) * 0.5;
    }
    // A long, low dune with a gentle swell
    const u = (x - duneStart) / (width - duneStart);
    return dune - amp * 0.05 * Math.sin(Math.PI * Math.min(u, 1));
  };

  return {
    width,
    height,
    valley,
    amp,
    ground,
    lipX: rampEnd,
    startX: 0.06 * width,
    radius: Math.max(8, Math.min(width, height) * 0.026),
    gravity: amp * 2.8,
  };
}

// The still scenery, drawn once per screen size
function drawScene(ctx: CanvasRenderingContext2D, t: Terrain) {
  const { width: w, height: h, valley, amp } = t;

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#c9c3e6"); // lavender
  sky.addColorStop(0.38, "#eac6da"); // pink
  sky.addColorStop(0.62, "#f6cfc3"); // peach
  sky.addColorStop(0.85, "#fbe3c6"); // pale gold
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // The setting sun, with a soft glow
  const sunX = w * 0.7;
  const sunY = valley - amp * 1.15;
  const sunR = Math.min(w, h) * 0.11;
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.6, sunX, sunY, sunR * 3);
  glow.addColorStop(0, "rgb(255 236 214 / 0.55)");
  glow.addColorStop(1, "rgb(255 236 214 / 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#fff0dc";
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  // Far and middle dunes: gentle waves in dusty rose and sand
  const dunes = (base: number, swell: number, waves: number, phase: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) {
      ctx.lineTo(x, base - swell * (0.5 + 0.5 * Math.sin((x / w) * Math.PI * waves + phase)));
    }
    ctx.lineTo(w, h);
    ctx.fill();
  };
  dunes(valley - amp * 0.62, amp * 0.3, 2.2, 0.6, "rgb(222 180 186 / 0.6)");
  dunes(valley - amp * 0.3, amp * 0.25, 1.6, 2.4, "rgb(236 198 176 / 0.75)");

  // A small cactus on the far dunes
  const cx = w * 0.86;
  const cy = valley - amp * 0.5;
  const s = Math.min(w, h) * 0.05;
  ctx.strokeStyle = "rgb(176 140 150 / 0.7)";
  ctx.lineCap = "round";
  ctx.lineWidth = s * 0.22;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy - s);
  ctx.moveTo(cx, cy - s * 0.45);
  ctx.quadraticCurveTo(cx - s * 0.35, cy - s * 0.45, cx - s * 0.35, cy - s * 0.75);
  ctx.moveTo(cx, cy - s * 0.6);
  ctx.quadraticCurveTo(cx + s * 0.32, cy - s * 0.6, cx + s * 0.32, cy - s * 0.85);
  ctx.stroke();

  // The ball's ground, in front of everything
  const sand = ctx.createLinearGradient(0, h * 0.4, 0, h);
  sand.addColorStop(0, "#f1d5b4");
  sand.addColorStop(1, "#e9c3a0");
  ctx.fillStyle = sand;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 4) ctx.lineTo(x, t.ground(x));
  ctx.lineTo(w, h);
  ctx.fill();
}

const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);

export default function Intro() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const skip = useRef(() => {});

  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains("intro")) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return finish();

    root.style.overflow = "hidden"; // no scrolling the page underneath
    let frame = 0;
    let done = false;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const terrain = makeTerrain(w, h);
    const scene = document.createElement("canvas");
    scene.width = canvas.width;
    scene.height = canvas.height;
    const sceneCtx = scene.getContext("2d")!;
    sceneCtx.scale(dpr, dpr);
    drawScene(sceneCtx, terrain);

    // The page's background, as numbers, so the expanding ball can blend into it
    const background = (getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g) ?? ["247", "246", "243"]).slice(0, 3).map(Number);
    const ballTone = [250, 238, 230];
    const mix = (u: number) => ballTone.map((c, i) => Math.round(c + (background[i] - c) * u)).join(" ");
    const r = terrain.radius;

    // Ball state: rolling along the ground, then flying, then landed
    let phase: "roll" | "fly" | "land" = "roll";
    let x = terrain.startX;
    let speed = terrain.gravity * 0.12; // a small push to start it off
    let cx = 0;
    let cy = 0;
    let vx = 0;
    let vy = 0;
    let spin = 0;
    let landedAt = 0;
    let clock = 0; // simulated seconds
    const trail: { x: number; y: number; t: number }[] = [];

    // The slope just behind a point, so at the ramp's lip it's still the ramp's
    const slope = (at: number) => terrain.ground(at) - terrain.ground(at - 1);
    // The ball's centre sits one radius above the ground, along its normal
    const centreOn = (at: number) => {
      const s = slope(at);
      const n = Math.hypot(1, s);
      return { x: at + (r * s) / n, y: terrain.ground(at) - r / n };
    };

    function step(dt: number) {
      if (phase === "roll") {
        const s = slope(x);
        const n = Math.hypot(1, s);
        speed += ((terrain.gravity * s) / n) * dt;
        x += (speed / n) * dt;
        spin += (speed * dt) / r;
        ({ x: cx, y: cy } = centreOn(x));
        if (x >= terrain.lipX) {
          phase = "fly";
          vx = speed / n;
          vy = (speed * s) / n;
        }
      } else if (phase === "fly") {
        vy += terrain.gravity * dt;
        cx += vx * dt;
        cy += vy * dt;
        spin += (vx * dt) / r;
        if (vy > 0 && cy + r >= terrain.ground(cx)) {
          // Touch down and keep rolling along the dune, slowing to a stop
          phase = "land";
          landedAt = performance.now();
          x = cx;
          speed = vx * 0.7;
          ({ x: cx, y: cy } = centreOn(x));
        }
      } else {
        speed *= Math.exp(-5 * dt);
        x = Math.min(x + speed * dt, w - r);
        spin += (speed * dt) / r;
        ({ x: cx, y: cy } = centreOn(x));
      }
      clock += dt;
      trail.push({ x: cx, y: cy, t: clock });
      while (trail.length && clock - trail[0].t > TRAIL_S) trail.shift();
    }

    function draw(now: number) {
      ctx!.drawImage(scene, 0, 0, w, h);

      let radius = r;
      let squash = 1;
      let grow = 0; // 0 to 1 through the expansion
      if (phase === "land") {
        const since = now - landedAt;
        if (since < SQUASH_MS) squash = 1 - 0.14 * Math.sin((since / SQUASH_MS) * Math.PI);
        else {
          grow = easeInOut(Math.min((since - SQUASH_MS) / EXPAND_MS, 1));
          // Big enough that even the feathered edge clears the farthest corner
          const cover = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)) / (1 - FEATHER);
          radius = r + (cover - r) * grow;
        }
      }

      // The trail: soft-edged glows along the ball's recent path, smaller
      // and fainter the older they are, which blend into a blurred streak.
      // It fades away as the ball slows after landing.
      for (let i = 0; i < trail.length; i += 2) {
        const u = (i + 1) / trail.length;
        const { x: tx, y: ty } = trail[i];
        const size = r * (0.5 + 0.55 * u);
        const glow = ctx!.createRadialGradient(tx, ty, 0, tx, ty, size);
        glow.addColorStop(0, `rgb(255 248 240 / ${0.16 * u * (1 - grow)})`);
        glow.addColorStop(1, "rgb(255 248 240 / 0)");
        ctx!.fillStyle = glow;
        ctx!.beginPath();
        ctx!.arc(tx, ty, size, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Soft shadow on the ground beneath the ball
      if (grow === 0) {
        const gy = terrain.ground(cx);
        const lift = Math.max(0, gy - (cy + r));
        ctx!.fillStyle = `rgb(150 110 100 / ${0.18 * Math.max(0, 1 - lift / (h * 0.3))})`;
        ctx!.beginPath();
        ctx!.ellipse(cx, gy, r * 1.1, r * 0.3, 0, 0, Math.PI * 2);
        ctx!.fill();
      }

      // The ball: warm white, shaded, with a faint stripe that shows it
      // rolling. In flight it stretches a little along its path.
      ctx!.save();
      ctx!.translate(cx, cy + r * (1 - squash));
      const growing = grow > 0;
      if (phase !== "land") {
        const [dx, dy] = phase === "fly" ? [vx, vy] : [speed, speed * slope(x)];
        const stretch = 1 + Math.min(0.08, Math.hypot(dx, dy) / (r * 300));
        ctx!.rotate(Math.atan2(dy, dx));
        ctx!.scale(stretch, 1 / stretch);
        ctx!.rotate(-Math.atan2(dy, dx));
      }
      ctx!.scale(1 / squash, squash);
      if (growing) {
        // Blends from the ball's colour into the page's, with a soft edge
        const fill = ctx!.createRadialGradient(0, 0, 0, 0, 0, radius);
        const colour = mix(Math.min(grow * 1.6, 1));
        fill.addColorStop(0, `rgb(${colour})`);
        fill.addColorStop(1 - FEATHER, `rgb(${colour})`);
        fill.addColorStop(1, `rgb(${colour} / 0)`);
        ctx!.fillStyle = fill;
      } else {
        const shade = ctx!.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
        shade.addColorStop(0, "#fffdf9");
        shade.addColorStop(1, "#ecc9bb");
        ctx!.fillStyle = shade;
      }
      ctx!.beginPath();
      ctx!.arc(0, 0, radius, 0, Math.PI * 2);
      ctx!.fill();
      if (!growing) {
        // A faint rim, so the ball still reads in front of the pale sun
        ctx!.strokeStyle = "rgb(190 140 135 / 0.35)";
        ctx!.lineWidth = 1;
        ctx!.stroke();
        ctx!.rotate(spin);
        ctx!.strokeStyle = "rgb(214 170 160 / 0.6)";
        ctx!.lineWidth = r * 0.16;
        ctx!.beginPath();
        ctx!.arc(0, 0, r * 0.62, -0.6, 0.6);
        ctx!.stroke();
      }
      ctx!.restore();
    }

    let last = performance.now();
    function tick(now: number) {
      if (done) return;
      // Small fixed steps keep the motion the same at any frame rate
      let elapsed = Math.min((now - last) / 1000, 0.05);
      last = now;
      while (elapsed > 0) {
        const dt = Math.min(elapsed, 1 / 240);
        step(dt);
        elapsed -= dt;
      }

      draw(now);
      if (phase === "land" && now - landedAt >= SQUASH_MS + EXPAND_MS) return finish();
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);

    // Fade the overlay out, then hand the page back
    function finish() {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        // Without storage the intro just plays again next visit
      }
      root.classList.add("intro-out");
      window.setTimeout(() => {
        root.classList.remove("intro", "intro-out");
        root.style.overflow = "";
      }, FADE_MS);
    }

    skip.current = finish;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && finish();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    // A click or tap anywhere skips, as does the button (for keyboards)
    <div className="intro-overlay" onClick={() => skip.current()}>
      <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
      <button
        type="button"
        className="absolute bottom-6 right-6 rounded-full bg-white/55 px-4 py-2 text-sm font-medium text-[#5a4650] backdrop-blur-sm transition-colors duration-200 hover:bg-white/75"
      >
        Skip intro
      </button>
    </div>
  );
}
