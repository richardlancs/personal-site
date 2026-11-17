"use client";

import type { ComponentType } from "react";
import type { SceneProps } from "./scenes/common";
import type { SceneId } from "./scenes";
import Park from "./scenes/Park";

// Each place but the park is its own chunk, fetched when it's wanted: the
// address's place first, the rest in idle time after arrival, or as soon
// as a link to one is pointed at or focused. The park stays in the world
// chunk: it's the home page and every journey's hub, and what it builds
// with (buildings.ts, the vegetation) is shared with the station and the
// booth, which a chunk of its own would copy into each of theirs
// (docs/audit/performance.md, "Budgets").
const loaders: Record<Exclude<SceneId, "park">, () => Promise<{ default: ComponentType<SceneProps> }>> = {
  workshop: () => import("./scenes/Workshop"),
  station: () => import("./scenes/Station"),
  arcade: () => import("./scenes/Arcade"),
  library: () => import("./scenes/Library"),
  booth: () => import("./scenes/Booth"),
};

export type SceneComponent = ComponentType<SceneProps>;

const loaded: Partial<Record<SceneId, SceneComponent>> = { park: Park };
const pending: Partial<Record<SceneId, Promise<SceneComponent>>> = {};

export const loadedScene = (id: SceneId) => loaded[id];

// One request per place, however often it's asked for. A failed fetch is
// forgotten, so the next ask tries again.
export function loadScene(id: SceneId): Promise<SceneComponent> {
  if (loaded[id]) return Promise.resolve(loaded[id]);
  pending[id] ??= loaders[id as Exclude<SceneId, "park">]().then(
    (m) => (loaded[id] = m.default),
    (error) => {
      delete pending[id];
      throw error;
    },
  );
  return pending[id];
}
