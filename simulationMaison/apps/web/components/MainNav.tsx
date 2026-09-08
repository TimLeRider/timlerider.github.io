"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/simulation", label: "1. Simulation" },
  { href: "/eligibilite-commune", label: "2. Éligibilité commune" },
  { href: "/resultats", label: "3. Résultats" },
  { href: "/financement", label: "4. Financement" },
  { href: "/explications", label: "5. Explications" },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand">
          <span className="brand-dot" />
          Simulateur PTZ &amp; Achat Ancien
        </Link>
        <nav className="main-nav">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname?.startsWith(link.href) ? "active" : ""}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
