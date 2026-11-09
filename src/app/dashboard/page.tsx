import Link from "next/link";
import { requireUser } from "@/lib/session";
import prisma from "@/lib/prisma";

export const instant = false;

export default async function DashboardPage() {
  const session = await requireUser();

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: session.user.id },
    orderBy: { enrolledAt: "desc" },
    include: {
      course: true,
      lessonProgress: true,
    },
  });

  const courseIds = enrollments.map((e) => e.courseId);
  const publishedCounts = await prisma.lesson.groupBy({
    by: ["courseId"],
    where: { courseId: { in: courseIds }, isPublished: true },
    _count: { _all: true },
  });
  const publishedByCourseId = new Map(publishedCounts.map((row) => [row.courseId, row._count._all]));

  return (
    <main>
      <section className="catalog-hero">
        <div className="container">
          <p className="eyebrow"><span /> Your dashboard</p>
          <h1>Welcome back,<br /><span>{session.user.name.split(" ")[0]}.</span></h1>
          <p>Pick up where you left off.</p>
        </div>
      </section>

      <section className="section catalog-section">
        <div className="container">
          {enrollments.length === 0 ? (
            <p className="admin-empty">
              You&rsquo;re not enrolled in anything yet. Ask us about a course at{" "}
              <a href="/contact">the contact page</a>.
            </p>
          ) : (
            <div className="session-grid">
              {enrollments.map((enrollment) => {
                const total = publishedByCourseId.get(enrollment.courseId) ?? 0;
                const completed = enrollment.lessonProgress.length;
                const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

                return (
                  <Link className="session-card" href={`/dashboard/courses/${enrollment.courseId}`} key={enrollment.id}>
                    <div className="session-meta-row">
                      <span>{enrollment.course.category}</span>
                    </div>
                    <h3>{enrollment.course.name}</h3>
                    <p>
                      {total === 0
                        ? "No lessons published yet."
                        : `${completed} of ${total} lessons complete (${percent}%)`}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
