import Link from "next/link";

import { AuthActions } from "@/components/auth-actions";
import { NavigationLink } from "@/types/world-cup";

const primaryLinks: NavigationLink[] = [
  { href: "/", label: "Home" },
  { href: "/matches", label: "Schedule" },
  { href: "/groups", label: "Groups" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand-mark">
        <span className="brand-kicker">World Cup 2026</span>
        <span className="brand-name">Friend Predictor</span>
      </Link>

      <nav className="nav-links" aria-label="Primary">
        {primaryLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>

      <AuthActions />
    </header>
  );
}
