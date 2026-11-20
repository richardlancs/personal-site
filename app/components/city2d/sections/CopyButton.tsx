"use client";

import { useEffect, useRef, useState } from "react";

// One address's Copy key and what it last did. The status line is always in
// the page and drawn on screen (not screen-reader-only), so the result is
// both seen and read out. "Copied" clears after 2.5 seconds; a failure,
// which asks the visitor to do something, stays until the next press.
// `data-copied` puts the key in the glass "chosen" state while "Copied"
// shows in the status line, with a tick on the key that draws itself
// (motion.css): one signal set, the word said once. A failure shakes the
// key once (data-shake, set afresh on each failed press so a second failure
// shakes again), only where motion is welcome, so a shake never waits in
// still view to start when it's turned off.
export default function CopyButton({ value }: { value: string }) {
  const [status, setStatus] = useState<{ text: string; failed?: boolean } | null>(null);
  const reset = useRef<number | undefined>(undefined);
  const key = useRef<HTMLButtonElement>(null);

  // Leaving the page before then cancels the reset
  useEffect(() => () => window.clearTimeout(reset.current), []);

  async function copy() {
    window.clearTimeout(reset.current);
    try {
      // Missing outside a secure context or in old browsers: treat as a failure
      if (!navigator.clipboard?.writeText) throw new Error("No clipboard");
      await navigator.clipboard.writeText(value);
      setStatus({ text: "Copied" });
      reset.current = window.setTimeout(() => setStatus(null), 2500);
    } catch {
      // Clipboard blocked: say so, and keep saying it; the address is
      // still there to select
      setStatus({ text: "Couldn't copy. Select the address to copy it by hand.", failed: true });
      const el = key.current;
      if (el && matchMedia("(prefers-reduced-motion: no-preference)").matches && document.documentElement.dataset.still !== "on") {
        el.removeAttribute("data-shake");
        void el.offsetWidth; // restart the shake
        el.setAttribute("data-shake", "");
      }
    }
  }

  const copied = status !== null && !status.failed;

  return (
    <div className="contact-copy flex flex-wrap items-center gap-x-4 gap-y-2">
      <button
        ref={key}
        type="button"
        className="glass"
        data-copied={copied || undefined}
        onClick={copy}
        onAnimationEnd={(e) => e.animationName === "copy-shake" && e.currentTarget.removeAttribute("data-shake")}
      >
        {copied && (
          <svg className="copy-tick" aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        )}
        Copy
        <span className="sr-only"> {value}</span>
      </button>
      <p
        role="status"
        aria-live="polite"
        className="contact-status min-h-[1.5em] text-base text-muted"
        data-failed={status?.failed || undefined}
      >
        {status?.text}
      </p>
    </div>
  );
}
