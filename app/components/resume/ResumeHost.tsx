"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";

// The résumé viewer, mounted once for the whole site (layout.tsx). Every
// résumé link (ResumeLink.tsx) is a real link to the PDF; a plain click on
// one opens the viewer over the page instead, while a middle click, a
// modified click (new tab, new window, download) or a page without
// JavaScript still gets the file itself.
//
// The viewer and pdf.js are downloaded only when the résumé is first
// opened (the viewer's own small chunk a moment earlier, when the pointer
// or the keyboard reaches a résumé link). Nothing of them is in the page.
// While the viewer's chunk is on its way the link says so (data-opening,
// globals.css). If it can't be fetched (offline, blocked, or a new deploy
// replaced it), the link does what it would without JavaScript: the PDF.
type Viewer = ComponentType<{ open: boolean; src: string; onClosed: () => void }>;
let loading: Promise<Viewer> | null = null;
const load = () =>
  (loading ??= import("./ResumeViewer").then(
    (m) => m.default,
    (error) => {
      loading = null; // a failed fetch can be tried again
      throw error;
    },
  ));

const TRIGGER = "a[data-resume]";

export default function ResumeHost() {
  const [Viewer, setViewer] = useState<Viewer | null>(null);
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const linkFrom = (event: Event) => (event.target instanceof Element ? event.target.closest<HTMLAnchorElement>(TRIGGER) : null);
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = linkFrom(event);
      if (!link) return;
      event.preventDefault();
      if (link.dataset.opening !== undefined) return;
      const href = link.getAttribute("href")!;
      trigger.current = link;
      link.dataset.opening = "";
      link.setAttribute("aria-busy", "true");
      load().then(
        (component) => {
          setViewer(() => component);
          setSrc(href);
          setOpen(true);
        },
        () => window.location.assign(href),
      ).finally(() => {
        delete link.dataset.opening;
        link.removeAttribute("aria-busy");
      });
    };
    const warm = (event: Event) => {
      if (linkFrom(event)) load().catch(() => {});
    };
    document.addEventListener("click", onClick);
    document.addEventListener("pointerover", warm, { passive: true });
    document.addEventListener("focusin", warm);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("pointerover", warm);
      document.removeEventListener("focusin", warm);
    };
  }, []);

  // Going to another page (the browser's Back button) closes it
  const [shownAt, setShownAt] = useState(pathname);
  if (pathname !== shownAt) {
    setShownAt(pathname);
    if (open) setOpen(false);
  }

  // Back to the very link that opened it, without moving the page
  const onClosed = useCallback(() => {
    setOpen(false);
    const link = trigger.current;
    if (link?.isConnected) link.focus({ preventScroll: true });
  }, []);

  if (!Viewer || !src) return null;
  return <Viewer open={open} src={src} onClosed={onClosed} />;
}
