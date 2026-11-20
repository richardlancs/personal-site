"use client";

// Development only: Kit C (the river and its reflections, wet paving,
// lamps, railings, the viaduct, trees, and the train, a boat and the
// towers' warning lights) on a plain riverside under a fixed camera, to
// look at and screenshot. Not linked from anywhere and imported by
// nothing; a 404 in production.
//   /city/dev/kit-c?hour=21&weather=clear|cloudy|rain|snow&tier=high|low|mobile&reflect=planar|fake&move=1&view=home|street&paving=planar
// The look per hour is a rough stand-in for the atmosphere's (Task 9), as
// in the kit-a preview. window.__kitC.measure() counts draw calls (every
// pass) and times frames.
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { notFound } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { litShare } from "../../../lib/cityWindows";
import { aircraftLights, buildBoat, buildTrain } from "../../../components/city3d/kit/movers";
import { reflectIn, type LightStrip } from "../../../components/city3d/kit/reflection";
import { buildSkyDome } from "../../../components/city3d/kit/sky";
import { buildLampRow, buildRailing, buildViaduct } from "../../../components/city3d/kit/street";
import { surface } from "../../../components/city3d/kit/surface";
import { buildTowers, layoutTowers } from "../../../components/city3d/kit/towers";
import { buildStreetTrees } from "../../../components/city3d/kit/trees";
import { envUniforms, windowUniforms } from "../../../components/city3d/kit/uniforms";
import { buildRiver, wetPaving } from "../../../components/city3d/kit/water";
import { TIERS } from "../../../components/city3d/tiers";
import { rng } from "../../../components/city3d/rng";

type Params = { hour: number; weather: string; tier: "high" | "low" | "mobile"; reflect: "planar" | "fake"; move: boolean; view: "home" | "street"; paving: "planar" | "fake" };

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

// The night plates' streak colours: the neon tones and the windows' warm light
const TONES = ["#4fd8ee", "#f062b4", "#ffb454", "#ffc98a", "#ffc98a", "#bfe4ff"];

function build(p: Params) {
  const r = rng(77);
  const sky = buildSkyDome({ seed: 9101, radius: 900 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), surface({ color: "#3e434c", grime: 0.4, snow: true }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  const nearSpecs = layoutTowers(7, { x0: -70, x1: 70, z0: -95, z1: -58 }, 46, [5, 32]);
  const near = buildTowers(nearSpecs, { far: false });
  const far = buildTowers(layoutTowers(8, { x0: -200, x1: 200, z0: -240, z1: -110 }, 60, [6, 26]), { far: true, fogScale: 1.4 });
  const towers = [...near, ...far];
  // every near tower's lights in the water, from the bank's edge
  const lights: LightStrip[] = nearSpecs.map((t) => ({ x: t.x, z: t.z + t.d / 2, w: Math.max(0.4, t.w * 0.35), color: r.pick(TONES), height: t.h * 0.75 }));
  // and the bank's lamps, low
  for (let x = -66; x <= 66; x += 6) lights.push({ x, z: -51, w: 0.25, color: "#ffc98a", height: 0.6 });
  const mode = p.reflect;
  const size = TIERS[p.tier].reflectionSize || 512;
  // the river, from the promenade's edge to the far bank
  const river = buildRiver({ w: 600, d: 48, x: 0, z: -26, y: 0.03, mode, lights, size });
  const paving = wetPaving({ w: 40, d: 8, x: 0, z: 6, y: 0.035, mode: p.paving === "planar" ? mode : "fake", lights: [{ x: -3, z: 2, w: 0.25, color: "#ffc98a", height: 0.6 }, { x: 3, z: 2, w: 0.25, color: "#ffc98a", height: 0.6 }, { x: 9, z: 2, w: 0.25, color: "#ffc98a", height: 0.6 }] });
  const railing = buildRailing([new THREE.Vector3(-20, 0.035, 2.05), new THREE.Vector3(20, 0.035, 2.05)]);
  const lamps = buildLampRow([-9, -3, 3, 9].map((x) => ({ x, y: 0.035, z: 2.4, ry: Math.PI / 2 })));
  const bankLamps = buildLampRow(Array.from({ length: 23 }, (_, i) => ({ x: -66 + i * 6, z: -51 })));
  const viaduct = buildViaduct([new THREE.Vector3(-90, 2.9, -18), new THREE.Vector3(-10, 2.9, -18)], { width: 0.9 });
  const train = buildTrain(4, { span: 90 });
  train.object.position.set(-50, 2.9, -18);
  const boat = buildBoat(3, { z: -32, x0: -70, x1: 70, period: 60 });
  boat.object.position.y = 0.03;
  const tops = nearSpecs.filter((t) => t.h > 20).map((t) => new THREE.Vector3(t.x, t.h + 0.1, t.z));
  const air = aircraftLights(5, tops);
  const bankTrees = buildStreetTrees(11, Array.from({ length: 70 }, (_, i) => ({ x: -69 + i * 2 + r.range(-0.4, 0.4), z: -53 + r.range(-0.6, 0.6), s: r.range(0.8, 1.2) })));
  const promTrees = buildStreetTrees(12, [-15, -6, 6, 15].map((x) => ({ x, z: 8.5, s: 0.9 })));
  const bank = new THREE.Mesh(new THREE.BoxGeometry(600, 0.4, 2), surface({ color: "#6d6a62", grime: 0.5 }));
  bank.position.set(0, 0.05, -50.6);
  if (mode === "planar") reflectIn(sky, ...towers, ...bankTrees, air.object, ...bankLamps.meshes, bank, viaduct, train.object, boat.object);
  const movers = [train, boat, air];
  const objects: THREE.Object3D[] = [sky, ground, ...towers, river.mesh, paving.mesh, railing, ...lamps.meshes, ...bankLamps.meshes, viaduct, bank, ...bankTrees, ...promTrees, ...movers.map((m) => m.object)];
  return {
    objects,
    movers,
    dispose() {
      river.dispose();
      paving.dispose();
      lamps.dispose();
      bankLamps.dispose();
      for (const o of [sky, ground, ...towers, railing, viaduct, bank, ...bankTrees, ...promTrees]) (o as THREE.Mesh).geometry.dispose();
      for (const m of movers) m.object.userData.dispose?.();
    },
  };
}

function Scene({ p }: { p: Params }) {
  const get = useThree((s) => s.get);
  const built = useMemo(() => build(p), [p]);
  useEffect(() => () => built.dispose(), [built]);
  const l = useMemo(() => look(p.hour), [p.hour]);
  useFrame(({ clock }) => {
    applyLook(get().scene, l, p.weather, p.hour);
    for (const m of built.movers) {
      if (p.move) m.update(clock.elapsedTime + 20);
      else m.park();
    }
  });
  useEffect(() => {
    const { invalidate } = get();
    invalidate();
    const id = setTimeout(invalidate, 300);
    return () => clearTimeout(id);
  }, [get, l, p]);
  return (
    <>
      {built.objects.map((o) => (
        <primitive key={o.uuid} object={o} />
      ))}
      <directionalLight position={[60, 90, 40]} intensity={(1 - l.night) * 2.2 + 0.08} color={l.dusk > 0.3 ? "#ffc89a" : "#fff4e0"} />
      <hemisphereLight args={[l.night > 0.5 ? "#4a5a99" : "#cfe0ff", "#3a3a40", (1 - l.night) * 1.2 + 0.2]} />
    </>
  );
}

// Draw calls in every pass (the reflection's included), and frame times
function Stats() {
  const get = useThree((s) => s.get);
  useEffect(() => {
    const { gl } = get();
    const ctx = gl.getContext() as WebGL2RenderingContext;
    let calls = 0;
    const wrap = (name: "drawArrays" | "drawElements" | "drawArraysInstanced" | "drawElementsInstanced") => {
      const f = ctx[name] as (...a: unknown[]) => void;
      (ctx as unknown as Record<string, unknown>)[name] = (...a: unknown[]) => {
        calls++;
        f.apply(ctx, a);
      };
    };
    (["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced"] as const).forEach(wrap);
    (window as unknown as { __kitC: unknown }).__kitC = {
      measure(n = 30) {
        const { gl: r, scene, camera } = get();
        r.info.autoReset = false;
        r.info.reset();
        calls = 0;
        r.render(scene, camera);
        const one = { calls, triangles: r.info.render.triangles, programs: r.info.programs?.length, textures: r.info.memory.textures };
        const px = new Uint8Array(4);
        ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px);
        const times: number[] = [];
        for (let i = 0; i < n; i++) {
          const t0 = performance.now();
          r.render(scene, camera);
          ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px);
          times.push(performance.now() - t0);
        }
        r.info.autoReset = true;
        times.sort((a, b) => a - b);
        return { ...one, medianMs: times[Math.floor(n / 2)], p90Ms: times[Math.floor(n * 0.9)] };
      },
    };
  }, [get]);
  return null;
}

export default function KitCPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  const [p, setP] = useState<Params | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const tier = q.get("tier") === "low" || q.get("tier") === "mobile" ? (q.get("tier") as "low" | "mobile") : "high";
    const reflect = q.get("reflect");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the address once, after hydration
    setP({
      hour: Number(q.get("hour") ?? 12) || 0,
      weather: q.get("weather") ?? "clear",
      tier,
      reflect: reflect === "planar" || reflect === "fake" ? reflect : TIERS[tier].reflection,
      move: q.get("move") === "1",
      view: q.get("view") === "street" ? "street" : "home",
      paving: q.get("paving") === "planar" ? "planar" : "fake",
    });
  }, []);
  if (!p) return null;
  const street = p.view === "street";
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2147483000, background: "#08090c" }} data-kit-c-ready>
      <Canvas
        dpr={TIERS[p.tier].dpr}
        gl={{ antialias: true }}
        shadows={false}
        frameloop={p.move ? "always" : "demand"}
        camera={{ position: street ? [0, 0.3, 9.5] : [0, 2, 10], fov: 40, near: 0.3, far: 2000 }}
        onCreated={({ gl, camera }) => {
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1.12;
          camera.lookAt(street ? new THREE.Vector3(0, 0.25, 0) : new THREE.Vector3(0, 5, -60));
        }}
      >
        <Scene p={p} />
        <Stats />
      </Canvas>
    </div>
  );
}
