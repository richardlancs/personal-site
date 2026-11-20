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
// One loader per section's place, each its own file (districts/<id>.tsx,
// default export a SceneProps component), so each scene replaces its own
// file and nothing here. Until then each file is the grey stand-in.
type Loader = () => Promise<{ default: SceneComponent }>;

const loaders: Record<Exclude<SceneId, "lujiazui">, Loader> = {
  longtang: () => import("./districts/longtang"),
  towers: () => import("./districts/towers"),
  metro: () => import("./districts/metro"),
  "nanjing-road": () => import("./districts/nanjing-road"),
  bund: () => import("./districts/bund"),
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
