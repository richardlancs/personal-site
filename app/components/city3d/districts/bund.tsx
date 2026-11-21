"use client";

import { useContext, useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useDisposeOnUnmount, type SceneProps } from "../common";
import { merge } from "../kit/geometry";
import { clockMaterial } from "../kit/neon";
import { spotGeometry } from "../kit/plate";
import { setClockHour } from "../kit/textures";
import PlatePlace, { PlateContext } from "../PlatePlace";
import { useWorld, world } from "../store";
import bund from "./bund.def";

// Contact, the promenade along the river: its two paintings on the plate
// (bund.def.ts holds everything read off them; kit/plate.ts draws them,
// the light, the river and the wet paving living, the ferries and the far
// bank's traffic as movers). The one thing drawn over the painting is the
// clock tower's clock, on its spots: the kit's clock face (textures.ts:
// clockFace) telling Richmond Hill's time (the store's hour), its hands
// moved when the minute changes. Nothing here is clickable.

function Clock() {
  const ctx = useContext(PlateContext);
  const invalidate = useThree((s) => s.invalidate);
  const built = useMemo(() => {
    if (!ctx) return null;
    const { def, plate } = ctx;
    const faces = [spotGeometry(def, plate.frame, def.plate.spots.clock, 4), spotGeometry(def, plate.frame, def.plate.spots["clock-side"], 4)];
    const geometry = merge(faces);
    faces.forEach((g) => g.dispose());
    const material = clockMaterial(world.get().hour);
    // (the face is a disc on a clear square)
    material.transparent = true;
    material.depthWrite = false;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "bund-clock";
    mesh.renderOrder = 1;
    return { mesh, dispose: () => geometry.dispose() };
  }, [ctx]);
  useDisposeOnUnmount(built ?? NOTHING);
  const hour = useWorld((s) => s.hour);
  useEffect(() => {
    if (setClockHour(hour)) invalidate();
  }, [hour, built, invalidate]);
  return built ? <primitive object={built.mesh} /> : null;
}
const NOTHING = { dispose() {} };

function ContactScene(props: SceneProps) {
  return (
    <PlatePlace {...props} id="bund" def={bund}>
      <Clock />
    </PlatePlace>
  );
}

export default ContactScene;
