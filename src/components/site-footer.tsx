import Image from "next/image";
import Link from "next/link";

// The year is deterministic within a given build (the cache key already
// includes the build ID), so this is safe to prerender statically instead
// of forcing the footer — and every page that renders it — to be dynamic.
async function getCurrentYear() {
  "use cache";
  return new Date().getFullYear();
}

export async function SiteFooter() {
  const year = await getCurrentYear();

  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <Link className="brand brand-footer" href="/" aria-label="Mode Coders Club home">
          <span className="brand-mark" aria-hidden="true">
            <Image src="/mode-digischool-logo.png" alt="" width={36} height={40} />
          </span>
          <span className="brand-name">MODE<span>CODERS CLUB</span></span>
        </Link>
        <p>Empowering the future, one coder at a time.</p>
        <div className="footer-links">
          <Link href="/courses">Courses</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {year} Mode Coders Club</span>
        <span>Part of MODE DigiSchool</span>
      </div>
    </footer>
  );
}
