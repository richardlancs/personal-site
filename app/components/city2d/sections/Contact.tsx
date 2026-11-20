import type { ReactNode } from "react";
import { profile } from "../../../data/portfolio";
import ResumeLink from "../../resume/ResumeLink";
import CopyButton from "./CopyButton";

const newTab = <span className="sr-only"> (opens in a new tab)</span>;

// The address "Email me" writes to: the first in the data (reorder
// profile.emails to change it)
const primary = profile.emails[0];

// Small line icons, drawn in the label's colour; the label says what they mean
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const mailIcon = (
  <Icon>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m4 7 8 6 8-6" />
  </Icon>
);

// Code brackets for GitHub, "in" for LinkedIn, a page for the résumé
const githubIcon = (
  <Icon>
    <path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12" />
  </Icon>
);

const linkedinIcon = (
  <Icon>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M8 10.5V16M8 7.5v.01M12 16v-5.5M12 13c0-1.7 1-2.5 2.2-2.5S16 11.3 16 13v3" />
  </Icon>
);

const resumeIcon = (
  <Icon>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h6" />
  </Icon>
);

// The glass base rule sits outside Tailwind's layers, so the utilities
// that change what it sets (height, padding, gap, alignment) are marked !
const keyClass = "glass w-full justify-start! min-[480px]:w-auto min-[480px]:justify-center!";

// The last section: one centred panel, about 44rem wide, that starts with
// the one thing someone who wants to reach me needs, "Email me" (the
// page's primary action, a mailto link to the first address). The address
// itself is written under it, selectable, with a Copy key (CopyButton.tsx,
// the one client piece), for anyone without a mail app. Under a hairline,
// the other ways: any other address as a compact row, then GitHub,
// LinkedIn and the résumé as three keys. A cyan edge along the top is the
// only mark. The page's colophon is at its foot, not here.
export default function Contact() {
  return (
    <div className="contact mx-auto mt-10 w-full max-w-[44rem] rounded-[var(--radius-lg)] border border-line border-t-2 border-t-cyan bg-panel px-5 py-8 sm:px-10 sm:py-10">
      <a
        href={`mailto:${primary.address}`}
        className="glass glass-primary min-h-14! w-full gap-3! px-8! text-lg min-[480px]:w-auto"
      >
        {mailIcon}
        Email me
      </a>

      {/* The address in words, to copy or to read */}
      <div className="mt-5 flex flex-col gap-1">
        <span className="text-base text-muted">{primary.label}</span>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="text-lg text-text [overflow-wrap:anywhere] select-all sm:text-xl">{primary.address}</span>
          <CopyButton value={primary.address} />
        </div>
      </div>

      <div className="mt-8 border-t border-line pt-8">
        <h3 className="font-display text-xl text-text">Other ways to reach me</h3>

        {profile.emails.length > 1 && (
          <ul aria-label="Other email" className="mt-5 flex flex-col gap-4">
            {profile.emails.slice(1).map((email) => (
              <li key={email.address} className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-base text-muted">{email.label}</span>
                <a
                  href={`mailto:${email.address}`}
                  className="text-link text-link-solo max-w-full text-base [overflow-wrap:anywhere]"
                >
                  {email.address}
                </a>
                <CopyButton value={email.address} />
              </li>
            ))}
          </ul>
        )}

        <ul aria-label="Links" className="mt-6 flex flex-col gap-3 min-[480px]:flex-row min-[480px]:flex-wrap">
          <li>
            <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className={keyClass}>
              {githubIcon}
              GitHub
              {newTab}
            </a>
          </li>
          <li>
            <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className={keyClass}>
              {linkedinIcon}
              LinkedIn
              {newTab}
            </a>
          </li>
          <li>
            {/* Opens the résumé over the page (components/resume) */}
            <ResumeLink className={keyClass}>
              {resumeIcon}
              Résumé
            </ResumeLink>
          </li>
        </ul>
      </div>
    </div>
  );
}
