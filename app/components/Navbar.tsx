import { profile } from "../data/portfolio";
import ThemeToggle from "./ThemeToggle";

const links = [
  { label: "About", href: "#about" },
  { label: "Projects", href: "#projects" },
  { label: "Experience", href: "#experience" },
  { label: "Skills", href: "#skills" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-nav backdrop-blur-xl">
      {/*
        On small screens: name and toggle on the first row, links below.
        On larger screens: everything on one row, toggle on the far right.
      */}
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-1 px-6 py-2 sm:min-h-12 sm:px-10">
        <a href="#top" className="text-sm font-semibold">
          {profile.name}
        </a>

        <div className="sm:order-last sm:ml-3">
          <ThemeToggle />
        </div>

        <ul className="-mx-3 flex w-full overflow-x-auto text-[13px] sm:ml-auto sm:w-auto">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="block whitespace-nowrap px-3 py-1 text-muted transition-colors duration-200 hover:text-foreground"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
