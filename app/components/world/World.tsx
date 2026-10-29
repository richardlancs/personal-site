"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  cameraFor,
  discoveries,
  noticeBoard,
  PAINTING,
  places,
  receiver,
  sceneFor,
  type Box,
  type Camera,
  type Discovery,
  type SceneId,
} from "../../data/world";
import { layers, nearLayers, plate, type Layer } from "./layers";
import useAmbience from "./useAmbience";

// A box on the painting as CSS percentages of the painting
const boxStyle = ([left, top, right, bottom]: Box) =>
  ({
    "--l": `${(left / PAINTING.width) * 100}%`,
    "--t": `${(top / PAINTING.height) * 100}%`,
    "--w": `${((right - left) / PAINTING.width) * 100}%`,
    "--h": `${((bottom - top) / PAINTING.height) * 100}%`,
  }) as React.CSSProperties;

// A point on the painting as a percentage of a layer's own box
const within = ([left, top, right, bottom]: Box, x: number, y: number) =>
  `${((x - left) / (right - left)) * 100}% ${((y - top) / (bottom - top)) * 100}%`;

// The image for a layer: its share of the painting's on-screen width
const layerSizes = ([left, , right]: Box) => {
  const share = (right - left) / PAINTING.width;
  return `(min-aspect-ratio: 3/2) ${Math.ceil(share * 100)}vw, ${Math.ceil(share * 150)}vh`;
};

// Name tags sit above their object, except where that would run into the
// introduction (pavilion, workshop) or the corner controls (station)
const labelBelow = new Set(["station", "pavilion", "workshop"]);

// The world: the painted park, always there behind every page. The URL
// decides where the camera looks: the whole park on the home page, the
// notice board on /map, and each place on its own page. Changing pages
// moves the camera, so going somewhere and coming back are one continuous
// movement, and browser back/forward, deep links and keyboard all work
// the way they do on any site.
export default function World() {
  const pathname = usePathname();
  const router = useRouter();
  // A place chosen in the park: the camera sets off at once, before the
  // page for it has arrived
  const [setOff, setSetOff] = useState<{ from: string; to: SceneId } | null>(null);
  if (setOff && setOff.from !== pathname) setSetOff(null);
  const scene = setOff?.to ?? sceneFor(pathname);
  const camera = cameraFor(scene);
  const go = (to: SceneId) => (event: React.MouseEvent) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    setSetOff({ from: pathname, to });
  };
  const root = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState<Discovery | null>(null);
  const [panned, setPanned] = useState(false);
  const aiming = useRef(false); // our own scroll to the board isn't a pan

  // Layers grow around the point the camera last moved toward, so they
  // shrink back around the same point on the way out
  const [focus, setFocus] = useState<Camera>(camera ?? noticeBoard.camera);
  if (camera && camera !== focus) setFocus(camera);

  // A note only belongs to the park
  if (note && scene !== "park") setNote(null);

  const { layerRef, gustRef, dustRef, fallingRef, receiverUp, liftReceiver, push, hover } = useAmbience(root, scene);

  // Escape from any place goes back to the park
  useEffect(() => {
    if (scene === "park") return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const target = event.target as HTMLElement;
      if (target.closest("dialog, [popover]:popover-open, input, textarea")) return;
      router.push("/");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scene, router]);

  // Phones pan across the park: start looking at the notice board
  useEffect(() => {
    if (scene !== "park") return;
    const view = root.current?.querySelector<HTMLElement>("[data-world-view]");
    if (!view || view.scrollWidth <= view.clientWidth) return;
    const board = (noticeBoard.camera.x / PAINTING.width) * view.scrollWidth;
    aiming.current = true;
    view.scrollLeft = board - view.clientWidth * 0.55;
    const done = window.setTimeout(() => (aiming.current = false), 200);
    return () => window.clearTimeout(done);
  }, [scene]);

  useEffect(() => {
    if (!note) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setNote(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [note]);

  function look(discovery: Discovery) {
    setNote(note?.id === discovery.id ? null : discovery);
    if (discovery.id === "swing") push("swing", 9);
    if (discovery.id === "signpost") push("sign", 7);
  }

  const style = {
    "--cx": (focus.x / PAINTING.width).toString(),
    "--cy": (focus.y / PAINTING.height).toString(),
    "--cz": (camera?.zoom ?? 1).toString(),
    "--ax": (camera?.at[0] ?? 0.5).toString(),
    "--ay": (camera?.at[1] ?? 0.5).toString(),
  } as React.CSSProperties;

  const layer = (item: Layer) => (
    <div
      key={item.id}
      ref={layerRef(item)}
      className={`layer layer-${item.id}`}
      style={boxStyle(item.box)}
    >
      <div
        className="layer-push"
        style={
          {
            "--push": item.push,
            transformOrigin: within(item.box, focus.x, focus.y),
          } as React.CSSProperties
        }
      >
        <div
          className={item.sway ? `sway sway-${item.sway.kind}` : undefined}
          style={
            item.sway &&
            ({
              transformOrigin: within(item.box, ...item.sway.pivot),
              "--amp": item.sway.amp,
              "--period": `${item.sway.period}s`,
            } as React.CSSProperties)
          }
        >
          <div ref={gustRef(item)} className="gust" style={item.sway && { transformOrigin: within(item.box, ...item.sway.pivot) }}>
            <Image src={item.src} alt="" fill sizes={layerSizes(item.box)} quality={85} draggable={false} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      ref={root}
      className="world"
      data-scene={scene}
      data-receiver={receiverUp ? "up" : undefined}
      style={style}
    >
      <div className="world-view" data-world-view onScroll={() => panned || aiming.current || setPanned(true)}>
        <div className="world-camera">
          <div className="world-stage" aria-hidden={scene !== "park"}>
            <div className="layer layer-plate" ref={layerRef({ depth: 0.4 })} style={boxStyle([0, 0, PAINTING.width, PAINTING.height])}>
              <div className="layer-push" style={{ "--push": 0 } as React.CSSProperties}>
                <Image
                  src={plate}
                  alt=""
                  fill
                  preload
                  placeholder="blur"
                  quality={85}
                  sizes="(min-aspect-ratio: 3/2) 100vw, 150vh"
                  draggable={false}
                />
              </div>
            </div>

            {layers.map(layer)}

            {/* Light: the sun through the trees, lit windows, the booth */}
            <div className="light-shafts" aria-hidden="true" />
            <div className="dapple" style={boxStyle([560, 700, 1260, 1000])} aria-hidden="true" />
            {places.map(
              (place) =>
                place.light && (
                  <div
                    key={place.id}
                    className={`glow glow-${place.id}`}
                    data-on={scene === place.id || undefined}
                    style={boxStyle(place.light)}
                    aria-hidden="true"
                  />
                ),
            )}
            <div className="dust" ref={dustRef} aria-hidden="true" />
            <div className="falling" ref={fallingRef} aria-hidden="true" />

            {nearLayers.map(layer)}

            {/* What you can click in the park */}
            <div className="spots" inert={scene !== "park"}>
              {places.map((place) => (
                <Link
                  key={place.id}
                  href={place.href}
                  data-label={labelBelow.has(place.id) ? "below" : undefined}
                  className="spot"
                  style={boxStyle(place.box)}
                  onPointerEnter={() => hover(place.id)}
                  onClick={go(place.id)}
                >
                  <span className="spot-light" aria-hidden="true" />
                  <span className="spot-label">
                    <span className="spot-place">{place.name}</span>
                    <span className="spot-section">{place.section}</span>
                  </span>
                </Link>
              ))}

              <Link href="/map" className="spot spot-board" style={boxStyle(noticeBoard.box)} onClick={go("map")}>
                <span className="spot-light" aria-hidden="true" />
                <span className="spot-label">
                  <span className="spot-place">The notice board</span>
                  <span className="spot-section">Map of the park</span>
                </span>
              </Link>

              {discoveries.map((discovery) => (
                <button
                  key={discovery.id}
                  type="button"
                  className="spot spot-small"
                  data-label={discovery.label}
                  aria-expanded={note?.id === discovery.id}
                  aria-controls="park-note"
                  style={boxStyle(discovery.box)}
                  onClick={() => look(discovery)}
                >
                  <span className="spot-light" aria-hidden="true" />
                  <span className="spot-label">
                    <span className="spot-place">{discovery.name}</span>
                    <span className="spot-section">Look closer</span>
                  </span>
                </button>
              ))}
            </div>

            {/* In the booth: the receiver lifts */}
            <button
              type="button"
              className="spot spot-receiver"
              hidden={scene !== "booth"}
              aria-pressed={receiverUp}
              style={boxStyle(receiver)}
              onClick={() => liftReceiver(!receiverUp)}
            >
              <span className="sr-only">{receiverUp ? "Hang up the phone" : "Pick up the phone"}</span>
            </button>

            <p id="park-note" role="status" className="park-note-anchor" style={note ? boxStyle(note.box) : undefined}>
              {note && (
                <span className="park-note" data-label={note.label}>
                  <span className="park-note-name">{note.name}</span>
                  {note.note}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="world-shade" aria-hidden="true" />
      </div>
      {/* Phones: the painting is wider than the screen */}
      <p className="pan-hint" data-gone={panned || undefined} aria-hidden="true">
        <span>←</span> Swipe to look around <span>→</span>
      </p>
    </div>
  );
}
