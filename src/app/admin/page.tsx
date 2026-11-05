import Link from "next/link";
import prisma from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [courseCount, resourceCount, certificateCount, forumSessionCount, userCount] = await Promise.all([
    prisma.course.count({ where: { archivedAt: null } }),
    prisma.freeResource.count({ where: { archivedAt: null } }),
    prisma.certificate.count(),
    prisma.forumSession.count(),
    prisma.user.count(),
  ]);

  const cards = [
    { href: "/admin/courses", label: "Active courses", value: courseCount },
    { href: "/admin/resources", label: "Free resources", value: resourceCount },
    { href: "/admin/certificates", label: "Certificates issued", value: certificateCount },
    { href: "/admin/forum", label: "Forum sessions", value: forumSessionCount },
    { href: "/admin/users", label: "Users", value: userCount },
  ];

  return (
    <div>
      <div className="admin-header">
        <h1>Dashboard</h1>
      </div>
      <div className="course-grid">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="activity-card" style={{ textDecoration: "none" }}>
            <span style={{ fontSize: 28, fontWeight: 800, display: "block", marginBottom: 6 }}>{card.value}</span>
            <h2 style={{ fontSize: 14 }}>{card.label}</h2>
          </Link>
        ))}
      </div>
    </div>
  );
}
