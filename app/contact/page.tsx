import type { Metadata } from "next";
import Payphone from "../components/locations/Payphone";
import Location from "../components/world/Location";
import { profile } from "../data/portfolio";
import { placeById } from "../data/world";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach Richard Lan: email, GitHub, LinkedIn and résumé.",
};

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
  { label: "Résumé", value: "Download PDF", href: profile.resumeUrl },
];

// The phone booth by the park gate
export default function ContactPage() {
  return (
    <Location place={placeById("booth")} side="left" intro="The light inside still comes on, and the line still works.">
      <Payphone lines={lines} />
    </Location>
  );
}
