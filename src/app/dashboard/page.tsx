import Link from "next/link";
import { requireUser } from "@/lib/session";
import prisma from "@/lib/prisma";
import { hasActiveSubscription } from "@/lib/subscriptions";
import { subscribe } from "./actions";

export const instant = false;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireUser();
  const { error } = await searchParams;
  const isEnterpriseSso = (session.user as { isEnterpriseSso?: boolean }).isEnterpriseSso ?? false;

  const showSubscribePrompt =
    session.user.role === "learner" && !isEnterpriseSso && !(await hasActiveSubscription(session.user.id));

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: session.user.id },
    orderBy: { enrolledAt: "desc" },
    include: {
      course: true,
      lessonProgress: true,
    },
  });

  const courseIds = enrollments.map((e) => e.courseId);
  const [publishedLessons, certificates] = await Promise.all([
    prisma.lesson.findMany({
      where: { courseId: { in: courseIds }, isPublished: true },
      select: { id: true, courseId: true },
    }),
    prisma.certificate.findMany({
      where: { userId: session.user.id, status: "ACTIVE", courseId: { in: courseIds } },
      select: { courseId: true },
    }),
  ]);
  const publishedByCourseId = new Map<string, Set<string>>();
  for (const l of publishedLessons) {
    if (!publishedByCourseId.has(l.courseId)) publishedByCourseId.set(l.courseId, new Set());
    publishedByCourseId.get(l.courseId)!.add(l.id);
  }
  const certifiedCourseIds = new Set(certificates.map((c) => c.courseId));

  return (
    <main>
      <section className="catalog-hero">
        <div className="container">
          <p className="eyebrow"><span /> Your dashboard</p>
          <h1>Welcome back,<br /><span>{session.user.name.split(" ")[0]}.</span></h1>
          <p>Pick up where you left off.</p>
          <p>
            <Link className="text-link" href="/dashboard/billing">Billing &amp; subscription</Link>
            {" · "}
            <Link className="text-link" href="/courses">Browse courses</Link>
          </p>
        </div>
      </section>

      <section className="section catalog-section">
        <div className="container">
          {error && <p className="auth-error">{error}</p>}

          {showSubscribePrompt && (
            <div className="admin-form" style={{ maxWidth: 640, marginBottom: 28 }}>
              <div>
                <h2 style={{ fontSize: 16, marginBottom: 6 }}>Unlock paid courses</h2>
                <p className="lesson-content" style={{ marginBottom: 0 }}>
                  Some of our courses require a Premium subscription (₦5,000 every 6 months). Subscribe,
                  then enrol yourself in any course from the <Link className="text-link" href="/courses">course catalogue</Link>.
                </p>
              </div>
              <form action={subscribe}>
                <button className="button button-primary" type="submit" style={{ justifySelf: "start" }}>
                  Subscribe — ₦5,000 every 6 months
                </button>
              </form>
            </div>
          )}

          {enrollments.length === 0 ? (
            <p className="admin-empty">
              You&rsquo;re not enrolled in anything yet.{" "}
              <Link className="text-link" href="/courses">Browse the courses</Link> and press Enrol on one you like.
            </p>
          ) : (
            <div className="session-grid">
              {enrollments.map((enrollment) => {
                const published = publishedByCourseId.get(enrollment.courseId) ?? new Set<string>();
                const total = published.size;
                // Only lessons that are still published count (an unpublished lesson's old progress doesn't).
                const completed = enrollment.lessonProgress.filter((p) => published.has(p.lessonId)).length;
                const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

                return (
                  <Link className="session-card" href={`/dashboard/courses/${enrollment.courseId}`} key={enrollment.id}>
                    <div className="session-meta-row">
                      <span>{enrollment.course.category}</span>
                      {certifiedCourseIds.has(enrollment.courseId) && <span>🎓 Certificate earned</span>}
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
