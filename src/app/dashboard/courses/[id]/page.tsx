import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import prisma from "@/lib/prisma";

export const instant = false;

export default async function DashboardCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireUser();

  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_userId: { courseId: id, userId: session.user.id } },
  });
  if (!enrollment) redirect("/dashboard");

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) notFound();

  const [lessons, progress] = await Promise.all([
    prisma.lesson.findMany({ where: { courseId: id, isPublished: true }, orderBy: { position: "asc" } }),
    prisma.lessonProgress.findMany({ where: { enrollmentId: enrollment.id } }),
  ]);
  const completedLessonIds = new Set(progress.map((p) => p.lessonId));

  return (
    <main>
      <section className="catalog-hero">
        <div className="container">
          <p className="eyebrow"><span /> {course.category}</p>
          <h1 style={{ fontSize: "clamp(32px, 4.4vw, 48px)" }}>{course.name}</h1>
          <p>{course.description}</p>
        </div>
      </section>

      <section className="section catalog-section">
        <div className="container" style={{ maxWidth: 720 }}>
          {lessons.length === 0 ? (
            <p className="admin-empty">No lessons published yet — check back soon.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Lesson</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((lesson) => (
                  <tr key={lesson.id}>
                    <td>{lesson.position}</td>
                    <td>{lesson.title}</td>
                    <td>{completedLessonIds.has(lesson.id) ? "✓ Complete" : "Not started"}</td>
                    <td>
                      <Link href={`/dashboard/courses/${id}/lessons/${lesson.id}`} className="text-link">
                        {completedLessonIds.has(lesson.id) ? "Review" : "Start"} <span aria-hidden="true">→</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p style={{ marginTop: 32 }}>
            <Link className="text-link text-link-back" href="/dashboard">
              <span aria-hidden="true">←</span> Back to dashboard
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
