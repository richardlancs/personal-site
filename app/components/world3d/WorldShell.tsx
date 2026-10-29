"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { Component, useSyncExternalStore, type ReactNode } from "react";
import painting from "../../assets/park/park-v04.png";

// The 3D world loads after the page, so the words are there first. If the
// browser can't draw it (no WebGL, or the renderer fails), the painting
// of the park stands in, and every page still works.
const World3D = dynamic(() => import("./World3D"), {
  ssr: false,
  loading: () => <div className="world3d world3d-loading" aria-hidden="true" />,
});

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
const noop = () => () => {};

export default function WorldShell() {
  // Assume yes while rendering on the server; check in the browser
  const ok = useSyncExternalStore(noop, webgl, () => true);
  if (!ok) return <Fallback />;
  return (
    <Guard>
      <World3D />
    </Guard>
  );
}
