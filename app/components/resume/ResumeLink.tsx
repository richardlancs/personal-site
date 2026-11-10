import type { ReactNode } from "react";
import { profile } from "../../data/portfolio";

// A link to the résumé PDF that opens the in-page viewer (ResumeHost.tsx
// listens for clicks on it). It stays a plain link in the page's HTML, so
// it still reaches the file in a new tab without JavaScript, before the
// page has woken up, and with a middle or modified click. Not a client
// component: the one listener is in the layout.
export default function ResumeLink({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" data-resume="" aria-haspopup="dialog" className={className}>
      {children}
    </a>
  );
}
