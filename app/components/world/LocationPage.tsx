import Image from "next/image";
import Link from "next/link";
import park from "../../assets/park/park-v04.png";
import { profile } from "../../data/portfolio";
import type { Place } from "../../data/world";

// A place in the park that hasn't been painted yet. It opens on a band of
// the park painting looking toward the place, so it's honestly the view
// from the park, with the content on a sheet of paper below.
export default function LocationPage({
  place,
  wide = false,
  children,
}: {
  place: Place;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className="arrive pt-(--nav-h)">
      <div className="relative h-[clamp(11rem,32svh,19rem)] overflow-hidden">
        <Image
          src={park}
          alt=""
          fill
          preload
          placeholder="blur"
          quality={85}
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: `${place.view.x}% ${place.view.y}%` }}
        />
      </div>

      <div className={`relative mx-auto -mt-14 px-4 pb-16 sm:px-6 ${wide ? "max-w-5xl" : "max-w-3xl"}`}>
        <div className="paper px-6 py-8 sm:px-10 sm:py-10">
          <Link href="/" className="text-link text-sm font-medium">
            Back to the park
          </Link>
          <p className="mt-6 font-display text-[15px] text-muted">{place.name}, seen from the park</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {place.section}
          </h1>
          <div className="mt-8">{children}</div>
        </div>

        {/* Year is written out because the pages are pre-built as static HTML */}
        <p className="mt-6 text-center text-xs text-muted">© 2026 {profile.name}</p>
      </div>
    </main>
  );
}
