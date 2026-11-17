import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import prisma from "@/lib/prisma";
import { QUIZ_PASS_PERCENT, findCourseCertificate, getCourseProgress } from "@/lib/course-completion";
import { createCertificateVerificationToken } from "@/lib/certificate-verification";

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
  const [summary, certificate] = await Promise.all([
    getCourseProgress(session.user.id, id),
    findCourseCertificate(session.user.id, id),
  ]);
  let verifyPath: string | null = null;
  if (certificate) {
    try {
      verifyPath = `/verify/certificate/${createCertificateVerificationToken(certificate.id)}`;
    } catch {
      verifyPath = null; // signing secret not configured
    }
  }

  return (
    <main>
      <section className="catalog-hero">
        <div className="container">
          <p className="eyebrow"><span /> {course.category}</p>
          <h1 style={{ fontSize: "clamp(32px, 4.4vw, 48px)" }}>{course.name}</h1>
          <p>{course.description}</p>
          {lessons.length > 0 && (
            <p>
              <a href={`/api/courses/${id}/handbook`} className="text-link">
                Download the course handbook (PDF) <span aria-hidden="true">↓</span>
              </a>
            </p>
          )}
        </div>
      </section>

      <section className="section catalog-section">
        <div className="container" style={{ maxWidth: 720 }}>
          {summary && summary.totalLessons > 0 && (
            <div className="admin-form" style={{ maxWidth: 720, marginBottom: 24 }}>
              {certificate ? (
                <div>
                  <h2 style={{ fontSize: 18, marginBottom: 6 }}>🎓 Course complete: your certificate is ready</h2>
                  <p className="lesson-content" style={{ marginBottom: 10 }}>
                    Certificate number {certificate.certificateNumber}, issued{" "}
                    {new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(certificate.issuedAt)}.
                  </p>
                  <p style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <a className="button button-primary" href={`/api/certificates/${certificate.id}/pdf`}>
                      Download certificate (PDF)
                    </a>
                    {verifyPath && (
                      <a className="text-link" href={verifyPath}>
                        Public verification link <span aria-hidden="true">→</span>
                      </a>
                    )}
                  </p>
                </div>
              ) : (
                <div>
                  <h2 style={{ fontSize: 16, marginBottom: 6 }}>Your progress: {summary.percent}%</h2>
                  <div className="progress-bar" aria-hidden="true">
                    <span style={{ width: `${summary.percent}%` }} />
                  </div>
                  <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 8 }}>
                    {summary.completedLessons} of {summary.totalLessons} lessons complete
                    {summary.quizzesTotal > 0 && ` · ${summary.quizzesPassed} of ${summary.quizzesTotal} quizzes passed (${QUIZ_PASS_PERCENT}%+)`}.
                    Finish every lesson and pass every quiz to earn your certificate.
                  </p>
                </div>
              )}
            </div>
          )}
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
