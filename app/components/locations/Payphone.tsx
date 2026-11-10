"use client";

import { useState } from "react";
import { useWorld, world } from "../world3d/store";

export type Line = { label: string; value: string; href: string; copy?: boolean };

// The phone booth: the directory card pinned inside, with every way to get
// in touch as a plain link, and the phone itself. Picking up the receiver
// (here, or on the phone in the booth) lifts it off the hook in the world
// and steps up to it; nothing waits on it. The flat layout has no phone to
// lift, so the booth's plate is one button that starts an email.
export default function Payphone({ lines }: { lines: Line[] }) {
  const up = useWorld((s) => s.phoneUp);
  const [copied, setCopied] = useState<string | null>(null);
  const [status, setStatus] = useState(""); // read out by screen readers
  const setReceiver = (lift: boolean) => world.set({ phoneUp: lift, focus: "phone" });

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setStatus(`Copied ${value}`);
      window.setTimeout(() => setCopied((current) => (current === value ? null : current)), 2000);
    } catch {
      // Clipboard blocked: the address is still there to select
      setStatus(`Couldn't copy. Select ${value} to copy it.`);
    }
  }

  const email = lines.find((line) => line.href.startsWith("mailto:"));
  const newTab = <span className="sr-only"> (opens in a new tab)</span>;

  return (
    <div className="take-clicks">
      {email && (
        <div className="phone-line only-flat">
          <a href={email.href} className="phone-handset">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3.5 6.5h17v11h-17Z M3.5 7l8.5 6.5L20.5 7" />
            </svg>
            Write me an email
          </a>
          <p className="phone-status">The line still works. Email is the quickest way through.</p>
        </div>
      )}
      <div className="phone-line only-world" data-up={up || undefined}>
        <button type="button" className="phone-handset hover-grow" aria-pressed={up} onClick={() => setReceiver(!up)}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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
          I&apos;m looking for software engineering internship and co‑op roles. Email is the best way to reach me.
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
                  className="text-link"
                >
                  {line.value}
                  {!line.href.startsWith("mailto:") && newTab}
                </a>
                {line.copy && (
                  <button type="button" className="directory-copy" data-copied={copied === line.value || undefined} onClick={() => copy(line.value)}>
                    {copied === line.value ? "Copied" : "Copy"}
                    <span className="sr-only"> {line.value}</span>
                  </button>
                )}
              </span>
            </li>
          ))}
        </ol>
        <p role="status" className="sr-only">
          {status}
        </p>
      </div>
    </div>
  );
}
