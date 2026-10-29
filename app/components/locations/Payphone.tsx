"use client";

import { useEffect, useState } from "react";
import { setReceiver } from "../world/useAmbience";

export type Line = { label: string; value: string; href: string; copy?: boolean };

// The phone booth: the directory card pinned inside, with every way to get
// in touch as a plain link, and the phone itself. Picking up the receiver
// (here, or on the painted phone) lifts it in the painting and opens the
// line; nothing waits on it.
export default function Payphone({ lines }: { lines: Line[] }) {
  const [up, setUp] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Stay in step with the painted receiver
  useEffect(() => {
    const onReceiver = (event: Event) => setUp((event as CustomEvent<boolean>).detail);
    window.addEventListener("world:receiver", onReceiver);
    return () => {
      window.removeEventListener("world:receiver", onReceiver);
    };
  }, []);

  // Hang up when leaving the booth
  useEffect(() => () => setReceiver(false), []);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      window.setTimeout(() => setCopied((current) => (current === value ? null : current)), 2000);
    } catch {
      // Clipboard blocked: the address is still there to select
    }
  }

  return (
    <div className="take-clicks">
      <div className="phone-line" data-up={up || undefined}>
        <button type="button" className="phone-handset hover-grow" aria-pressed={up} onClick={() => setReceiver(!up)}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
          </svg>
          {up ? "Hang up" : "Pick up the phone"}
        </button>
        <p className="phone-status" aria-live="polite">
          {up ? "A dial tone. The line still works. Email is the quickest way through." : "Lift the receiver, or use the card below."}
        </p>
      </div>

      <div className="directory">
        <p className="directory-head">
          <span className="font-display text-xl font-semibold">Directory</span>
          <span className="text-sm text-muted">Richard Lan</span>
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          I&apos;m looking for software engineering internship and co-op roles. Email is the best way to reach me.
        </p>
        <ol className="directory-lines">
          {lines.map((line, index) => (
            <li key={line.label} data-first={index === 0 || undefined}>
              <span className="directory-dial" aria-hidden="true">
                {index + 1}
              </span>
              <span className="directory-label">{line.label}</span>
              <span className="directory-value">
                <a
                  href={line.href}
                  // Email links open the mail app; web links open in a new tab
                  target={line.href.startsWith("mailto:") ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  className="text-link break-all"
                >
                  {line.value}
                </a>
                {line.copy && (
                  <button type="button" className="directory-copy" onClick={() => copy(line.value)}>
                    {copied === line.value ? "Copied" : "Copy"}
                    <span className="sr-only"> {line.value}</span>
                  </button>
                )}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
