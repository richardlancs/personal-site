"use client";

// Development only: Kit A (towers, windows, surfaces, sky) on a plain
// ground under a fixed camera, to look at and screenshot. Not linked from
// anywhere and imported by nothing; a 404 in production.
//   /city/dev/kit-a?hour=21&weather=clear|cloudy|rain|snow&tier=high|low|mobile&view=far|near
// The look per hour here is a rough stand-in for the atmosphere's
// (Task 9), only so the kit can be judged by day, at dusk and at night.
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { notFound } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { litShare } from "../../../lib/cityWindows";
import { buildSkyDome } from "../../../components/city3d/kit/sky";
import { surface } from "../../../components/city3d/kit/surface";
import { buildTowers, layoutTowers } from "../../../components/city3d/kit/towers";
import { envUniforms, windowUniforms } from "../../../components/city3d/kit/uniforms";
import { TIERS } from "../../../components/city3d/tiers";

type Params = { hour: number; weather: string; tier: "high" | "low" | "mobile"; view: "far" | "near" };

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const ramp = (a: number, b: number, x: number) => clamp01((x - a) / (b - a));

function look(hour: number) {
  const night = Math.max(1 - ramp(5, 7, hour), ramp(17.5, 20, hour));
  const dusk = hour > 12 ? 4 * night * (1 - night) : 0;
  const c = (a: string, b: string, t: number) => new THREE.Color(a).lerp(new THREE.Color(b), t);
  const top = c("#2c64c6", "#0c1526", night);
  const horizon = c("#a4cdee", "#1d2a5c", night).lerp(new THREE.Color("#ffb454"), dusk * 0.8);
  return { night, dusk, top, horizon };
}

function applyLook(scene: THREE.Scene, l: ReturnType<typeof look>, weather: string, hour: number) {
  const sky = scene.getObjectByName("sky") as THREE.Mesh | undefined;
  if (!sky) return;
  const u = (sky.material as THREE.ShaderMaterial).uniforms;
  const grey = weather === "clear" ? 0 : weather === "cloudy" ? 0.55 : 0.7;
  const greyC = new THREE.Color(l.night > 0.5 ? "#2a3044" : "#a9b2bf");
  u.uTop.value.copy(l.top).lerp(greyC, grey);
  u.uHorizon.value.copy(l.horizon).lerp(greyC, grey * 0.8);
  u.uCover.value = weather === "clear" ? 0.35 : weather === "cloudy" ? 0.8 : 0.9;
  u.uMoon.value = ramp(0.6, 1, l.night);
  u.uStars.value = weather === "clear" ? ramp(0.5, 1, l.night) : 0;
  u.uCityGlow.value = Math.max(l.night, l.dusk * 0.4) * (weather === "clear" ? 1 : 1.3);
  u.uCloudLit.value.set(l.night > 0.5 ? "#3a4366" : "#f4f6fb");
  u.uCloudShade.value.set(l.night > 0.5 ? "#1c2238" : "#9fb3d6");
  envUniforms.uNight.value = l.night;
  envUniforms.uWet.value = weather === "rain" ? 1 : 0;
  envUniforms.uSnow.value = weather === "snow" ? 1 : 0;
  windowUniforms.uLitShare.value = litShare(hour);
  if (!scene.fog) scene.fog = new THREE.Fog("#000", 60, 500);
  const fog = scene.fog as THREE.Fog;
  fog.color.copy(u.uHorizon.value).lerp(l.top, 0.25);
  fog.far = weather === "clear" ? 520 : 300;
}

function Scene({ p }: { p: Params }) {
  const get = useThree((s) => s.get);
  const built = useMemo(() => {
    const sky = buildSkyDome({ seed: 9001, radius: 900 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), surface({ color: "#4a5160", grime: 0.4, snow: true }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    const near = buildTowers(layoutTowers(7, { x0: -45, x1: 45, z0: -60, z1: -12 }, 40, [6, 30], [{ x: 0, z: -30, r: 7 }]), { far: false });
    const far = buildTowers(layoutTowers(8, { x0: -170, x1: 170, z0: -230, z1: -90 }, 60, [6, 26]), { far: true, fogScale: 1.4 });
    return { sky, ground, towers: [...near, ...far] };
  }, []);
  useEffect(
    () => () => {
      built.sky.geometry.dispose();
      built.ground.geometry.dispose();
      // (the shared materials are the layout canvas's too: City3D disposes them)
      for (const t of built.towers) t.geometry.dispose();
    },
    [built],
  );

  const l = useMemo(() => look(p.hour), [p.hour]);
  const weather = p.weather;
  // The layout's own /city canvas runs the atmosphere, which writes the same
  // shared uniforms every frame; so this preview sets its look in its own
  // frame, just before it draws
  useFrame(() => applyLook(get().scene, l, weather, p.hour));
  useEffect(() => {
    const { invalidate } = get();
    invalidate();
    const id = setTimeout(invalidate, 300);
    return () => clearTimeout(id);
  }, [get, l, weather]);

  return (
    <>
      <primitive object={built.sky} />
      <primitive object={built.ground} />
      {built.towers.map((t) => (
        <primitive key={t.uuid} object={t} />
      ))}
      <directionalLight position={[60, 90, 40]} intensity={(1 - l.night) * 2.2 + 0.08} color={l.dusk > 0.3 ? "#ffc89a" : "#fff4e0"} />
      <hemisphereLight args={[l.night > 0.5 ? "#4a5a99" : "#cfe0ff", "#3a3a40", (1 - l.night) * 1.2 + 0.2]} />
    </>
  );
}

function Stats() {
  const { gl } = useThree();
  useEffect(() => {
    (window as unknown as { __kitA: unknown }).__kitA = { info: () => ({ calls: gl.info.render.calls, triangles: gl.info.render.triangles, programs: gl.info.programs?.length }) };
  }, [gl]);
  return null;
}

export default function KitAPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  const [p, setP] = useState<Params | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const tier = q.get("tier");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the address once, after hydration
    setP({
      hour: Number(q.get("hour") ?? 12) || 0,
      weather: q.get("weather") ?? "clear",
      tier: tier === "low" || tier === "mobile" ? tier : "high",
      view: q.get("view") === "near" ? "near" : "far",
    });
  }, []);
  if (!p) return null;
  const camera = p.view === "near" ? { position: [4, 1.7, -8] as const, fov: 60 } : { position: [0, 3, 40] as const, fov: 40 };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2147483000, background: "#08090c" }} data-kit-a-ready>
      <Canvas
        dpr={TIERS[p.tier].dpr}
        gl={{ antialias: true }}
        frameloop="demand"
        camera={{ position: [...camera.position], fov: camera.fov, near: 0.5, far: 2000 }}
        onCreated={({ gl, camera: cam }) => {
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1.12;
          cam.lookAt(p.view === "near" ? new THREE.Vector3(-6, 9, -40) : new THREE.Vector3(0, 9, -60));
        }}
      >
        <Scene p={p} />
        <Stats />
      </Canvas>
    </div>
  );
}
