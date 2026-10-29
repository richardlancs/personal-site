"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { label: "About", href: "/about" },
  { label: "Projects", href: "/projects" },
  { label: "Skills", href: "/projects#skills" },
  { label: "Experience", href: "/experience" },
  { label: "Interests", href: "/interests" },
  { label: "Contact", href: "/contact" },
];

// Marks the page you're on with aria-current, which also styles it
export default function NavLinks() {
  const pathname = usePathname();

  return (
    // On phones the links share one full-width track; from `md` up they
    // become separate pills
    <ul className="flex w-full overflow-x-auto rounded-full bg-foreground/5 p-1 text-xs md:-m-1 md:ml-auto md:w-auto md:gap-1 md:overflow-visible md:bg-transparent md:text-[13px]">
      {links.map((link) => (
        <li key={link.href} className="flex-1 md:flex-none">
          <Link
            href={link.href}
            aria-current={link.href === pathname ? "page" : undefined}
            className="flex h-8 items-center justify-center whitespace-nowrap rounded-full px-2 text-muted transition-colors duration-200 hover:bg-foreground/10 hover:text-foreground aria-[current=page]:bg-foreground/10 aria-[current=page]:text-foreground md:px-3.5"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
