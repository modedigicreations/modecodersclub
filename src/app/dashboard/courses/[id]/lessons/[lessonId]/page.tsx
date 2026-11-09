import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import prisma from "@/lib/prisma";
import { toEmbedUrl } from "@/lib/video-embed";
import { LabEditor } from "@/components/lab-editor";
import { markLessonComplete, submitAssessment } from "../../../../actions";

type AssessmentQuestion = { question: string; options: string[]; correctIndex: number };

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

  const [lesson, allLessons, progress, lab, assessment] = await Promise.all([
    prisma.lesson.findUnique({ where: { id: lessonId, courseId: id, isPublished: true } }),
    prisma.lesson.findMany({ where: { courseId: id, isPublished: true }, orderBy: { position: "asc" } }),
    prisma.lessonProgress.findUnique({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
    }),
    prisma.lab.findUnique({ where: { lessonId } }),
    prisma.assessment.findUnique({ where: { lessonId } }),
  ]);
  if (!lesson) notFound();

  const submission = lab
    ? await prisma.labSubmission.findUnique({
        where: { labId_userId: { labId: lab.id, userId: session.user.id } },
      })
    : null;
  const attempt = assessment
    ? await prisma.assessmentAttempt.findUnique({
        where: { assessmentId_userId: { assessmentId: assessment.id, userId: session.user.id } },
      })
    : null;
  const questions = (assessment?.questions as unknown as AssessmentQuestion[] | undefined) ?? [];
  const previousAnswers = (attempt?.answers as unknown as number[] | undefined) ?? [];

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

        {lab && (
          <>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Coding lab</h2>
            <p className="lesson-content" style={{ marginBottom: 16 }}>{lab.instructions}</p>
            <LabEditor
              lessonId={lessonId}
              labId={lab.id}
              hintsEnabled={lab.hintsEnabled}
              initial={{
                html: submission?.html ?? lab.starterHtml,
                css: submission?.css ?? lab.starterCss,
                js: submission?.js ?? lab.starterJs,
              }}
            />
          </>
        )}

        {assessment && (
          <>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Assessment</h2>
            {attempt && (
              <p className="lesson-content" style={{ marginBottom: 16 }}>
                Your score: {attempt.score} / {attempt.total}. Answer again to update it.
              </p>
            )}
            <form className="admin-form" action={submitAssessment.bind(null, id, lessonId)} style={{ maxWidth: 640 }}>
              {questions.map((question, index) => (
                <div key={index}>
                  <label htmlFor={`q${index}`} style={{ textTransform: "none", fontSize: 14, color: "var(--ink)" }}>
                    {index + 1}. {question.question}
                  </label>
                  <div id={`q${index}`} style={{ display: "grid", gap: 6, marginTop: 6 }}>
                    {question.options.map((option, optionIndex) => (
                      <label
                        key={optionIndex}
                        style={{ display: "flex", alignItems: "center", gap: 8, textTransform: "none", fontSize: 14, color: "var(--ink)", marginBottom: 0 }}
                      >
                        <input
                          type="radio"
                          name={`q${index}`}
                          value={optionIndex}
                          defaultChecked={previousAnswers[index] === optionIndex}
                          style={{ width: "auto" }}
                          required
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <button className="button button-primary" type="submit" style={{ justifySelf: "start" }}>
                {attempt ? "Resubmit" : "Submit answers"}
              </button>
            </form>
          </>
        )}

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
