"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navLinks = [
  { href: "/courses", label: "Courses" },
  { href: "/community", label: "Community" },
  { href: "/about", label: "About the club" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" href="/" aria-label="Mode Coders Club home" onClick={closeMenu}>
          <span className="brand-mark" aria-hidden="true">
            <Image src="/mode-digischool-logo.png" alt="" width={42} height={46} priority />
          </span>
          <span className="brand-name">
            MODE
            <span>CODERS CLUB</span>
          </span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined}>
              {link.label}
            </Link>
          ))}
          <a href="mailto:info@modecodersclub.com.ng?subject=School%20partnership">For schools</a>
        </nav>
        <div className="header-actions">
          <Link className="button button-small button-dark" href="/contact">
            Get in touch <span aria-hidden="true">↗</span>
          </Link>
          <button
            type="button"
            className="menu-toggle"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-nav" className="container mobile-nav" aria-label="Mobile navigation">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              onClick={closeMenu}
            >
              {link.label}
            </Link>
          ))}
          <a href="mailto:info@modecodersclub.com.ng?subject=School%20partnership" onClick={closeMenu}>
            For schools
          </a>
        </nav>
      )}
    </header>
  );
}
