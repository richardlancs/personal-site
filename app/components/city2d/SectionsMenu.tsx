"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { listed } from "../../sections/registry";

// The Sections menu under its button in the top bar (TopBar.tsx): every
// listed section from the registry, by its title. Where you are is the
// chosen state (aria-current); choosing one closes the menu, since the
// page changes underneath it.
export default function SectionsMenu() {
  const pathname = usePathname();
  const close = () => document.getElementById("places-menu")?.hidePopover();

  return (
    <nav id="places-menu" popover="auto" aria-label="Sections" className="sections-menu">
      <ul>
        {listed.map((s) => (
          <li key={s.id}>
            <Link href={s.href} onClick={close} aria-current={pathname === s.href ? "page" : undefined} className="glass">
              {s.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
