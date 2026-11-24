"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ComponentType, type CSSProperties, type RefObject } from "react";

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
// city.css). If it can't be fetched (offline, blocked, or a new deploy
// replaced it), the visitor stays on the page: a short note says so, with
// Retry (M10). Leaving for the PDF there would only land on the browser's
// own offline page.
type Viewer = ComponentType<{ open: boolean; src: string; onClosed: () => void; from: RefObject<HTMLElement | null> }>;
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

// The note when the viewer can't be fetched: over the foot of the screen
// (clear of the metro map), the visitor still on the page
const FAIL_STYLE: CSSProperties = {
  position: "fixed",
  zIndex: 41,
  inset: "auto 1rem var(--foot, max(1rem, env(safe-area-inset-bottom)))",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "0.5rem 1rem",
  width: "fit-content",
  margin: "auto",
  padding: "0.5rem 0.5rem 0.5rem 1rem",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-lg)",
  background: "var(--panel)",
};

export default function ResumeHost() {
  const [Viewer, setViewer] = useState<Viewer | null>(null);
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
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
      setFailed(false);
      load().then(
        (component) => {
          setViewer(() => component);
          setSrc(href);
          setOpen(true);
        },
        () => setFailed(true),
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

  // Retry: the same link again (the click above), focus back on it so the
  // keyboard isn't left on a note that goes
  const retry = () => {
    const link = trigger.current;
    setFailed(false);
    if (!link?.isConnected) return;
    link.focus({ preventScroll: true });
    link.click();
  };

  if (failed)
    return (
      // (styled here, not in city.css: a rare note, and the page's CSS is
      // at its budget)
      <p role="alert" className="resume-fail" style={FAIL_STYLE}>
        Couldn&apos;t load the résumé. Check your connection.
        <button type="button" className="glass" onClick={retry}>
          Retry
        </button>
        <button
          type="button"
          className="glass"
          onClick={() => {
            setFailed(false);
            trigger.current?.focus({ preventScroll: true });
          }}
        >
          Dismiss
        </button>
      </p>
    );
  if (!Viewer || !src) return null;
  // It opens out of the link that opened it (ResumeViewer, --resume-from)
  return <Viewer open={open} src={src} onClosed={onClosed} from={trigger} />;
}
