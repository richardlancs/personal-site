import { profile } from "../data/portfolio";
import Section from "./Section";

// Shows a URL without "https://" and "www." so it reads cleanly.
const shortUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "");

const contactLinks = [
  ...profile.emails.map((email) => ({
    label: email.label,
    value: email.address,
    href: `mailto:${email.address}`,
  })),
  { label: "GitHub", value: shortUrl(profile.githubUrl), href: profile.githubUrl },
  {
    label: "LinkedIn",
    value: shortUrl(profile.linkedinUrl),
    href: profile.linkedinUrl,
  },
];

export default function Contact() {
  return (
    <Section id="contact" title="Contact" tone="soft">
      <p className="text-lg leading-relaxed text-muted">
        I&apos;m looking for software engineering internship and co-op roles.
        Email is the best way to reach me.
      </p>

      {/* One grouped surface, like a settings list */}
      <dl className="mt-10 divide-y divide-border rounded-2xl border border-border bg-card">
        {contactLinks.map((link) => (
          <div
            key={link.label}
            className="grid gap-1 px-6 py-4 sm:grid-cols-[140px_1fr] sm:gap-6"
          >
            <dt className="text-sm text-muted sm:pt-0.5">{link.label}</dt>
            <dd>
              <a
                href={link.href}
                // Email links open the mail app; web links open in a new tab
                target={link.href.startsWith("mailto:") ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="break-all transition-colors duration-200 hover:text-accent"
              >
                {link.value}
              </a>
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
