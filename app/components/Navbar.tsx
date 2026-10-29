import Link from "next/link";
import { profile } from "../data/portfolio";
import MusicToggle from "./MusicToggle";
import NavLinks from "./NavLinks";
import ThemeToggle from "./ThemeToggle";

// Plain links to every part of the site, for anyone who'd rather not
// explore. Fixed over the painting; its height is --nav-h in globals.css.
export default function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 h-(--nav-h) border-b border-paper-edge bg-nav backdrop-blur-md">
      {/* Phones: name and toggles on the first row, links below.
          From `md` up: everything on one row, toggles on the far right. */}
      <nav
        aria-label="Main"
        className="mx-auto flex h-full max-w-6xl flex-wrap content-center items-center justify-between gap-y-1.5 px-4 sm:px-8"
      >
        <Link href="/" className="font-display text-[15px] font-semibold">
          {profile.name}
        </Link>

        <div className="flex gap-2 md:order-last md:ml-3">
          <MusicToggle />
          <ThemeToggle />
        </div>

        <NavLinks />
      </nav>
    </header>
  );
}
