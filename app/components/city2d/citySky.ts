"use client";

import { useSyncExternalStore } from "react";

// How far night has come over the city, shared from the one driver
// (CityDriver.tsx, which also writes it on <html> as --city-night) to every
// band (DistrictBand.tsx), so each band mounts only the plates it needs.
// null until the driver has run: on the server and at the first paint,
// when the bands show their gradient alone.

let blend: number | null = null;
const listeners = new Set<() => void>();

export function setCityBlend(next: number) {
  if (next === blend) return;
  blend = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => blend;
const getServerSnapshot = () => null;

export function useCityBlend(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
