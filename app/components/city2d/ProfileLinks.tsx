import type { ReactNode } from "react";
import { profile } from "../../data/portfolio";
import ResumeLink from "../resume/ResumeLink";

// Said after a link that opens in a new tab (read out, not shown)
export const newTab = <span className="sr-only"> (opens in a new tab)</span>;

// Small line icons, drawn in the label's colour; the label says what they mean
function Icon({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width={size}
      height={size}
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

// Code brackets for GitHub, "in" for LinkedIn, a page for the résumé, an
// envelope for the email
const paths = {
  github: <path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12" />,
  linkedin: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 10.5V16M8 7.5v.01M12 16v-5.5M12 13c0-1.7 1-2.5 2.2-2.5S16 11.3 16 13v3" />
    </>
  ),
  resume: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </>
  ),
  email: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
};

// GitHub, LinkedIn and the résumé, the same three links wherever they're
// offered (the hero, About, Contact), each an icon and a label, the résumé
// always "Résumé" and opened over the page (components/resume). Rendered
// as three <li>s, so each place keeps its own list around them. "text":
// 44px text links (the hero, About); "keys": glass keys (Contact), full
// width on phones. `githubNote` follows the GitHub link in muted words.
// The hero leaves the résumé out (`resume={false}`: it is a glass key
// beside "View projects" there) and adds the email (`email`, an address),
// so its row is one style, every link an icon and a label.
export default function ProfileLinks({
  variant,
  githubNote,
  resume = true,
  email,
}: {
  variant: "text" | "keys";
  githubNote?: string;
  resume?: boolean;
  email?: string;
}) {
  const keys = variant === "keys";
  const className = keys ? "glass profile-key w-full min-[480px]:w-auto" : "text-link text-link-solo gap-2";
  const size = keys ? 20 : 18;
  return (
    <>
      <li>
        <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className={className}>
          <Icon size={size}>{paths.github}</Icon>
          GitHub
          {newTab}
        </a>
        {githubNote && <span className="text-muted">, {githubNote}</span>}
      </li>
      <li>
        <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className={className}>
          <Icon size={size}>{paths.linkedin}</Icon>
          LinkedIn
          {newTab}
        </a>
      </li>
      {resume && (
        <li>
          <ResumeLink className={className}>
            <Icon size={size}>{paths.resume}</Icon>
            Résumé
          </ResumeLink>
        </li>
      )}
      {email && (
        <li>
          <a href={`mailto:${email}`} className={className}>
            <Icon size={size}>{paths.email}</Icon>
            Email
          </a>
        </li>
      )}
    </>
  );
}
