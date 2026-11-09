import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import prisma from "@/lib/prisma";
import { toEmbedUrl } from "@/lib/video-embed";
import { markLessonComplete } from "../../../../actions";

export const instant = false;

export default async function DashboardLessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id, lessonId } = await params;
  const session = await requireUser();

  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_userId: { courseId: id, userId: session.user.id } },
  });
  if (!enrollment) redirect("/dashboard");

  const [lesson, allLessons, progress] = await Promise.all([
    prisma.lesson.findUnique({ where: { id: lessonId, courseId: id, isPublished: true } }),
    prisma.lesson.findMany({ where: { courseId: id, isPublished: true }, orderBy: { position: "asc" } }),
    prisma.lessonProgress.findUnique({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
    }),
  ]);
  if (!lesson) notFound();

  const index = allLessons.findIndex((l) => l.id === lessonId);
  const previousLesson = index > 0 ? allLessons[index - 1] : null;
  const nextLesson = index >= 0 && index < allLessons.length - 1 ? allLessons[index + 1] : null;
  const embedUrl = lesson.videoUrl ? toEmbedUrl(lesson.videoUrl) : null;
  const isComplete = Boolean(progress);

  return (
    <main className="section catalog-section">
      <div className="container" style={{ maxWidth: 720 }}>
        <p className="eyebrow"><span /> Lesson {lesson.position}</p>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", marginBottom: 20 }}>{lesson.title}</h1>

        {embedUrl && (
          <div className="video-embed">
            <iframe src={embedUrl} title={lesson.title} allowFullScreen />
          </div>
        )}

        <p className="lesson-content">{lesson.content}</p>

        <form action={markLessonComplete.bind(null, id, lessonId)}>
          <button className="button button-primary" type="submit" disabled={isComplete}>
            {isComplete ? "✓ Completed" : "Mark complete"}
          </button>
        </form>

        <div className="lesson-nav">
          {previousLesson ? (
            <Link className="text-link text-link-back" href={`/dashboard/courses/${id}/lessons/${previousLesson.id}`}>
              <span aria-hidden="true">←</span> {previousLesson.title}
            </Link>
          ) : (
            <span />
          )}
          {nextLesson ? (
            <Link className="text-link" href={`/dashboard/courses/${id}/lessons/${nextLesson.id}`}>
              {nextLesson.title} <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <Link className="text-link" href={`/dashboard/courses/${id}`}>
              Back to course <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
