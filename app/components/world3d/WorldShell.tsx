"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { Component, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import painting from "../../assets/park/park-v04.png";
import { isFlat } from "../world/flat";
import { onIdle } from "./idle";

// The 3D world loads after the page, so the words are there first, on
// every screen: phones get the same park, at the mobile tier
// (World3D.tsx). Where it can't be drawn (no WebGL, or the renderer
// fails), the painting of the park stands in, and every page still works.
const World3D = dynamic(() => import("./World3D"), {
  ssr: false,
  loading: () => <Loading />,
});

// While the world loads, the painting's own blur placeholder (a few
// hundred bytes, already in the page) stands in, so the first view is
// the park's colours and not a blank, and nothing is downloaded for it;
// then the world fades in over it. Where the world can't be drawn, the
// painting itself stays.
function Loading() {
  return <div className="world3d world3d-loading" aria-hidden="true" style={{ backgroundImage: `url(${painting.blurDataURL})` }} />;
}

function Fallback() {
  return (
    <div className="world3d world3d-fallback" aria-hidden="true">
      <Image src={painting} alt="" fill sizes="100vw" placeholder="blur" />
    </div>
  );
}

class Guard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <Fallback /> : this.props.children;
  }
}

let supported: boolean | undefined;
function webgl() {
  if (supported === undefined) {
    try {
      const c = document.createElement("canvas");
      supported = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      supported = false;
    }
  }
  return supported;
}

// Whether this screen can draw the world. Unknown on the server and while
// the page is waking up: until then the painting's placeholder is shown.
type Layout = "unknown" | "world" | "painting";
const layout = (): Layout => (webgl() ? "world" : "painting");
const unknown = (): Layout => "unknown";
const never = () => () => {};

export default function WorldShell() {
  const kind = useSyncExternalStore(never, layout, unknown);
  // On narrow screens the page's sheet is painted first and the world
  // follows when the browser has a moment: building a scene is the
  // heaviest work the page does, and on a phone it must not hold up the
  // words. Wide screens start the world straight away.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!isFlat()) {
      setReady(true);
      return;
    }
    return onIdle(() => setReady(true), 1200);
  }, []);
  if (kind === "unknown" || !ready) return <Loading />;
  if (kind === "painting") return <Fallback />;
  return (
    <Guard>
      <World3D />
    </Guard>
  );
}
