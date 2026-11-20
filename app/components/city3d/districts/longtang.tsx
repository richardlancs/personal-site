"use client";

import { standIn } from "./placeholder";

// About's place: for now the grey stand-in (placeholder.tsx) in its own
// colour. Its own scene replaces this file (and only this file): a default
// export taking SceneProps (common.tsx), its poses in ./longtang.def.ts.
const AboutScene = standIn("longtang");

export default AboutScene;
