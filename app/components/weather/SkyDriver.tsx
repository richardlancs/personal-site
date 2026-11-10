"use client";

import { useEffect } from "react";
import type { SkyState } from "../../lib/sky";
import { useWorld, world } from "../world3d/store";
import { useRichmondHill } from "./useRichmondHill";

// Tells the world what Richmond Hill's sky is like (world3d/store.ts:
// `sky`): the weather's preset from the live reading, and the daylight
// from Richmond Hill's clock and that day's sun. Without a usable reading
// the preset is "neutral" and the source "fallback", while the daylight
// still follows the clock (from the astronomical sun, lib/time.ts).
//
// The development preview controls set `source: "preview"`; while they
// do, this leaves the sky alone, and puts the live sky back as soon as
// they set any other source. Renders nothing.
export default function SkyDriver() {
  const { now, condition, daylight } = useRichmondHill();
  const previewing = useWorld((s) => s.sky.source === "preview");

  const preset = condition?.preset ?? "neutral";
  const source: SkyState["source"] = condition ? "live" : "fallback";
  const phase = daylight.phase;
  // Changes once a minute at most; three places is finer than any blend needs
  const progress = Math.round(daylight.progress * 1000) / 1000;

  useEffect(() => {
    // `now` is 0 only in the server snapshot, before the clock is known
    if (now === 0 || previewing) return;
    const sky = world.get().sky;
    if (sky.source === "preview") return;
    if (sky.preset === preset && sky.daylight === phase && sky.progress === progress && sky.source === source) return;
    world.set({ sky: { preset, daylight: phase, progress, source } });
  }, [now, previewing, preset, phase, progress, source]);

  return null;
}
