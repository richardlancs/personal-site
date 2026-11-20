"use client";

import { Suspense, lazy, useEffect, useState } from "react";

// What every /city page loads after it is up (app/city/layout.tsx), in
// one chunk (CityAfter.tsx): the 3D city's shell, the driver that tells the
// city Richmond Hill's sky and hour, and the panel's behaviour. None of it
// draws anything a reader needs, and all of it acts only from effects, so
// it comes once the page has hydrated, keeping /city's first load as light
// as the home page's (cityInitialJs, docs/audit/scripts/budget.mjs).
const CityAfter = lazy(() => import("./CityAfter"));

export default function CityLoader() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 0);
    return () => window.clearTimeout(id);
  }, []);
  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      <CityAfter />
    </Suspense>
  );
}
