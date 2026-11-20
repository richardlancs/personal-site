"use client";

import { useEffect } from "react";
import { watchArrivals } from "./arrive";

// The page's one-time arrival (arrive.ts), started from inside the page it
// watches: rendered last in the page, so its effect runs only once that
// page's HTML has been hydrated, and arrive.ts never touches an element
// React hasn't taken over yet. A route the router shows again (Back) runs
// it again; its cleanup lets everything still waiting show.
export default function Arrivals() {
  useEffect(() => watchArrivals(), []);
  return null;
}
