import { profile } from "../data/portfolio";
import { EveningScene } from "./park/scenes";
import Zone from "./Zone";

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

// The end of the walk, so it also carries what used to be the footer.
export default function Contact() {
  return (
    <Zone id="contact" place="The far gate" title="Contact" scene={<EveningScene />}>
      <div className="paper max-w-2xl p-7 sm:p-8 walk:w-[min(34rem,40vw)]">
        <p className="leading-relaxed text-muted sm:text-lg">
          I&apos;m looking for software engineering internship and co-op roles.
          Email is the best way to reach me.
        </p>

        <dl className="mt-6 divide-y divide-border border-y border-border">
          {contactLinks.map((link) => (
            <div key={link.label} className="grid gap-1 py-3.5 sm:grid-cols-[130px_1fr] sm:gap-6">
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

        {/* Year is written out because this page is pre-built as static HTML */}
        <p className="mt-6 text-xs text-muted">© 2026 {profile.name}</p>
      </div>
    </Zone>
  );
}
