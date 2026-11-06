"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { Component, useSyncExternalStore, type ReactNode } from "react";
import painting from "../../assets/park/park-v04.png";
import { isFlat, watchFlat } from "../world/flat";

// The 3D world loads after the page, so the words are there first, and
// only on wide screens: the flat layout (phones, portrait tablets) has the
// painting in each page instead (world/Plate.tsx) and never downloads the
// world or three.js. If a wide screen can't draw it (no WebGL, or the
// renderer fails), the painting of the park stands in, and every page
// still works.
const World3D = dynamic(() => import("./World3D"), {
  ssr: false,
  loading: () => <Loading />,
});

function Loading() {
  return <div className="world3d world3d-loading" aria-hidden="true" />;
}

function Fallback() {
  return (
    <div className="world3d world3d-fallback" aria-hidden="true">
      <Image src={painting} alt="" fill sizes="100vw" placeholder="blur" className="object-cover" />
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

// Which layout this screen gets. Unknown on the server and while the page
// is waking up: until then only the haze is drawn (and CSS hides that on
// flat screens).
type Layout = "unknown" | "flat" | "world" | "painting";
const layout = (): Layout => (isFlat() ? "flat" : webgl() ? "world" : "painting");
const unknown = (): Layout => "unknown";

export default function WorldShell() {
  const kind = useSyncExternalStore(watchFlat, layout, unknown);
  if (kind === "flat") return null;
  if (kind === "unknown") return <Loading />;
  if (kind === "painting") return <Fallback />;
  return (
    <Guard>
      <World3D />
    </Guard>
  );
}
