"use client";

import { useEffect, useRef, useState } from "react";

export type NotebookPage = { id: string; content: React.ReactNode };

const TURN_MS = 560;

// The notebook in the pavilion: open on the bench, two pages at a time on
// wide screens and one on phones. Turning a page sweeps a leaf across the
// spread; the words underneath change halfway through, so it's quick, and
// every page is one press (or arrow key) away. "All the pages" lays them
// out in one column for anyone who'd rather just read.
export default function Notebook({ pages }: { pages: NotebookPage[] }) {
  const [page, setPage] = useState(0); // the first page showing
  const [wide, setWide] = useState(false);
  const [all, setAll] = useState(false);
  const leaf = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = matchMedia("(min-width: 900px) and (orientation: landscape)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const step = wide ? 2 : 1;
  const first = page - (page % step);
  const last = pages.length - 1;
  const canBack = first > 0;
  const canOn = first + step <= last;

  function turn(direction: 1 | -1) {
    const next = first + direction * step;
    if (next < 0 || next > last) return;
    const sweep = leaf.current;
    if (!sweep || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPage(next);
      return;
    }
    // Forward: a leaf lifts off the right page and lies down on the left.
    // Back: the other way round.
    sweep.dataset.dir = direction > 0 ? "on" : "back";
    sweep.getAnimations().forEach((animation) => animation.cancel());
    sweep.animate(
      [
        { transform: "rotateY(0deg)", opacity: 1 },
        { transform: `rotateY(${direction > 0 ? -180 : 180}deg)`, opacity: 1 },
      ],
      { duration: TURN_MS, easing: "cubic-bezier(0.45, 0.05, 0.3, 1)" },
    );
    window.setTimeout(() => setPage(next), TURN_MS * 0.45);
  }

  function onKey(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") turn(1);
    if (event.key === "ArrowLeft") turn(-1);
  }

  if (all) {
    return (
      <div className="take-clicks">
        <div className="notebook-sheet">
          {pages.map((item) => (
            <div key={item.id} className="notebook-page-body">
              {item.content}
            </div>
          ))}
        </div>
        <button type="button" className="text-link mt-4 text-sm font-medium" onClick={() => setAll(false)}>
          Back to the notebook
        </button>
      </div>
    );
  }

  const showing = pages.slice(first, first + step);

  return (
    <div className="take-clicks" onKeyDown={onKey}>
      <div className="notebook" data-wide={wide || undefined}>
        {showing.map((item, i) => (
          <section
            key={item.id}
            className="notebook-page"
            data-side={wide ? (i === 0 ? "left" : "right") : "single"}
            aria-label={`Page ${first + i + 1} of ${pages.length}`}
          >
            <div className="notebook-page-body">{item.content}</div>
            <span className="notebook-folio" aria-hidden="true">
              {first + i + 1}
            </span>
          </section>
        ))}
        <div ref={leaf} className="notebook-leaf" aria-hidden="true" />
      </div>

      <div className="notebook-controls">
        <button type="button" onClick={() => turn(-1)} disabled={!canBack} className="notebook-turn">
          <span aria-hidden="true">←</span> Previous page
        </button>
        <span className="text-sm text-muted" aria-live="polite">
          {showing.length > 1 ? `Pages ${first + 1}–${first + showing.length}` : `Page ${first + 1}`} of {pages.length}
        </span>
        <button type="button" onClick={() => turn(1)} disabled={!canOn} className="notebook-turn">
          Next page <span aria-hidden="true">→</span>
        </button>
      </div>
      <button type="button" className="text-link mt-3 text-sm font-medium" onClick={() => setAll(true)}>
        Read all the pages at once
      </button>
    </div>
  );
}
