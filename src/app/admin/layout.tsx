import type { Metadata } from "next";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: { template: "%s | Admin", default: "Admin" },
  robots: { index: false, follow: false },
};

// The whole admin section reads the session cookie on every request
// (requireAdmin() below) — it's never prerenderable, and that's fine: this
// is a low-traffic internal tool, not a page that needs a static/PPR shell.
export const instant = false;

const adminLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/resources", label: "Free resources" },
  { href: "/admin/certificates", label: "Certificates" },
  { href: "/admin/forum", label: "Community forum" },
  { href: "/admin/users", label: "Users" },
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <p className="admin-sidebar-title">Mode Coders Club Admin</p>
        <nav className="admin-nav">
          {adminLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="auth-footer-note" style={{ marginTop: 24, textAlign: "left" }}>
          Signed in as {session.user.email}
        </p>
        <SignOutButton className="text-link" />
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
