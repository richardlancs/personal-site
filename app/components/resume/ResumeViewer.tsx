"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { world } from "../world3d/store";
import { loadResume, ResumeError, type Resume } from "./pdf";
import ResumePage from "./ResumePage";
import "./resume.css";

// The résumé, read in the page: a modal dialog over whatever the visitor
// was looking at, which stays exactly where it was underneath. Loaded on
// the first opening (ResumeHost.tsx); pdf.js comes with it (pdf.ts).

// Zoom is a fraction of the page's real size (100% = the paper at 96 px
// to the inch). "Fit width" follows the dialog as it resizes.
const CSS_UNITS = 96 / 72;
const STEPS = [0.25, 0.33, 0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];
const MIN = STEPS[0];
const MAX = STEPS[STEPS.length - 1];

type Status = { kind: "loading" } | { kind: "ready"; resume: Resume } | { kind: "error"; error: ResumeError };

type Props = {
  open: boolean;
  src: string;
  onClosed: () => void;
};

export default function ResumeViewer({ open, src, onClosed }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const doc = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [fit, setFit] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(0); // the document area's inner width
  const [pageNo, setPageNo] = useState(1);

  // The file and the reader, on the first opening and on each Retry
  useEffect(() => {
    let live = true;
    loadResume(src, attempt > 0).then(
      (resume) => live && setStatus({ kind: "ready", resume }),
      (error) => live && setStatus({ kind: "error", error: error instanceof ResumeError ? error : new ResumeError("file", String(error)) }),
    );
    return () => {
      live = false;
    };
  }, [src, attempt]);

  // How wide the document area is, for "Fit width": on opening, on a
  // resize, and when a phone turns
  useLayoutEffect(() => {
    const el = doc.current;
    if (!el) return;
    const measure = () => {
      const style = getComputedStyle(el);
      setWidth(el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const first = status.kind === "ready" ? status.resume.pages[0] : null;
  const pageWidth = first ? first.getViewport({ scale: 1 }).width * CSS_UNITS : 816;
  const fitZoom = width > 0 ? Math.min(MAX, Math.max(MIN, width / pageWidth)) : 1;
  const current = fit ? fitZoom : zoom;
  const pages = status.kind === "ready" ? status.resume.pages.length : 0;

  // A zoom from the buttons keeps the middle of the view where it was
  // (the first fit, and fits that follow a resize, leave it be)
  const lastZoom = useRef(current);
  const anchor = useRef(false);
  useLayoutEffect(() => {
    const el = doc.current;
    const before = lastZoom.current;
    lastZoom.current = current;
    if (!el || before === current || !anchor.current) return;
    anchor.current = false;
    const k = current / before;
    el.scrollTop = (el.scrollTop + el.clientHeight / 2) * k - el.clientHeight / 2;
    el.scrollLeft = (el.scrollLeft + el.clientWidth / 2) * k - el.clientWidth / 2;
  }, [current]);

  const zoomTo = (next: number) => {
    anchor.current = true;
    setFit(false);
    setZoom(Math.min(MAX, Math.max(MIN, next)));
  };
  const zoomIn = () => zoomTo(STEPS.find((s) => s > current + 0.001) ?? MAX);
  const zoomOut = () => zoomTo([...STEPS].reverse().find((s) => s < current - 0.001) ?? MIN);

  const retry = useCallback(() => {
    // Retry is about to disappear: keep the keyboard in the dialog
    doc.current?.focus({ preventScroll: true });
    setStatus({ kind: "loading" });
    setAttempt((a) => a + 1);
  }, []);

  // ---- Opening and closing ----

  // Each opening starts at "Fit width"; opening again after a failure is
  // a fresh try
  const [shown, setShown] = useState(open);
  if (open !== shown) {
    setShown(open);
    if (open) {
      setFit(true);
      if (status.kind === "error") {
        setStatus({ kind: "loading" });
        setAttempt((a) => a + 1);
      }
    }
  }

  const closing = useRef(false);
  const requestClose = useCallback(() => {
    const el = dialog.current;
    if (!el?.open || closing.current) return;
    closing.current = true;
    // A short fade out (none in still view or with reduced motion: the
    // animation is then 1 ms), then the dialog really closes
    el.setAttribute("data-closing", "");
    let done = false;
    const onEnd = (event: AnimationEvent) => {
      if (event.target === el && !event.pseudoElement) finish();
    };
    const finish = () => {
      if (done) return;
      done = true;
      el.removeEventListener("animationend", onEnd);
      el.close();
    };
    el.addEventListener("animationend", onEnd);
    window.setTimeout(finish, 250);
  }, []);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      closing.current = false;
      el.removeAttribute("data-closing");
      lockScroll();
      world.set({ covered: true });
      el.showModal();
      // Into the document itself, so the arrow keys and Page Down scroll it
      doc.current?.scrollTo(0, 0);
      doc.current?.focus({ preventScroll: true });
    } else if (!open && el.open) {
      requestClose();
    }
  }, [open, requestClose]);

  // However it closed (Close, Escape, the backdrop, a phone's back
  // gesture): put the page back as it was
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const onClose = () => {
      el.removeAttribute("data-closing");
      unlockScroll();
      world.set({ covered: false });
      onClosed();
    };
    // Escape closes the viewer and nothing else: the site's own Escape
    // ("back to the park", WorldControls.tsx) mustn't also see it
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        requestClose();
      } else if (event.key === "Tab") {
        wrapFocus(el, event);
      }
    };
    const onCancel = (event: Event) => {
      event.preventDefault();
      requestClose();
    };
    // A click on the dimmed page around the dialog closes it, but not the
    // end of a drag that started inside (selecting text, say)
    let downOutside = false;
    const outside = (event: MouseEvent) => {
      if (event.target !== el) return false;
      const r = el.getBoundingClientRect();
      return event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom;
    };
    const onDown = (event: PointerEvent) => (downOutside = outside(event));
    const onClick = (event: MouseEvent) => {
      if (downOutside && outside(event)) requestClose();
      downOutside = false;
    };
    el.addEventListener("close", onClose);
    el.addEventListener("keydown", onKey);
    el.addEventListener("cancel", onCancel);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("click", onClick);
    return () => {
      el.removeEventListener("close", onClose);
      el.removeEventListener("keydown", onKey);
      el.removeEventListener("cancel", onCancel);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("click", onClick);
    };
  }, [onClosed, requestClose]);

  // If the viewer goes away while open (it shouldn't), leave nothing locked
  useEffect(
    () => () => {
      unlockScroll();
      world.set({ covered: false });
    },
    [],
  );

  // ---- Pages ----

  // Which page is in view, for "Page n of N"
  const onScroll = () => {
    const el = doc.current;
    if (!el || pages < 2) return;
    const middle = el.scrollTop + el.clientHeight / 2;
    const all = [...el.querySelectorAll<HTMLElement>(".resume-page")];
    const index = all.findIndex((p) => p.offsetTop + p.offsetHeight > middle);
    setPageNo((index < 0 ? all.length - 1 : index) + 1);
  };
  const goTo = (n: number) => {
    const el = doc.current;
    const target = el?.querySelectorAll<HTMLElement>(".resume-page")[n - 1];
    if (!el || !target) return;
    // Within the document only (scrollIntoView would move the page too)
    el.scrollTo({ top: target.offsetTop - parseFloat(getComputedStyle(el).paddingTop), behavior: "instant" });
    setPageNo(n);
  };

  const percent = `${Math.round(current * 100)}%`;
  const download = (
    <a href={src} download="richard-lan-resume.pdf" className="glass glass-primary resume-download">
      <DownloadIcon />
      Download PDF
    </a>
  );

  return (
    <dialog ref={dialog} className="resume" aria-labelledby="resume-title">
      <div className="resume-bar">
        <h2 id="resume-title" className="resume-title font-display">
          Résumé
        </h2>

        <div className="resume-tools">
          <div role="group" aria-label="Zoom" className="resume-zoom">
            <button
              type="button"
              className="glass resume-icon"
              aria-label="Zoom out"
              title="Zoom out"
              aria-disabled={status.kind !== "ready" || current <= MIN + 0.001 || undefined}
              onClick={() => status.kind === "ready" && current > MIN + 0.001 && zoomOut()}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                <path d="M6 12h12" />
              </svg>
            </button>
            <output className="resume-percent" aria-live="polite">
              <span className="sr-only">Zoom </span>
              {percent}
            </output>
            <button
              type="button"
              className="glass resume-icon"
              aria-label="Zoom in"
              title="Zoom in"
              aria-disabled={status.kind !== "ready" || current >= MAX - 0.001 || undefined}
              onClick={() => status.kind === "ready" && current < MAX - 0.001 && zoomIn()}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                <path d="M6 12h12M12 6v12" />
              </svg>
            </button>
          </div>
          <button
            type="button"
            className="glass resume-fit"
            aria-pressed={fit}
            aria-disabled={status.kind !== "ready" || undefined}
            onClick={() => {
              if (status.kind !== "ready" || fit) return;
              anchor.current = true;
              setFit(true);
            }}
          >
            {/* Two arrows apart; a tick beside them while it's on, so the
                state isn't carried by colour alone */}
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
              <path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4" />
            </svg>
            Fit width
            {fit && (
              <svg className="resume-tick" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            )}
          </button>

          {pages > 1 && (
            <div role="group" aria-label="Pages" className="resume-pager">
              <button
                type="button"
                className="glass resume-icon"
                aria-label="Previous page"
                title="Previous page"
                aria-disabled={pageNo <= 1 || undefined}
                onClick={() => pageNo > 1 && goTo(pageNo - 1)}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                  <path d="M14.5 5.5 8 12l6.5 6.5" />
                </svg>
              </button>
              <span className="resume-pageno">
                Page {pageNo} of {pages}
              </span>
              <button
                type="button"
                className="glass resume-icon"
                aria-label="Next page"
                title="Next page"
                aria-disabled={pageNo >= pages || undefined}
                onClick={() => pageNo < pages && goTo(pageNo + 1)}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                  <path d="M9.5 5.5 16 12l-6.5 6.5" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <div className="resume-end">
          {download}
          <button type="button" className="glass resume-close" onClick={requestClose}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
            Close<span className="sr-only"> the résumé</span>
          </button>
        </div>
      </div>

      <div
        ref={doc}
        className="resume-doc"
        tabIndex={0}
        role="region"
        aria-label={pages > 1 ? `Résumé, page ${pageNo} of ${pages}` : "Résumé document"}
        aria-busy={status.kind === "loading"}
        onScroll={onScroll}
      >
        <div className="resume-pages">
          {status.kind === "ready" &&
            status.resume.pages.map((page, i) => (
              <ResumePage
                key={i}
                pdfjs={status.resume.pdfjs}
                page={page}
                links={status.resume.links[i]}
                scale={current * CSS_UNITS}
                label={`Page ${i + 1} of ${pages}`}
              />
            ))}

          {status.kind === "loading" && (
            // The shape of the page to come, at the width it will have
            <div className="resume-page resume-placeholder" style={{ width: width || undefined }}>
              <p role="status">Opening the résumé…</p>
            </div>
          )}

          {status.kind === "error" && (
            <div role="alert" className="resume-error">
              <h3 className="font-display">The résumé didn&apos;t open here</h3>
              <p>{status.error.message}</p>
              <p>Try again, or download the PDF and open it in your own reader.</p>
              <div className="resume-error-actions">
                <button type="button" className="glass" onClick={retry}>
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                    <path d="M19 12a7 7 0 1 1-2.05-4.95M19 4.5V9h-4.5" />
                  </svg>
                  Retry
                </button>
                {download}
              </div>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}

// Tab and Shift+Tab go round the dialog's controls instead of leaving it
// for the browser's own (the page behind is inert already)
function wrapFocus(dialog: HTMLDialogElement, event: KeyboardEvent) {
  const items = [...dialog.querySelectorAll<HTMLElement>('a[href], button, [tabindex]:not([tabindex="-1"])')].filter(
    (el) => el.getClientRects().length > 0,
  );
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !dialog.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}

// The page behind holds still while the dialog is open, at the place it
// was scrolled to (the document itself scrolls on both layouts). Where a
// scrollbar shows, its space is kept, so nothing shifts sideways.
function lockScroll() {
  const root = document.documentElement;
  if (window.innerWidth > root.clientWidth) root.classList.add("resume-gutter");
  root.classList.add("resume-lock");
}

function unlockScroll() {
  document.documentElement.classList.remove("resume-lock", "resume-gutter");
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14" />
    </svg>
  );
}
