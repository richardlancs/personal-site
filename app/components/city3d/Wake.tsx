"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { hintPlate } from "./kit/plate";
import { loadScene } from "./sceneChunks";
import type { SceneId } from "./scenes";
import { world } from "./store";

// What wakes the 3D city without moving its camera (City3D.tsx mounts
// both; the mouse never moves the camera, tests/city3d-plate.test.mjs):
// the rest ticker, woken by any input, and the links that fetch a place
// ahead of the journey there.

// At rest the city only lives quietly: the drift on the desktop tiers, a
// painted place's water, sky and lights, the arcade's attract mode (the
// store's `ambient`). For those the canvas draws at most REST_FPS times a
// second, and not at all once there has been no input (pointer, keys,
// wheel, touch, scroll) and no change in the store (a sky, a choice, an
// arrival) for REST_IDLE_MS; anything of those starts it again. Anything
// really moving (a flight, a turn to something chosen, a sky's blend, the
// rain and snow: the store's `live`) draws every frame as before; still
// view and a hidden tab draw nothing.
const REST_FPS = 30;
const REST_IDLE_MS = 60_000;
export function RestTicker({ on }: { on: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!on) return;
    let since = performance.now();
    let drawn = 0;
    let raf = 0;
    const tick = (now: number) => {
      raf = 0;
      if (now - since > REST_IDLE_MS) return;
      if (now - drawn >= 1000 / REST_FPS - 4) {
        drawn = now;
        invalidate();
      }
      raf = requestAnimationFrame(tick);
    };
    const poke = () => {
      since = performance.now();
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const events = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;
    for (const e of events) window.addEventListener(e, poke, { passive: true });
    // (a change someone can see coming: not the minute's tick of the hour,
    // nor the counters themselves)
    let last = world.get();
    const off = world.subscribe(() => {
      const now = world.get();
      const seen = now.sky !== last.sky || now.focus !== last.focus || now.hover !== last.hover || now.arrived !== last.arrived || now.sel !== last.sel || now.arcadePress !== last.arcadePress;
      last = now;
      if (seen) poke();
    });
    poke();
    return () => {
      cancelAnimationFrame(raf);
      for (const e of events) window.removeEventListener(e, poke);
      off();
    };
  }, [on, invalidate]);
  return null;
}

// A link to a place, pointed at or focused anywhere on the page: its
// chunk is fetched now, so the journey there doesn't wait for it; pressed
// (or Enter on it): its paintings start on their way too, before the
// address changes (kit/plate.ts: hintPlate)
export function useLinkHints(placeFor: (pathname: string) => SceneId) {
  useEffect(() => {
    const hrefOf = (e: Event) => (e.target as Element | null)?.closest?.("a[href^='/city']")?.getAttribute("href")?.split("#")[0];
    const want = (e: Event) => {
      const href = hrefOf(e);
      if (href) loadScene(placeFor(href)).catch(() => {});
    };
    const press = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== "Enter") return;
      const href = hrefOf(e);
      if (href) hintPlate(placeFor(href));
    };
    document.addEventListener("pointerover", want, { passive: true });
    document.addEventListener("focusin", want);
    document.addEventListener("pointerdown", press, { passive: true });
    document.addEventListener("keydown", press);
    return () => {
      document.removeEventListener("pointerover", want);
      document.removeEventListener("focusin", want);
      document.removeEventListener("pointerdown", press);
      document.removeEventListener("keydown", press);
    };
  }, [placeFor]);
}
