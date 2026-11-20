"use client";

import { Suspense, lazy, useEffect, useState } from "react";

// What every /city page loads after it is up (app/city/layout.tsx): the
// 3D city's shell (CityShell.tsx: the WebGL2 probe, the tier, the canvas)
// and the driver that tells the city Richmond Hill's sky and hour
// (weather/SkyDriver.tsx). Neither draws anything a reader needs, and both
// only act from effects, so they come in their own chunk once the page has
// hydrated, keeping /city's first load as light as the home page's
// (cityInitialJs, docs/audit/scripts/budget.mjs).
const CityShell = lazy(() => import("./CityShell"));
const SkyDriver = lazy(() => import("../weather/SkyDriver"));

export default function CityLoader() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(id);
  }, []);
  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      <CityShell />
      <SkyDriver />
    </Suspense>
  );
}
