import { profile } from "../data/portfolio";
import MusicToggle from "./MusicToggle";
import ThemeToggle from "./ThemeToggle";

const links = [
  { label: "About", href: "#about" },
  { label: "Projects", href: "#projects" },
  { label: "Experience", href: "#experience" },
  { label: "Interests", href: "#interests" },
  { label: "Skills", href: "#skills" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-paper-edge bg-nav backdrop-blur-xl">
      {/*
        On small screens: name and toggles on the first row, links below.
        On larger screens: everything on one row, toggles on the far right.
        ParkWalk marks the link for the section on screen with aria-current.
      */}
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-2 px-4 pb-2.5 pt-2 sm:min-h-12 sm:gap-y-1 sm:px-10 sm:py-2">
        <a href="#top" className="font-display text-[15px] font-semibold">
          {profile.name}
        </a>

        <div className="flex gap-2 sm:order-last sm:ml-3">
          <MusicToggle />
          <ThemeToggle />
        </div>

        {/* On phones the links share one full-width track, like an iOS
            segmented control. From `sm` up they become separate pills. */}
        <ul className="flex w-full overflow-x-auto rounded-full bg-foreground/5 p-1 text-xs sm:-m-1 sm:ml-auto sm:w-auto sm:gap-1.5 sm:overflow-visible sm:bg-transparent sm:text-[13px]">
          {links.map((link) => (
            <li key={link.href} className="flex-1 sm:flex-none">
              <a
                href={link.href}
                className="hover-grow flex h-8 items-center justify-center whitespace-nowrap rounded-full px-1.5 text-muted hover:bg-foreground/10 hover:text-foreground active:bg-foreground/10 aria-[current=location]:bg-foreground/10 aria-[current=location]:text-foreground sm:bg-foreground/5 sm:px-3.5"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* How far along the walk the visitor is */}
      <div className="walk-progress" aria-hidden="true" />
    </header>
  );
}
