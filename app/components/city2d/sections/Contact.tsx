import { profile } from "../../../data/portfolio";
import ProfileLinks from "../ProfileLinks";
import Heading, { type Where } from "../Heading";
import CopyButton from "./CopyButton";

// The mail icon on "Email me", drawn in the label's colour
const mailIcon = (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);

// The last section: one centred panel, about 44rem wide, that starts with
// the one thing someone who wants to reach me needs, "Email me" (the
// page's primary action, a mailto link to the first address). The address
// itself is written under it, selectable, with a Copy key (CopyButton.tsx,
// the one client piece), for anyone without a mail app. Under a hairline,
// the other ways: any other address as a compact row, then GitHub,
// LinkedIn and the résumé as three keys. A cyan edge along the top is the
// only mark. The page's colophon is at its foot, not here.
// "Email me" writes to the first address in the data (reorder
// profile.emails to change it).
const primary = profile.emails[0];

// Its paddings and rows follow the section's own column (@container), not
// the window, so it fits the 3D city's half-width panel; its heading takes
// its level from where it is drawn (Heading.tsx).
export default function Contact({ where = "2d" }: { where?: Where }) {
  return (
    <div className="@container mt-10">
    {/* (in the 3D city the card is no fill of its own, only its edges:
        glass within the panel's glass) */}
    <div className={`contact mx-auto w-full max-w-[44rem] rounded-[var(--radius-lg)] border border-line border-t-2 border-t-cyan ${where === "3d" ? "bg-transparent" : "bg-panel"} px-[min(1.25rem,5vw)] py-8 @min-[37.5rem]:px-10 @min-[37.5rem]:py-10`}>
      <a
        href={`mailto:${primary.address}`}
        className="glass glass-primary glass-lg w-full @min-[27.5rem]:w-auto"
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
        <Heading level={3} where={where} className="font-display text-xl text-text">Other ways to reach me</Heading>

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

        <ul aria-label="Links" className="mt-6 flex flex-col gap-3 @min-[27.5rem]:flex-row @min-[27.5rem]:flex-wrap">
          <ProfileLinks variant="keys" />
        </ul>
      </div>
    </div>
    </div>
  );
}
