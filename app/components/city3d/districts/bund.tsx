"use client";

import { standIn } from "./placeholder";

// Contact's place: for now the grey stand-in (placeholder.tsx) in its own
// colour. Its own scene replaces this file (and only this file): a default
// export taking SceneProps (common.tsx), its poses in ./bund.def.ts.
const ContactScene = standIn("bund");

export default ContactScene;
