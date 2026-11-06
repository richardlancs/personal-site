import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Not found",
};

// An address with no page: a notice in the park, and the way back
export default function NotFound() {
  return (
    <main className="over-world location" data-side="middle">
      <div className="lost-notice paper arrive take-clicks">
        <p className="location-place">A path that isn&apos;t on the map</p>
        <h1 className="location-title">Nothing here</h1>
        <p className="location-intro">There&apos;s no page at this address. Everything else is still where it was.</p>
        <p className="lost-notice-links">
          <Link href="/" className="text-link">
            Back to the park
          </Link>
          <Link href="/map" className="text-link">
            Open the map
          </Link>
        </p>
      </div>
    </main>
  );
}
