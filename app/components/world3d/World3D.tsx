"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { anchors } from "./anchors";
import { windUniforms } from "./paint";
import { routesFromPark, sceneForPath, scenes, type Pose, type SceneId, type V3 } from "./scenes";
import Arcade from "./scenes/Arcade";
import Booth from "./scenes/Booth";
import Library from "./scenes/Library";
import Park from "./scenes/Park";
import Station from "./scenes/Station";
import Workshop from "./scenes/Workshop";
import { useWorld, world } from "./store";

const order: SceneId[] = ["park", "workshop", "station", "arcade", "library", "booth"];
const components = { park: Park, workshop: Workshop, station: Station, arcade: Arcade, library: Library, booth: Booth };

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const narrowLayout = () => matchMedia("(orientation: portrait), (max-width: 767px)").matches;

const add = (a: V3, b: V3) => new THREE.Vector3(a[0] + b[0], a[1] + b[1], a[2] + b[2]);
const inWorld = (scene: SceneId, pose: Pose) => ({ pos: add(pose.pos, scenes[scene].offset), target: add(pose.target, scenes[scene].offset) });

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number) => t * t * t;

type Move = {
  kind: "move";
  dur: number;
  ease: (t: number) => number;
  to: { pos: THREE.Vector3; target: THREE.Vector3 }[];
  iris?: { to: number; from: number; until: number };
};
type Swap = { kind: "swap"; scene: SceneId; pose: { pos: THREE.Vector3; target: THREE.Vector3 } };
type Seg = Move | Swap;
type Running = { seg: Move; t: number; pos: THREE.CatmullRomCurve3; look: THREE.CatmullRomCurve3; irisFrom: number };

// The pose the camera rests at in a place: what it's looking at, or home
function restPose(scene: SceneId, focus: string | null) {
  const def = scenes[scene];
  return inWorld(scene, (focus && def.focus[focus]) || def.home);
}

// The camera, and every journey it makes
function Director({
  target,
  active,
  onSwap,
  iris,
}: {
  target: { scene: SceneId; focus: string | null };
  active: SceneId;
  onSwap: (scene: SceneId) => void;
  iris: React.RefObject<HTMLDivElement | null>;
}) {
  const { camera, gl, scene: three } = useThree();
  const st = useRef({
    pos: new THREE.Vector3(),
    look: new THREE.Vector3(),
    queue: [] as Seg[],
    running: null as Running | null,
    iris: 1,
    active,
    started: false,
    yaw: 0,
    pitch: 0,
    dragging: false,
    lastDrag: 0,
    pointer: new THREE.Vector2(),
    parallax: new THREE.Vector2(),
    shift: 0,
    arrived: false,
  });

  // Fog and background belong to the place
  useEffect(() => {
    const def = scenes[active];
    three.fog = new THREE.Fog(def.fog.color, def.fog.near, def.fog.far);
    three.background = new THREE.Color(def.background);
    st.current.active = active;
  }, [active, three]);

  // Plan the journey whenever the address changes
  useEffect(() => {
    const s = st.current;
    const to = target.scene;
    const from = s.started ? s.active : null;
    const sameScene = from === to;
    // Arrive looking at what's chosen in the place
    const sel = world.get().sel;
    const focusId = target.focus === "monitor" ? `monitor-${sel.project}` : target.focus === "cabinet" ? `cabinet-${sel.interest}` : target.focus;
    world.set({ focus: focusId, hover: null, ...(sameScene ? {} : { arrived: false, phoneUp: false }) });
    if (iris.current) iris.current.style.background = scenes[to === "park" && from ? from : to].threshold;
    s.running = null;
    const final = restPose(to, focusId);

    if (reducedMotion()) {
      s.queue = [{ kind: "swap", scene: to, pose: final }];
      s.iris = 0;
      s.started = true;
      return;
    }
    if (!from) {
      // Arriving on the site: the camera walks in, the iris opens
      const start = inWorld(to, scenes[to].enter);
      s.queue = [
        { kind: "swap", scene: to, pose: start },
        { kind: "move", dur: to === "park" && !focusId ? 3.2 : 2, ease: easeInOut, to: [final], iris: { to: 0, from: 0.05, until: 0.45 } },
      ];
      s.started = true;
      return;
    }
    if (sameScene) {
      s.queue = [];
      if (s.iris > 0) s.queue.push({ kind: "move", dur: 0.6, ease: easeOut, to: [final], iris: { to: 0, from: 0, until: 1 } });
      return;
    }
    const enterTo = inWorld(to, scenes[to].enter);
    const arrive: Seg[] = [
      { kind: "swap", scene: to, pose: enterTo },
      { kind: "move", dur: 1.25, ease: easeOut, to: [final], iris: { to: 0, from: 0, until: 0.45 } },
    ];
    if (from === "park") {
      // Fly the path to the place's door, the threshold closes in
      const route = routesFromPark[to]!;
      const look = add(route.look, scenes.park.offset);
      const pts = route.path.map((p, i) => {
        const pos = add(p, scenes.park.offset);
        const t = (i + 1) / route.path.length;
        return { pos, target: s.look.clone().lerp(look, t * t) };
      });
      pts[pts.length - 1].target = look;
      s.queue = [{ kind: "move", dur: 1.45, ease: easeInOut, to: pts, iris: { to: 1, from: 0.66, until: 1 } }, ...arrive];
    } else if (to === "park") {
      // Back out of the door, and step back from the place to the park
      const route = routesFromPark[from]!;
      const exit = inWorld(from, scenes[from].exit);
      const door = add(route.path[route.path.length - 1], scenes.park.offset);
      const look = add(route.look, scenes.park.offset);
      const back = [...route.path].reverse().slice(1).map((p) => ({ pos: add(p, scenes.park.offset), target: look.clone().lerp(final.target, 0.5) }));
      s.queue = [
        { kind: "move", dur: 0.85, ease: easeIn, to: [exit], iris: { to: 1, from: 0.35, until: 1 } },
        { kind: "swap", scene: "park", pose: { pos: door, target: look } },
        { kind: "move", dur: 1.6, ease: easeInOut, to: [...back, final], iris: { to: 0, from: 0, until: 0.35 } },
      ];
    } else {
      // From one place straight to another
      s.queue = [{ kind: "move", dur: 0.75, ease: easeIn, to: [inWorld(from, scenes[from].exit)], iris: { to: 1, from: 0.3, until: 1 } }, ...arrive];
    }
  }, [target.scene, target.focus, iris]);

  // Look around by dragging; parallax follows the mouse
  useEffect(() => {
    const el = gl.domElement;
    let last: [number, number] | null = null;
    const down = (e: PointerEvent) => {
      last = [e.clientX, e.clientY];
    };
    const move = (e: PointerEvent) => {
      const s = st.current;
      s.pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
      if (!last || !(e.buttons & 1)) return;
      const dx = e.clientX - last[0];
      const dy = e.clientY - last[1];
      last = [e.clientX, e.clientY];
      if (Math.abs(dx) + Math.abs(dy) > 1) {
        s.dragging = true;
        s.lastDrag = performance.now();
        s.yaw = THREE.MathUtils.clamp(s.yaw - dx * 0.0035, -0.5, 0.5);
        s.pitch = THREE.MathUtils.clamp(s.pitch - dy * 0.0025, -0.22, 0.22);
      }
    };
    const up = () => {
      last = null;
      st.current.dragging = false;
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [gl]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") (window as unknown as { __camera: THREE.Camera }).__camera = camera;
  }, [camera]);

  const tmp = useMemo(() => ({ dir: new THREE.Vector3(), right: new THREE.Vector3(), p: new THREE.Vector3(), l: new THREE.Vector3() }), []);

  useFrame(({ size, clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = st.current;
    const reduce = reducedMotion();

    // Next segment
    while (!s.running && s.queue.length) {
      const seg = s.queue.shift()!;
      if (seg.kind === "swap") {
        s.pos.copy(seg.pose.pos);
        s.look.copy(seg.pose.target);
        s.yaw = s.pitch = 0;
        if (s.active !== seg.scene) {
          s.active = seg.scene;
          onSwap(seg.scene);
        }
        if (reduce) {
          s.iris = 0;
        }
      } else {
        s.running = {
          seg,
          t: 0,
          pos: new THREE.CatmullRomCurve3([s.pos.clone(), ...seg.to.map((p) => p.pos)], false, "centripetal"),
          look: new THREE.CatmullRomCurve3([s.look.clone(), ...seg.to.map((p) => p.target)], false, "centripetal"),
          irisFrom: s.iris,
        };
      }
    }

    const r = s.running;
    if (r) {
      r.t = Math.min(1, r.t + dt / r.seg.dur);
      const e = r.seg.ease(r.t);
      r.pos.getPoint(e, s.pos);
      r.look.getPoint(e, s.look);
      const ir = r.seg.iris;
      if (ir) {
        const k = THREE.MathUtils.clamp((r.t - ir.from) / Math.max(ir.until - ir.from, 0.001), 0, 1);
        s.iris = THREE.MathUtils.lerp(r.irisFrom, ir.to, k * k * (3 - 2 * k));
      }
      if (r.t >= 1) s.running = null;
    } else if (!s.queue.length) {
      // At rest: settle on what we're looking at
      const rest = restPose(s.active, world.get().focus);
      const k = 1 - Math.exp(-dt * (reduce ? 60 : 2.4));
      s.pos.lerp(rest.pos, k);
      s.look.lerp(rest.target, k);
      const settled = s.pos.distanceTo(rest.pos) < 0.08;
      if (settled !== s.arrived || world.get().arrived !== settled) {
        s.arrived = settled || s.arrived;
        if (settled && !world.get().arrived) world.set({ arrived: true });
      }
    }

    // Idle breathing, parallax and looking around
    const resting = !r && !s.queue.length && !reduce;
    const t = clock.elapsedTime;
    tmp.p.copy(s.pos);
    tmp.l.copy(s.look);
    if (resting) {
      const near = world.get().focus ? 0.3 : 1;
      s.parallax.lerp(s.pointer, 1 - Math.exp(-dt * 2));
      tmp.dir.subVectors(tmp.l, tmp.p).normalize();
      tmp.right.crossVectors(tmp.dir, camera.up).normalize();
      tmp.p.addScaledVector(tmp.right, s.parallax.x * 0.35 * near);
      tmp.p.y += -s.parallax.y * 0.12 * near + Math.sin(t * 0.45) * 0.025 * near;
      tmp.l.x += Math.sin(t * 0.21) * 0.06 * near;
      if (!s.dragging && performance.now() - s.lastDrag > 2500) {
        s.yaw *= Math.exp(-dt * 1.2);
        s.pitch *= Math.exp(-dt * 1.2);
      }
    } else if (!s.dragging) {
      s.yaw *= Math.exp(-dt * 4);
      s.pitch *= Math.exp(-dt * 4);
    }
    camera.position.copy(tmp.p);
    camera.lookAt(tmp.l);
    camera.rotateY(s.yaw);
    camera.rotateX(s.pitch);

    // Frame the place to one side on wide screens, leaving room for the page
    const cam = camera as THREE.PerspectiveCamera;
    const wide = !narrowLayout() && size.width >= 900;
    const frame = scenes[s.active].frame;
    const want = wide && !r && frame !== "center" ? (frame === "left" ? 0.17 : -0.17) : 0;
    s.shift += (want - s.shift) * (1 - Math.exp(-dt * 2.5));
    const fov = size.width / size.height < 1 ? 58 : 48;
    if (cam.fov !== fov) cam.fov = fov;
    if (Math.abs(s.shift) > 0.001) cam.setViewOffset(size.width, size.height, s.shift * size.width, 0, size.width, size.height);
    else cam.clearViewOffset();
    cam.updateProjectionMatrix();

    // The threshold
    const el = iris.current;
    if (el) {
      el.style.setProperty("--iris", s.iris.toFixed(3));
      el.style.visibility = s.iris > 0.002 ? "visible" : "hidden";
    }
  });

  return null;
}

// Wind: a slow clock for everything that sways, and gusts that come
// through at irregular times, build, hold and die away
function Wind() {
  const gust = useRef({ phase: "idle" as "idle" | "rise" | "hold" | "fall", t: 0, next: 3, strength: 0.7, hold: 1.5 });
  useFrame((_, rawDt) => {
    if (reducedMotion()) return;
    const dt = Math.min(rawDt, 0.05);
    windUniforms.uTime.value += dt;
    const g = gust.current;
    g.t += dt;
    let env = 0;
    if (g.phase === "idle") {
      if (g.t > g.next) {
        g.phase = "rise";
        g.t = 0;
        g.strength = 0.45 + Math.random() * 0.6;
        g.hold = 0.8 + Math.random() * 1.8;
        const a = -0.5 + (Math.random() - 0.5) * 0.6;
        windUniforms.uGustDir.value.set(Math.cos(a), Math.sin(a));
      }
    } else if (g.phase === "rise") {
      env = THREE.MathUtils.smoothstep(g.t, 0, 1.5);
      if (g.t > 1.5) [g.phase, g.t] = ["hold", 0];
    } else if (g.phase === "hold") {
      env = 1 - 0.15 * Math.sin(g.t * 3);
      if (g.t > g.hold) [g.phase, g.t] = ["fall", 0];
    } else {
      env = 1 - THREE.MathUtils.smoothstep(g.t, 0, 2.8);
      if (g.t > 2.8) {
        g.phase = "idle";
        g.t = 0;
        g.next = 5 + Math.random() * 11;
      }
    }
    windUniforms.uGust.value = env * g.strength;
  });
  return null;
}

// Moves the HTML labels to their places in the world
function LabelProjector({ active }: { active: SceneId }) {
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    const arrived = world.get().arrived;
    for (const el of document.querySelectorAll<HTMLElement>("[data-anchor]")) {
      const id = el.dataset.anchor!;
      const p = anchors.get(id);
      if (!p || !id.startsWith(`${active}:`) || !arrived) {
        el.dataset.hidden = "";
        continue;
      }
      v.copy(p).project(camera);
      if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) {
        el.dataset.hidden = "";
        continue;
      }
      delete el.dataset.hidden;
      el.style.transform = `translate3d(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px, 0)`;
    }
  });
  return null;
}

// The places in the park, as links pinned to their buildings. They're the
// park's keyboard and screen-reader way in, and its name tags.
const parkLinks = [
  { id: "library", href: "/about", name: "The pavilion", section: "About" },
  { id: "workshop", href: "/projects", name: "The workshop", section: "Projects" },
  { id: "station", href: "/experience", name: "The station", section: "Experience" },
  { id: "arcade", href: "/interests", name: "The arcade", section: "Interests" },
  { id: "booth", href: "/contact", name: "The phone booth", section: "Contact" },
  { id: "board", href: "/map", name: "The notice board", section: "Map of the park" },
];

function Labels({ active }: { active: SceneId }) {
  const hover = useWorld((s) => s.hover);
  const labels = useWorld((s) => s.labels);
  if (active !== "park") return null;
  return (
    <nav aria-label="Places in the park" className="world-labels" data-all={labels || undefined}>
      {parkLinks.map((place) => (
        <Link
          key={place.id}
          href={place.href}
          data-anchor={`park:${place.id}`}
          data-hidden=""
          data-on={hover === `park:${place.id}` || undefined}
          className="world-label"
          onFocus={() => world.set({ hover: `park:${place.id}` })}
          onBlur={() => world.set({ hover: null })}
          onPointerEnter={() => world.set({ hover: `park:${place.id}` })}
          onPointerLeave={() => world.set({ hover: null })}
        >
          <span className="world-label-place">{place.name}</span>
          <span className="world-label-section">{place.section}</span>
        </Link>
      ))}
    </nav>
  );
}

function detectQuality(): "high" | "low" {
  const nav = navigator as Navigator & { deviceMemory?: number };
  if (matchMedia("(pointer: coarse)").matches || window.innerWidth < 768) return "low";
  if ((nav.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4) return "low";
  return "high";
}

export default function World3D() {
  const pathname = usePathname();
  const router = useRouter();
  const target = sceneForPath(pathname);
  const [active, setActive] = useState<SceneId>(target.scene);
  const [mounted, setMounted] = useState<SceneId[]>([target.scene]);
  const [quality] = useState(detectQuality);
  const [visible, setVisible] = useState(true);
  const iris = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);

  // The place you're going to is built straight away; the rest are built
  // quietly one by one once the first is showing, so later journeys
  // don't wait
  if (!mounted.includes(target.scene)) setMounted([...mounted, target.scene]);
  useEffect(() => {
    let i = 0;
    let timer = 0;
    const next = () => {
      const missing = order.filter((s) => !mounted.includes(s));
      if (!missing.length) return;
      setMounted((m) => (m.includes(missing[0]) ? m : [...m, missing[0]]));
      timer = window.setTimeout(next, 700);
    };
    timer = window.setTimeout(next, 3500 + i);
    i++;
    return () => window.clearTimeout(timer);
    // Once, after the first place is up
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop drawing when the world is scrolled out of view (phones) or the
  // tab is hidden
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const navigate = (href: string) => router.push(href);

  return (
    <div ref={box} className="world3d" data-scene={active}>
      <Canvas
        shadows
        dpr={quality === "low" ? [1, 1.5] : [1, 1.75]}
        frameloop={visible ? "always" : "never"}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 48, near: 0.1, far: 900, position: [0, 2, 20] }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1.12;
        }}
        aria-hidden="true"
      >
        <Director target={target} active={active} onSwap={setActive} iris={iris} />
        <Wind />
        <LabelProjector active={active} />
        {order
          .filter((id) => mounted.includes(id))
          .map((id) => {
            const Scene = components[id];
            return (
              <group key={id} position={scenes[id].offset}>
                <Scene active={active === id} quality={quality} navigate={navigate} />
              </group>
            );
          })}
      </Canvas>
      <div ref={iris} className="world-iris" aria-hidden="true" />
      <Labels active={active} />
    </div>
  );
}
