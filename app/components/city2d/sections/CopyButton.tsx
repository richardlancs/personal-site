"use client";

import { useEffect, useRef, useState } from "react";

// One address's Copy key and what it last did. The status line is always in
// the page and drawn on screen (not screen-reader-only), so the result is
// both seen and read out; it clears after two seconds. `data-copied` puts
// the key in the glass "chosen" state while "Copied" shows.
export default function CopyButton({ value }: { value: string }) {
  const [status, setStatus] = useState<{ text: string; failed?: boolean } | null>(null);
  const reset = useRef<number | undefined>(undefined);

  // Leaving the page within the two seconds cancels the reset
  useEffect(() => () => window.clearTimeout(reset.current), []);

  async function copy() {
    window.clearTimeout(reset.current);
    try {
      // Missing outside a secure context or in old browsers: treat as a failure
      if (!navigator.clipboard?.writeText) throw new Error("No clipboard");
      await navigator.clipboard.writeText(value);
      setStatus({ text: "Copied" });
    } catch {
      // Clipboard blocked: say so; the address is still there to select
      setStatus({ text: "Couldn't copy. Select the address to copy it by hand.", failed: true });
    }
    reset.current = window.setTimeout(() => setStatus(null), 2500);
  }

  const copied = status !== null && !status.failed;

  return (
    <div className="contact-copy flex flex-wrap items-center gap-x-4 gap-y-2">
      <button type="button" className="glass" data-copied={copied || undefined} onClick={copy}>
        {copied ? "Copied" : "Copy"}
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
