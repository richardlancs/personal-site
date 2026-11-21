"use client";

import type { SceneProps } from "../common";
import PlatePlace from "../PlatePlace";
import longtang from "./longtang.def";

// About: the old stone-gate lane, drawn as its paintings
// (app/assets/city/longtang-{day,night}.webp) on the plate
// (kit/plate.ts). Everything about it is data in longtang.def.ts: the
// corridor depth that lets the walls slide past the far skyline as the
// eye drifts and arrives, the sky and glass that move a little by day, the
// paving that darkens and holds the lanterns' light after rain, and the
// towers' slow red aircraft lights after dark. Nothing to choose here
// (About has no picker): its spots are anchors only, so no Hitboxes.
function AboutScene(props: SceneProps) {
  return <PlatePlace {...props} id="longtang" def={longtang} />;
}

export default AboutScene;
