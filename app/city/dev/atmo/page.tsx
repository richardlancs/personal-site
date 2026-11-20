"use client";

import { Canvas } from "@react-three/fiber";
import { notFound } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { parseSkyParam } from "../../../lib/skyParam";
import Atmosphere from "../../../components/city3d/atmosphere/Atmosphere";
import Precipitation from "../../../components/city3d/atmosphere/Precipitation";
import { SceneLights, WorldLights } from "../../../components/city3d/common";
import { neonMaterial } from "../../../components/city3d/kit/neon";
import { buildSkyDome } from "../../../components/city3d/kit/sky";
import { surface } from "../../../components/city3d/kit/surface";
import { windowMaterial } from "../../../components/city3d/kit/windows";
import Post from "../../../components/city3d/Post";
import { useWorld, world } from "../../../components/city3d/store";
import type { Quality } from "../../../components/city3d/tiers";
import { TIERS } from "../../../components/city3d/tiers";

// Development only, linked from nowhere: the atmosphere (Task 9) on a
// plain street of stand-ins under a fixed camera, to see the hour and the
// weather reach the sky, fog, light, neon, windows, bloom and rain.
//   /city/dev/atmo?sky=rain-night&hour=21&tier=high|low|mobile&bloom=0
// window.__atmo: { gl, programs(), sky(param), hour(h) } for the scripts.

const SPOTS: [number, number, number][] = [
  [-3, 0.7, -6],
  [3, 0.7, -10],
];

function Street() {
  const parts = useMemo(() => {
    const ground = surface({ color: "#59606b", wet: 1, snow: true });
    const pale = surface({ color: "#d9d6cf", snow: true });
    const stone = surface({ color: "#8c8a86", snow: true });
    const win = windowMaterial({ base: "#5d6470", glass: "#7f9cbc" });
    const cyan = neonMaterial("cyan");
    const rose = neonMaterial("rose");
    const gold = neonMaterial("gold");
    const box = new THREE.BoxGeometry(1, 1, 1);
    const plane = new THREE.PlaneGeometry(400, 400);
    const sky = buildSkyDome({ seed: 9, radius: 900 });
    return { ground, pale, stone, win, cyan, rose, gold, box, plane, sky };
  }, []);
  useEffect(
    () => () => {
      parts.box.dispose();
      parts.plane.dispose();
      parts.sky.geometry.dispose();
    },
    [parts],
  );
  const towers: [number, number, number, number, number][] = [
    // x, z, w, d, h
    [-7, -14, 4, 4, 9],
    [-2, -22, 5, 5, 16],
    [5, -18, 4, 6, 12],
    [11, -30, 6, 6, 24],
    [-12, -34, 6, 5, 20],
    [1, -45, 7, 7, 30],
    [-20, -60, 8, 8, 26],
    [18, -70, 8, 8, 34],
  ];
  return (
    <group name="scene:towers">
      <primitive object={parts.sky} />
      <mesh geometry={parts.plane} material={parts.ground} rotation-x={-Math.PI / 2} />
      {towers.map(([x, z, w, d, h], i) => (
        <mesh key={i} geometry={parts.box} material={parts.win} position={[x, h / 2, z]} scale={[w, h, d]} />
      ))}
      {/* a low pale block (the snow-glare test) and a stone one in front */}
      <mesh geometry={parts.box} material={parts.pale} position={[-4, 0.6, -5]} scale={[2.5, 1.2, 1.5]} />
      <mesh geometry={parts.box} material={parts.stone} position={[4, 0.4, -7]} scale={[2, 0.8, 2]} />
      {/* neon strips on the facades */}
      <mesh geometry={parts.box} material={parts.cyan} position={[-7, 4, -11.9]} scale={[3, 0.12, 0.05]} />
      <mesh geometry={parts.box} material={parts.rose} position={[5, 6, -14.9]} scale={[0.12, 4, 0.05]} />
      <mesh geometry={parts.box} material={parts.gold} position={[-2, 9, -19.4]} scale={[3.5, 0.15, 0.05]} />
      <SceneLights id="towers" spots={SPOTS} />
    </group>
  );
}

const read = () => {
  const q = new URLSearchParams(location.search);
  const t = q.get("tier");
  const tier: Quality = t === "low" || t === "mobile" ? t : "high";
  const hour = q.has("hour") ? Number(q.get("hour")) : null;
  return { tier, hour, sky: q.get("sky") };
};

export default function AtmoPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  const [params, setParams] = useState<ReturnType<typeof read> | null>(null);
  useEffect(() => {
    const id = window.setTimeout(() => setParams(read()), 0);
    return () => window.clearTimeout(id);
  }, []);
  // (the shared materials are the city canvas's too: CityShell mounts it on
  // every /city path, this one included, and disposes them when it goes)
  const live = useWorld((s) => s.live > 0 && !s.still);

  // The tier, from the address; __atmo.tier() changes it in place (the
  // step from high to low must compile nothing)
  const [stepped, setTier] = useState<Quality | null>(null);

  // The sky and hour from the address; the hour held against SkyDriver
  // (which writes the preview's own hour whenever the sky changes)
  useEffect(() => {
    if (!params) return;
    const sky = parseSkyParam(params.sky);
    if (sky) world.set({ sky });
    let pinned = params.hour;
    const hold = () => {
      if (pinned !== null && world.get().hour !== pinned) world.set({ hour: pinned });
    };
    hold();
    const off = world.subscribe(hold);
    const w = window as unknown as { __atmo?: Record<string, unknown> };
    w.__atmo = Object.assign(w.__atmo ?? {}, {
      tier: (t: Quality) => setTier(t),
      sky: (p: string) => {
        const s = parseSkyParam(p);
        if (s) world.set({ sky: s });
      },
      hour: (h: number) => {
        pinned = h;
        hold();
      },
    });
    return () => {
      off();
    };
  }, [params]);

  if (!params) return null;
  const tier = stepped ?? params.tier;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "#08090c" }}>
      <Canvas
        dpr={TIERS[tier].dpr}
        frameloop={live ? "always" : "demand"}
        gl={{ antialias: TIERS[tier].canvasAntialias, powerPreference: "high-performance" }}
        camera={{ fov: 50, near: 0.1, far: 1200, position: [0, 2.2, 22] }}
        onCreated={({ gl, camera, scene }) => {
          camera.lookAt(0, 6, -40);
          if (tier === "mobile") {
            gl.toneMapping = THREE.NeutralToneMapping;
            gl.toneMappingExposure = 1.12;
          }
          const w = window as unknown as { __atmo?: Record<string, unknown> };
          const extra = { gl, scene, programs: () => gl.info.programs?.length ?? 0 };
          if (w.__atmo) Object.assign(w.__atmo, extra);
          else w.__atmo = extra;
        }}
      >
        <WorldLights />
        <Street />
        <Atmosphere active="towers" />
        <Precipitation quality={tier} />
        <Post tier={tier} />
      </Canvas>
    </div>
  );
}
