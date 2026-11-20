"use client";

import type { ComponentType } from "react";
import type { SceneProps } from "./common";
import Riverside from "./Riverside";
import type { SceneId } from "./scenes";

// Each section's place is its own chunk, fetched when it's wanted: the
// address's place first, the rest in idle time after arrival, or as soon
// as a link to one is pointed at or focused. The riverside (Home) is built
// in: every journey goes through it.
//
// Until the sections' own scenes exist, all five load the one grey
// stand-in (districts/placeholder.tsx), each with its own colour.
type Loader = () => Promise<{ default: SceneComponent }>;
const standIn = (id: Exclude<SceneId, "lujiazui">): Loader => () => import("./districts/placeholder").then((m) => ({ default: m.standIn(id) }));

const loaders: Record<Exclude<SceneId, "lujiazui">, Loader> = {
  longtang: standIn("longtang"),
  towers: standIn("towers"),
  metro: standIn("metro"),
  "nanjing-road": standIn("nanjing-road"),
  bund: standIn("bund"),
};

export type SceneComponent = ComponentType<SceneProps>;

const loaded: Partial<Record<SceneId, SceneComponent>> = { lujiazui: Riverside };
const pending: Partial<Record<SceneId, Promise<SceneComponent>>> = {};

export const loadedScene = (id: SceneId) => loaded[id];

// One request per place, however often it's asked for. A failed fetch is
// forgotten, so the next ask tries again.
export function loadScene(id: SceneId): Promise<SceneComponent> {
  const ready = loaded[id];
  if (ready) return Promise.resolve(ready);
  pending[id] ??= loaders[id as Exclude<SceneId, "lujiazui">]().then(
    (m) => (loaded[id] = m.default),
    (error) => {
      delete pending[id];
      throw error;
    },
  );
  return pending[id];
}
