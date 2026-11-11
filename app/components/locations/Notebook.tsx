"use client";

import { useEffect, useRef, useState } from "react";
import { WORLD_QUERY } from "../world/flat";
import { useWorld, world } from "../world3d/store";

export type NotebookPage = { id: string; content: React.ReactNode };

const TURN_MS = 560;

// The notebook on the pavilion's desk. The one in the world
// (world3d/scenes/Library.tsx) turns its pages with this one. Here: two
// pages at a time where there's room for both, one otherwise. Turning a page sweeps a leaf across the
// spread; the words underneath change halfway through, so it's quick, and
// every page is one press (or arrow key) away. "All the pages" lays them
// out in one column for anyone who'd rather just read, and that sheet is
// all the flat layout shows: nothing to turn before reading.
export default function Notebook({ pages }: { pages: NotebookPage[] }) {
  const page = useWorld((s) => s.sel.page); // the first page showing
  const setPage = (n: number) => {
    world.select("page", n);
    world.set({ focus: "notebook" });
  };
  const [wide, setWide] = useState(false);
  const [all, setAll] = useState(false);
  const leaf = useRef<HTMLDivElement>(null);
  // A turn under way: the page it's turning to, and the timer that shows it
  const turning = useRef<{ next: number; timer: number } | null>(null);

  // Leaving the notebook mid-turn: the turn is dropped, so nothing changes
  // the world's focus after the visitor has gone somewhere else
  useEffect(
    () => () => {
      if (turning.current) window.clearTimeout(turning.current.timer);
      turning.current = null;
    },
    [],
  );

  useEffect(() => {
    const query = matchMedia(`${WORLD_QUERY} and (min-width: 1200px)`);
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
    // Pressed again before the last turn showed its page: that page comes
    // now, and this turn starts from it
    const pending = turning.current;
    if (pending) {
      window.clearTimeout(pending.timer);
      turning.current = null;
      setPage(pending.next);
    }
    const from = pending ? pending.next : first;
    const next = from + direction * step;
    if (next < 0 || next > last) return;
    const sweep = leaf.current;
    if (!sweep || world.get().still) {
      sweep?.getAnimations().forEach((animation) => animation.cancel());
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
    const timer = window.setTimeout(() => {
      turning.current = null;
      setPage(next);
    }, TURN_MS * 0.45);
    turning.current = { next, timer };
  }

  function onKey(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") turn(1);
    if (event.key === "ArrowLeft") turn(-1);
  }

  const sheet = (
    <div className="notebook-sheet">
      {pages.map((item) => (
        <div key={item.id} className="notebook-page-body">
          {item.content}
        </div>
      ))}
    </div>
  );

  if (all) {
    return (
      <div className="take-clicks">
        {sheet}
        <button type="button" className="text-link only-world mt-4 text-sm font-medium" onClick={() => setAll(false)}>
          Back to the notebook
        </button>
      </div>
    );
  }

  const showing = pages.slice(first, first + step);

  return (
    <>
      <div className="take-clicks only-flat">{sheet}</div>
      <div className="take-clicks only-world" onKeyDown={onKey}>
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
          {/* aria-disabled, not disabled: a disabled button drops the keyboard's
              focus, and with it the arrow keys, on reaching the last page */}
          <button type="button" onClick={() => turn(-1)} aria-disabled={!canBack} className="glass notebook-turn">
            <span aria-hidden="true">←</span> Previous page
          </button>
          <span className="text-sm text-muted" aria-live="polite">
            {showing.length > 1 ? `Pages ${first + 1}–${first + showing.length}` : `Page ${first + 1}`} of {pages.length}
          </span>
          <button type="button" onClick={() => turn(1)} aria-disabled={!canOn} className="glass notebook-turn">
            Next page <span aria-hidden="true">→</span>
          </button>
        </div>
        <button type="button" className="text-link mt-3 text-sm font-medium" onClick={() => setAll(true)}>
          Read all the pages at once
        </button>
      </div>
    </>
  );
}
