"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PAINTING, type SceneId } from "../../data/world";
import { layers, leafSprites, nearLayers, type Layer } from "./layers";

// Everything in the park that moves on its own, and the pointer parallax.
//
// The idle sway of each layer is a CSS animation (globals.css); this adds
// what CSS can't do well: gusts of wind that travel across the park from
// the sunny side and pass through each tree in turn, at irregular times;
// a leaf now and then; the booth light catching; the pointer moving the
// near layers more than the far ones. All of it stops when the tab is
// hidden or the park is scrolled away, and none of it runs for visitors
// who ask for reduced motion.

const RECEIVER_EVENT = "world:receiver";

// Lift or hang up the receiver from anywhere (the Contact page uses it)
export function setReceiver(up: boolean) {
  window.dispatchEvent(new CustomEvent(RECEIVER_EVENT, { detail: up }));
}

const random = (min: number, max: number) => min + Math.random() * (max - min);
const allLayers = [...layers, ...nearLayers];

type Parallax = { el: HTMLElement; depth: number };

export default function useAmbience(root: React.RefObject<HTMLDivElement | null>, scene: SceneId) {
  const parallax = useRef(new Map<string, Parallax>());
  const gusts = useRef(new Map<string, HTMLElement>());
  const falling = useRef<HTMLDivElement | null>(null);
  const dust = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef(scene);
  const [receiverUp, setReceiverUp] = useState(false);

  // Refs are cached per layer so React doesn't re-attach them every render
  const layerRefs = useRef(new Map<string, (el: HTMLDivElement | null) => void>());
  const layerRef = useCallback((item: Pick<Layer, "depth"> & { id?: string }) => {
    const key = item.id ?? "plate";
    let ref = layerRefs.current.get(key);
    if (!ref) {
      ref = (el) => {
        if (el) parallax.current.set(key, { el, depth: item.depth });
        else parallax.current.delete(key);
      };
      layerRefs.current.set(key, ref);
    }
    return ref;
  }, []);

  const gustRefs = useRef(new Map<string, (el: HTMLDivElement | null) => void>());
  const gustRef = useCallback((item: Layer) => {
    let ref = gustRefs.current.get(item.id);
    if (!ref) {
      ref = (el) => {
        if (el && item.gust) gusts.current.set(item.id, el);
        else gusts.current.delete(item.id);
      };
      gustRefs.current.set(item.id, ref);
    }
    return ref;
  }, []);

  const dustRef = useCallback((el: HTMLDivElement | null) => {
    dust.current = el;
  }, []);
  const fallingRef = useCallback((el: HTMLDivElement | null) => {
    falling.current = el;
  }, []);

  const motionOk = () =>
    typeof window !== "undefined" &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches &&
    root.current?.dataset.paused !== "true";

  // One layer bending in the wind and coming back, with a little overshoot
  const bend = useCallback((id: string, strength: number, delay = 0) => {
    const el = gusts.current.get(id);
    const layer = allLayers.find((item) => item.id === id);
    if (!el || !layer?.gust || !layer.sway) return;
    const a = layer.gust * strength;
    const turn = layer.sway.kind === "grass" || layer.sway.kind === "chain" ? (deg: number) => ({ transform: `skewX(${-deg}deg)` }) : (deg: number) => ({ rotate: `${deg}deg` });
    el.animate(
      [
        turn(0),
        { ...turn(-a), offset: 0.24 },
        { ...turn(a * 0.42), offset: 0.5 },
        { ...turn(-a * 0.2), offset: 0.7 },
        { ...turn(a * 0.07), offset: 0.86 },
        turn(0),
      ],
      { duration: random(2400, 3400) * (layer.sway.kind === "chain" ? 1.6 : 1), delay, easing: "ease-in-out" },
    );
  }, []);

  const dropLeaf = useCallback((near = false) => {
    const box = falling.current;
    if (!box) return;
    const width = box.offsetWidth;
    const scale = width / PAINTING.width;
    const sprite = leafSprites[Math.floor(Math.random() * leafSprites.length)];
    // Most leaves come off the big tree; some off the yellow one
    const fromGinkgo = !near && Math.random() < 0.3;
    const x = fromGinkgo ? random(390, 570) : random(780, 1240);
    const y = fromGinkgo ? random(350, 470) : random(40, 240);
    const size = (near ? random(1.2, 1.5) : random(0.75, 1.05)) * scale;
    const leaf = document.createElement("img");
    leaf.src = sprite.src;
    leaf.alt = "";
    leaf.className = "leaf";
    leaf.style.left = `${(x / PAINTING.width) * 100}%`;
    leaf.style.top = `${(y / PAINTING.height) * 100}%`;
    leaf.style.width = `${sprite.width * size}px`;
    box.append(leaf);

    // Falls with the wind, rocking side to side, and settles on the ground
    const fall = random(560, 820) * scale - (y - 200) * scale * 0.4;
    const drift = random(-60, 200) * scale;
    const rock = random(18, 34) * scale;
    const spin = random(-260, 260);
    const steps = 9;
    const frames = Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps;
      const sway = Math.sin(t * Math.PI * 3.2) * rock * (1 - t * 0.4);
      return {
        transform: `translate(${drift * t + sway}px, ${fall * t * (0.85 + 0.15 * t)}px) rotate(${spin * t + sway * 1.5}deg)`,
        opacity: i === 0 ? 0 : i >= steps - 1 ? (i === steps ? 0 : 0.85) : 1,
      };
    });
    const animation = leaf.animate(frames, { duration: random(7000, 10500), easing: "linear" });
    animation.onfinish = () => leaf.remove();
    animation.oncancel = () => leaf.remove();
  }, []);

  const gust = useCallback(
    (strength: number) => {
      // The wind comes from the sunny side, so it reaches the left of the
      // park first
      for (const layer of allLayers) {
        if (!layer.gust) continue;
        bend(layer.id, strength * random(0.8, 1.15), (layer.box[0] / PAINTING.width) * 1100 + random(0, 120));
      }
      if (strength > 0.65) {
        const count = Math.random() < 0.4 ? 2 : 1;
        for (let i = 0; i < count; i++) window.setTimeout(() => dropLeaf(i === 0 && Math.random() < 0.35), random(300, 1500));
      }
    },
    [bend, dropLeaf],
  );

  const flicker = useCallback(() => {
    const light = document.querySelector<HTMLElement>(".glow-booth");
    if (!light) return;
    light.animate(
      [{ filter: "brightness(1)" }, { filter: "brightness(0.45)", offset: 0.12 }, { filter: "brightness(1.05)", offset: 0.3 }, { filter: "brightness(0.6)", offset: 0.42 }, { filter: "brightness(1)" }],
      { duration: random(500, 900), easing: "steps(6, end)" },
    );
  }, []);

  useEffect(() => {
    sceneRef.current = scene;
  }, [scene]);

  // Pause everything when the tab is hidden or the park is out of view
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let visible = true;
    const update = () => {
      el.dataset.paused = String(document.hidden || !visible);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(el.querySelector("[data-world-view]")!);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [root]);

  // Gusts, leaves and the booth light, at irregular times
  useEffect(() => {
    const timers: number[] = [];
    const later = (fn: () => void, min: number, max: number) => {
      timers.push(window.setTimeout(fn, random(min, max)));
    };

    const wind = () => {
      if (motionOk()) gust(random(0.45, 1));
      later(wind, 6500, 17000);
    };
    const leaf = () => {
      if (motionOk()) dropLeaf();
      later(leaf, 8000, 19000);
    };
    const light = () => {
      if (motionOk()) flicker();
      later(light, 9000, 26000);
    };
    later(wind, 2500, 5000);
    later(leaf, 3000, 7000);
    later(light, 4000, 9000);
    return () => timers.forEach((timer) => window.clearTimeout(timer));
    // motionOk only reads refs and media queries
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gust, dropLeaf, flicker]);

  // Dust in the low sun, made once
  useEffect(() => {
    const box = dust.current;
    if (!box || box.childElementCount) return;
    for (let i = 0; i < 16; i++) {
      const mote = document.createElement("span");
      mote.style.left = `${random(4, 52)}%`;
      mote.style.top = `${random(22, 70)}%`;
      mote.style.setProperty("--size", `${random(2, 4.5).toFixed(1)}px`);
      mote.style.setProperty("--dx", `${random(-30, 50).toFixed(0)}px`);
      mote.style.setProperty("--dy", `${random(-40, 25).toFixed(0)}px`);
      mote.style.animationDuration = `${random(14, 30).toFixed(1)}s`;
      mote.style.animationDelay = `${-random(0, 30).toFixed(1)}s`;
      box.append(mote);
    }
  }, []);

  // Pointer parallax: near layers follow the pointer more than far ones.
  // Eased toward the pointer each frame; stops when it has caught up.
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame = 0;

    const step = () => {
      current.x += (target.x - current.x) * 0.06;
      current.y += (target.y - current.y) * 0.06;
      // Quieter while reading a place's page
      const reach = sceneRef.current === "park" ? 1 : 0.4;
      for (const { el, depth } of parallax.current.values()) {
        el.style.translate = `${(-current.x * depth * 12 * reach).toFixed(2)}px ${(-current.y * depth * 7 * reach).toFixed(2)}px`;
      }
      const settled = Math.abs(target.x - current.x) < 0.002 && Math.abs(target.y - current.y) < 0.002;
      frame = settled ? 0 : requestAnimationFrame(step);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      target.x = (event.clientX / window.innerWidth) * 2 - 1;
      target.y = (event.clientY / window.innerHeight) * 2 - 1;
      if (!frame) frame = requestAnimationFrame(step);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  // The receiver, lifted from the booth or from the Contact page
  useEffect(() => {
    const onReceiver = (event: Event) => setReceiverUp((event as CustomEvent<boolean>).detail);
    window.addEventListener(RECEIVER_EVENT, onReceiver);
    return () => window.removeEventListener(RECEIVER_EVENT, onReceiver);
  }, []);
  if (receiverUp && scene !== "booth") setReceiverUp(false);

  return {
    layerRef,
    gustRef,
    dustRef,
    fallingRef,
    receiverUp,
    liftReceiver: setReceiver,
    // A push: the swing given a shove, the sign knocked
    push: (id: string, strength: number) => {
      if (motionOk()) bend(id, strength / (allLayers.find((layer) => layer.id === id)?.gust ?? 1));
    },
    hover: (id: string) => {
      if (id === "booth" && motionOk()) flicker();
    },
  };
}
