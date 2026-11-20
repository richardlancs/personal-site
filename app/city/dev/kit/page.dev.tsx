"use client";

// Development only: the whole city kit together, as the riverside
// (Riverside.tsx: the sky, the skyline's towers and windows, the
// landmarks, neon crowns and screens, the five boards and the mark
// blades, the river and its reflections, wet paving, lamps, railing,
// viaduct, trees, and the ferry, train and warning lights), under the
// real atmosphere, rain and snow, and bloom, with the hour, weather, tier
// and view as controls.
//   /city/dev/kit?sky=clear-dusk-0.5&hour=19&tier=high|low|mobile&view=home|plate|boards&move=1
// It is not part of any build but `next dev`: its file is page.dev.tsx,
// and next.config.ts adds the "dev.tsx" page extension only in
// development, so a production build has no such route (a 404) and no
// chunk for it (docs/audit/scripts/budget.mjs counts nothing of it).
// Linked from nowhere; window.__kit: { gl, scene, programs() }.
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import * as THREE from "three";
import { parseSkyParam } from "../../../lib/skyParam";
import Atmosphere from "../../../components/city3d/atmosphere/Atmosphere";
import Precipitation from "../../../components/city3d/atmosphere/Precipitation";
import { WorldLights } from "../../../components/city3d/common";
import lujiazui from "../../../components/city3d/districts/lujiazui.def";
import Post from "../../../components/city3d/Post";
import Riverside from "../../../components/city3d/Riverside";
import { useWorld, world } from "../../../components/city3d/store";
import { TIERS, type Quality } from "../../../components/city3d/tiers";

type Params = { sky: string; hour: number | null; tier: Quality; view: "home" | "plate" | "boards"; move: boolean };

const SKIES = ["clear-day", "cloudy-day", "rain-day", "snow-day", "clear-dawn-0.3", "clear-dusk-0.2", "clear-dusk-0.5", "clear-dusk-0.9", "neutral-night", "clear-night", "rain-night", "snow-night"];
const POSES = {
  home: lujiazui.home,
  plate: { pos: lujiazui.plateFrame.pos, target: lujiazui.plateFrame.target },
  boards: { pos: [2, 3, 0] as const, target: [2, 5, -40] as const },
};

function read(): Params {
  const q = new URLSearchParams(location.search);
  const t = q.get("tier");
  const v = q.get("view");
  return {
    sky: q.get("sky") ?? "clear-day",
    hour: q.has("hour") ? Number(q.get("hour")) : null,
    tier: t === "low" || t === "mobile" ? t : "high",
    view: v === "plate" || v === "boards" ? v : "home",
    move: q.get("move") === "1",
  };
}

function Camera({ view }: { view: Params["view"] }) {
  const get = useThree((s) => s.get);
  useEffect(() => {
    const { camera, invalidate } = get();
    const p = POSES[view];
    camera.position.set(p.pos[0], p.pos[1], p.pos[2]);
    camera.lookAt(p.target[0], p.target[1], p.target[2]);
    const lens = camera as THREE.PerspectiveCamera;
    lens.fov = view === "plate" ? lujiazui.plateFrame.fov : lujiazui.fov;
    lens.updateProjectionMatrix();
    invalidate();
  }, [get, view]);
  return null;
}

const label = { display: "flex", gap: 6, alignItems: "center" } as const;

export default function KitPreview() {
  const [p, setP] = useState<Params | null>(null);
  useEffect(() => {
    const id = window.setTimeout(() => setP(read()), 0);
    return () => window.clearTimeout(id);
  }, []);
  const live = useWorld((s) => s.live > 0 && !s.still);

  // The sky from the address; the hour held against SkyDriver (which
  // writes the preview's own hour whenever the sky changes)
  useEffect(() => {
    if (!p) return;
    const sky = parseSkyParam(p.sky);
    if (sky) world.set({ sky });
    const hold = () => {
      if (p.hour !== null && world.get().hour !== p.hour) world.set({ hour: p.hour });
    };
    hold();
    const off = world.subscribe(hold);
    if (!p.move) world.set({ still: true });
    return () => {
      off();
    };
  }, [p]);

  if (!p) return null;
  const t = TIERS[p.tier];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "#08090c" }} data-kit-ready="">
      <Canvas
        dpr={t.dpr}
        frameloop={live ? "always" : "demand"}
        gl={{ antialias: t.canvasAntialias, powerPreference: "high-performance" }}
        camera={{ fov: lujiazui.fov, near: 0.1, far: 1200, position: [0, 2, 10] }}
        onCreated={({ gl, scene }) => {
          if (p.tier === "mobile") {
            gl.toneMapping = THREE.NeutralToneMapping;
            gl.toneMappingExposure = 1.12;
          }
          (window as unknown as { __kit: unknown }).__kit = { gl, scene, programs: () => gl.info.programs?.length ?? 0 };
        }}
      >
        <Camera view={p.view} />
        <WorldLights />
        <Atmosphere active="lujiazui" />
        <Precipitation quality={p.tier} />
        <Riverside active quality={p.tier} navigate={() => {}} still={!p.move} />
        <Post tier={p.tier} />
      </Canvas>
      <form method="get" style={{ position: "absolute", left: 12, bottom: 12, display: "flex", flexWrap: "wrap", gap: 12, padding: 10, background: "#181b23", color: "#e6e9ee", font: "14px sans-serif", borderRadius: 8 }}>
        <label style={label}>
          Sky
          <select name="sky" defaultValue={p.sky}>
            {SKIES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label style={label}>
          Hour
          <input name="hour" type="number" min={0} max={24} step={0.5} defaultValue={p.hour ?? ""} style={{ width: 64 }} />
        </label>
        <label style={label}>
          Tier
          <select name="tier" defaultValue={p.tier}>
            <option>high</option>
            <option>low</option>
            <option>mobile</option>
          </select>
        </label>
        <label style={label}>
          View
          <select name="view" defaultValue={p.view}>
            <option>home</option>
            <option>plate</option>
            <option>boards</option>
          </select>
        </label>
        <label style={label}>
          <input type="checkbox" name="move" value="1" defaultChecked={p.move} /> Moving
        </label>
        <button type="submit">Show</button>
      </form>
    </div>
  );
}
