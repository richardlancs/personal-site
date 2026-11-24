import { profile } from "../../../data/portfolio";
import ProfileLinks from "../ProfileLinks";
import Heading from "../Heading";
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

// The last section, the journey's end (city-track.css): under its heading, the one
// thing someone who wants to reach me needs, "Email me" (the stop's
// primary action, a mailto link to the first address). The address
// itself is written under it, selectable, with a Copy key (CopyButton.tsx,
// the one client piece), for anyone without a mail app. Under a hairline,
// the other ways: any other address as a compact row, then GitHub,
// LinkedIn and the résumé as three keys. A copied address lights the
// panel's edge (the success moment, with the key's tick and "Copied"). The page's colophon is at its foot, not here.
// "Email me" writes to the first address in the data (reorder
// profile.emails to change it).
const primary = profile.emails[0];

// Its rows follow the panel's own width (@container), not the window.
export default function Contact() {
  return (
    <div className="contact @container reveal mt-6">
      <a
        href={`mailto:${primary.address}`}
        className="glass glass-primary glass-lg w-full @min-[27.5rem]:w-auto"
      >
        {mailIcon}
        Email me
      </a>

      {/* The address in words, to copy or to read */}
      <div className="mt-5 flex flex-col gap-1">
        <p className="text-base text-muted">{primary.label}</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <p className="text-lg text-text [overflow-wrap:anywhere] select-all sm:text-xl">{primary.address}</p>
          <CopyButton value={primary.address} />
        </div>
      </div>

      <div className="mt-8 border-t border-line pt-8">
        <Heading level={3} className="font-display text-xl text-text">Other ways to reach me</Heading>

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
  );
}
