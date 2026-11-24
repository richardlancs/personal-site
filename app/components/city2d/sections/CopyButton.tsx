"use client";

import { useEffect, useRef, useState } from "react";

// One address's Copy key and what it last did. A copy is the journey's
// last moment, so it is a clear one: the key itself turns to "Copied",
// chosen (`data-copied`, the glass "chosen" state) with a tick that draws
// itself (motion.css), the address it copied is lit beside it (city.css,
// "Contact"), and the panel's edge lights (city-track.css); all return
// after 2 seconds. The status line is always in the page, a polite live
// region, so the result is also read out (a changing key label alone isn't
// reliably announced); it is drawn on screen for a failure, which asks the
// visitor to do something and stays until the next press, and only read
// out for a success, whose word is already on the key. A failure shakes the
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
      reset.current = window.setTimeout(() => setStatus(null), 2000);
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
        {copied ? "Copied" : "Copy"}
        <span className="sr-only"> {value}</span>
      </button>
      <p
        role="status"
        aria-live="polite"
        className={`contact-status min-h-[1.5em] text-base text-muted ${copied ? "sr-only" : ""}`}
        data-failed={status?.failed || undefined}
      >
        {status?.text}
      </p>
    </div>
  );
}
