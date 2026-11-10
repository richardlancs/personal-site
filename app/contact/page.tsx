import Payphone from "../components/locations/Payphone";
import Location from "../components/world/Location";
import { profile } from "../data/portfolio";
import { section, sectionMetadata } from "../sections/registry";

export const metadata = sectionMetadata("contact");

// Shows a URL without "https://" and "www." so it reads cleanly
const shortUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "");

const lines = [
  ...profile.emails.map((email) => ({
    label: email.label,
    value: email.address,
    href: `mailto:${email.address}`,
    copy: true,
  })),
  { label: "GitHub", value: shortUrl(profile.githubUrl), href: profile.githubUrl },
  { label: "LinkedIn", value: shortUrl(profile.linkedinUrl), href: profile.linkedinUrl },
  // Opens the in-page viewer (components/resume)
  { label: "Résumé", value: "Open the PDF", href: profile.resumeUrl, viewer: true },
];

// The phone booth by the park gate
export default function ContactPage() {
  return (
    <Location section={section("contact")}>
      <Payphone lines={lines} />
    </Location>
  );
}
