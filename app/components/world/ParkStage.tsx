"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { places } from "../../data/world";

const TRAVEL_MS = 520; // keep in sync with .park-stage in globals.css

// Links from the old one-page site, e.g. /#projects
const oldAnchors: Record<string, string> = {
  about: "/about",
  projects: "/projects",
  skills: "/projects#skills",
  experience: "/experience",
  interests: "/interests",
  contact: "/contact",
};

// The interactive part of the park (Park.tsx):
// - choosing a painted place walks toward it (a short zoom), then opens
//   its page; with reduced motion it opens straight away
// - anything marked data-open-map opens the notice board's map
// - "Show places" reveals every name tag
export default function ParkStage({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const ref = useRef<HTMLElement>(null);
  const timer = useRef(0);

  useEffect(() => {
    const target = oldAnchors[window.location.hash.slice(1)];
    if (target) {
      router.replace(target);
      return;
    }
    for (const place of places) router.prefetch(place.href);
    return () => window.clearTimeout(timer.current);
  }, [router]);

  function onClick(event: React.MouseEvent) {
    const park = ref.current!;
    const target = event.target as Element;

    if (target.closest("[data-open-map]")) {
      park.querySelector<HTMLDialogElement>("#park-map")?.showModal();
      return;
    }

    const toggle = target.closest<HTMLButtonElement>("[data-show-places]");
    if (toggle) {
      const on = park.classList.toggle("show-labels");
      toggle.setAttribute("aria-pressed", String(on));
      toggle.textContent = on ? "Hide places" : "Show places";
      return;
    }

    // A click on the map's backdrop closes it
    if (target instanceof HTMLDialogElement) {
      target.close();
      return;
    }

    const link = target.closest<HTMLAnchorElement>("a[data-place]");
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const href = link.getAttribute("href")!;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(href);
      return;
    }

    // Walk toward the place: zoom in around its centre
    const stage = park.querySelector<HTMLElement>(".park-stage")!;
    const box = stage.getBoundingClientRect();
    const spot = link.getBoundingClientRect();
    stage.style.setProperty("--ox", `${spot.left + spot.width / 2 - box.left}px`);
    stage.style.setProperty("--oy", `${spot.top + spot.height / 2 - box.top}px`);
    park.classList.add("is-traveling");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => router.push(href), TRAVEL_MS);
  }

  return (
    // Clicks are handled for the whole park in one place; every control
    // inside is a real link or button, so keyboard and touch work as usual
    <section ref={ref} aria-label="The park" className="park" onClick={onClick}>
      {children}
    </section>
  );
}
