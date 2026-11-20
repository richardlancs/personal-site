import { profile } from "../../../data/portfolio";
import ResumeLink from "../../resume/ResumeLink";
import CopyButton from "./CopyButton";

const newTab = <span className="sr-only"> (opens in a new tab)</span>;

// The last station, the riverside promenade: one wide panel, calm and open.
// The addresses are its strong element, each written large as a mailto link
// with its own Copy key (CopyButton.tsx, the one client piece); the GitHub,
// LinkedIn and résumé links sit beneath. A cyan edge along the top is the
// only mark. The page's colophon is at its foot, not here.
export default function Contact() {
  return (
    <div className="contact rounded-[var(--radius-lg)] border border-line border-t-2 border-t-cyan bg-panel px-5 py-8 sm:px-10 sm:py-10">
      <ul aria-label="Email" className="flex flex-col gap-10">
        {profile.emails.map((email) => (
          <li key={email.address} className="flex flex-col gap-3">
            <h3 className="text-base font-semibold text-muted">{email.label}</h3>
            <a
              href={`mailto:${email.address}`}
              className="text-link text-link-solo contact-address max-w-full self-start font-display text-2xl leading-snug [overflow-wrap:anywhere] sm:text-3xl"
            >
              {email.address}
            </a>
            <CopyButton value={email.address} />
          </li>
        ))}
      </ul>

      <ul aria-label="Links" className="mt-10 flex flex-wrap gap-x-8 gap-y-2 border-t border-line pt-6">
        <li>
          <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="text-link text-link-solo">
            GitHub
            {newTab}
          </a>
        </li>
        <li>
          <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-link text-link-solo">
            LinkedIn
            {newTab}
          </a>
        </li>
        <li>
          {/* Opens the résumé over the page (components/resume) */}
          <ResumeLink className="text-link text-link-solo">Résumé</ResumeLink>
        </li>
      </ul>
    </div>
  );
}
