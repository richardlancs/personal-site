"use client";

// Development only (never linked, never imported; notFound in production):
// the city kit's neon, screens and signs (kit/neon.ts, kit/signs.ts) on a
// plain ground under a fixed camera. Query: ?hour=0..24 &weather=clear|rain
// &tier=high|low|mobile &view=wide|sign.

import { Canvas, useThree } from "@react-three/fiber";
import { notFound } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import Post from "../../../components/city3d/Post";
import { neonMaterial, glowSprites, screenArt, screenMaterial } from "../../../components/city3d/kit/neon";
import { buildMarkSign, buildSign, disposeSign, glowPoints } from "../../../components/city3d/kit/signs";
import { surface } from "../../../components/city3d/kit/surface";
import { textureBytes } from "../../../components/city3d/kit/textures";
import { neonUniforms } from "../../../components/city3d/kit/uniforms";
import { world } from "../../../components/city3d/store";
import type { Quality } from "../../../components/city3d/tiers";

type Params = { hour: number; rain: boolean; tier: Quality; view: "wide" | "sign" };

function read(): Params {
  const q = new URLSearchParams(location.search);
  const tier = q.get("tier");
  return {
    hour: Number(q.get("hour") ?? 12),
    rain: q.get("weather") === "rain",
    tier: tier === "low" || tier === "mobile" ? tier : "high",
    view: q.get("view") === "sign" ? "sign" : "wide",
  };
}

// How dark it is: 0 by day, 1 at night, through dusk and dawn
const night = (h: number) => {
  const s = (a: number, b: number, x: number) => Math.min(1, Math.max(0, (x - a) / (b - a)));
  return Math.max(s(17, 20, h), 1 - s(5, 7.5, h));
};

function Scene({ p }: { p: Params }) {
  const get = useThree((s) => s.get);
  const k = night(p.hour);
  const built = useMemo(() => {
    world.set({ quality: p.tier });
    const group = new THREE.Group();
    const meshes: THREE.Mesh[] = [];
    const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(x, y, z);
      group.add(mesh);
      meshes.push(mesh);
      return mesh;
    };
    add(new THREE.PlaneGeometry(60, 60), surface({ color: "#1b1e24" }), 0, 0, 0).rotation.x = -Math.PI / 2;
    add(new THREE.BoxGeometry(9, 6, 0.4), surface({ color: "#3a3f48" }), 4.6, 3, -2.4);
    add(new THREE.BoxGeometry(5, 9, 3), surface({ color: "#4a505a" }), -8.5, 4.5, -6);

    // The riverside's board, as Riverside.tsx sizes it at 40 units
    const board = buildSign({ text: "Projects", tone: "cyan", w: 5.4, h: 1.836, kind: "board" });
    board.group.position.set(-3.2, 2.7, -1);
    group.add(board.group);
    const roof = buildSign({ text: "Contact", tone: "gold", w: 2.6, h: 0.9, kind: "roof" });
    roof.group.position.set(-8.5, 9.9, -4.4);
    group.add(roof.group);
    const blade = buildSign({ text: "Interests", tone: "rose", w: 0.62, h: 2.3, kind: "blade" });
    blade.group.position.set(0.9, 3.4, -1.6);
    blade.group.rotation.y = Math.PI / 2;
    group.add(blade.group);

    // Decorative signs on the wall
    const marks = [
      buildMarkSign({ seed: 3, tone: "rose", w: 0.7, h: 2.4, kind: "blade" }),
      buildMarkSign({ seed: 8, tone: "gold", w: 0.6, h: 1.8, kind: "blade" }),
      buildMarkSign({ seed: 5, tone: "cyan", w: 2.4, h: 0.6, kind: "board" }),
    ];
    marks[0].position.set(2.4, 3.6, -1.7);
    marks[0].rotation.y = Math.PI / 2;
    marks[1].position.set(8.4, 3.0, -1.7);
    marks[1].rotation.y = Math.PI / 2;
    marks[2].position.set(6.6, 1.2, -2.05);
    group.add(...marks);

    // A screen, and neon strips along the wall
    add(new THREE.PlaneGeometry(3.4, 1.9), screenMaterial(screenArt(21), { w: 512, h: 286, key: "kitb:screen", glow: 1.8 }), 5.6, 3.9, -2.18);
    add(new THREE.BoxGeometry(8.6, 0.06, 0.06), neonMaterial("cyan"), 4.6, 5.8, -2.15);
    add(new THREE.BoxGeometry(2.6, 0.05, 0.05), neonMaterial("rose", { dayColor: "#d9d2d6" }), 3.0, 2.2, -2.15);
    add(new THREE.BoxGeometry(0.05, 1.6, 0.05), neonMaterial("gold"), 0.3, 1.4, -2.15);

    let sprites: THREE.InstancedMesh | null = null;
    if (p.tier === "mobile") {
      const pts = glowPoints(group);
      pts.push({ pos: new THREE.Vector3(1.6, 5.8, -2.0), color: "cyan", size: 1.4 }, { pos: new THREE.Vector3(7.6, 5.8, -2.0), color: "cyan", size: 1.4 });
      sprites = glowSprites(pts);
      group.add(sprites);
    }
    const signs = [board.group, roof.group, blade.group, ...marks];
    return {
      group,
      sprites,
      board,
      dispose: () => {
        signs.forEach(disposeSign);
        meshes.forEach((m) => m.geometry.dispose());
        if (sprites) {
          sprites.geometry.dispose();
          sprites.dispose();
        }
      },
    };
  }, [p.tier]);

  useEffect(() => () => built.dispose(), [built]);

  useEffect(() => {
    const { scene, gl, camera, invalidate } = get();
    neonUniforms.uNeon.value = (0.3 + 0.7 * k) * (p.rain ? 1.15 : 1);
    const sky = new THREE.Color("#6fa3dc").lerp(new THREE.Color("#2a2550"), Math.min(1, k * 1.6)).lerp(new THREE.Color("#0c1526"), Math.max(0, k * 1.6 - 0.6));
    if (p.rain) sky.lerp(new THREE.Color("#4b5563"), 0.4 * (1 - k));
    scene.background = sky;
    scene.fog = new THREE.Fog(sky, p.rain ? 14 : 22, p.rain ? 45 : 70);
    if (p.tier === "mobile") {
      gl.toneMapping = THREE.NeutralToneMapping;
      gl.toneMappingExposure = 1.12;
    }
    const w = window as unknown as { __kitb: unknown };
    w.__kitb = {
      textureBytes: () => textureBytes(scene),
      kitTextureBytes: () => textureBytes(),
      meshes: () => {
        let n = 0;
        let tris = 0;
        built.group.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          n++;
          const g = m.geometry;
          tris += (g.index ? g.index.count : g.getAttribute("position").count) / 3;
        });
        return { meshes: n, triangles: tris };
      },
      // The board's middle and a point on its plain face, on screen (px)
      boardPoints: () => {
        const size = gl.getSize(new THREE.Vector2());
        const at = (x: number, y: number) => {
          const v = built.board.group.localToWorld(new THREE.Vector3(x, y, 0.07)).project(camera);
          return [((v.x + 1) / 2) * size.x, ((1 - v.y) / 2) * size.y];
        };
        return { middle: at(0, 0), plain: at(-2.2, 0), above: at(0, 0.74), corner: at(-2.7, 0.918) };
      },
    };
      invalidate();
  }, [k, p.rain, p.tier, get, built]);

  return <primitive object={built.group} />;
}

function Lights({ k }: { k: number }) {
  return (
    <>
      <hemisphereLight args={["#bcd3f0", "#2a2a33", 1.1 - 0.85 * k]} />
      <directionalLight position={[6, 10, 6]} intensity={2.2 * (1 - k) + 0.15} color={k > 0.5 ? "#9fb3e0" : "#fff1dc"} />
    </>
  );
}

export default function KitBPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  const [p, setP] = useState<Params | null>(null);
  useEffect(() => {
    const id = window.setTimeout(() => setP(read()), 0);
    return () => window.clearTimeout(id);
  }, []);
  if (!p) return null;
  const cam = p.view === "sign" ? { position: [-3.2, 2.7, 3.2] as const, fov: 50 } : { position: [-7, 3.2, 9] as const, fov: 55 };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#000" }}>
      <Canvas
        dpr={1}
        gl={{ antialias: p.tier === "mobile", powerPreference: "high-performance" }}
        camera={{ position: [...cam.position], fov: cam.fov, near: 0.1, far: 200 }}
        onCreated={({ camera }) => camera.lookAt(p.view === "sign" ? new THREE.Vector3(-3.2, 2.7, -1) : new THREE.Vector3(2, 3.2, -2))}
        frameloop="demand"
      >
        <Lights k={night(p.hour)} />
        <Scene p={p} />
        <Post tier={p.tier} />
      </Canvas>
    </div>
  );
}
