import type { Metadata } from "next";
import LocationPage from "../components/world/LocationPage";
import { profile } from "../data/portfolio";
import { placeById } from "../data/world";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach Richard Lan: email, GitHub and LinkedIn.",
};

// Shows a URL without "https://" and "www." so it reads cleanly
const shortUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "");

const contactLinks = [
  ...profile.emails.map((email) => ({
    label: email.label,
    value: email.address,
    href: `mailto:${email.address}`,
  })),
  { label: "GitHub", value: shortUrl(profile.githubUrl), href: profile.githubUrl },
  { label: "LinkedIn", value: shortUrl(profile.linkedinUrl), href: profile.linkedinUrl },
];

export default function ContactPage() {
  return (
    <LocationPage place={placeById("booth")}>
      <p className="leading-relaxed text-muted sm:text-lg">
        I&apos;m looking for software engineering internship and co-op roles. Email is the best
        way to reach me.
      </p>

      <dl className="mt-8 divide-y divide-border border-y border-border">
        {contactLinks.map((link) => (
          <div key={link.label} className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-8">
            <dt className="text-sm text-muted sm:pt-0.5">{link.label}</dt>
            <dd>
              <a
                href={link.href}
                // Email links open the mail app; web links open in a new tab
                target={link.href.startsWith("mailto:") ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="text-link break-all"
              >
                {link.value}
              </a>
            </dd>
          </div>
        ))}
      </dl>
    </LocationPage>
  );
}
