import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import prisma from "@/lib/prisma";
import { contentBlocks, questionsOf } from "@/lib/course-handbook";
import { OfflineHandbookButton } from "@/components/offline-handbook";

export const instant = false;
export const metadata: Metadata = { title: "Course handbook", robots: { index: false, follow: false } };

/**
 * The course handbook as a phone-friendly web page that learners can save
 * for offline reading (public/sw.js). Same content as the PDF: published
 * lessons, quiz questions without answers, and lab tasks.
 */
export default async function HandbookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireUser();
  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_userId: { courseId: id, userId: session.user.id } },
    select: { id: true },
  });
  if (!enrollment) redirect("/dashboard");
  const course = await prisma.course.findFirst({
    where: { id, isDraft: false, archivedAt: null },
    select: { name: true, level: true, description: true, audience: true, duration: true, outcomes: true },
  });
  if (!course) notFound();
  const lessons = await prisma.lesson.findMany({
    where: { courseId: id, isPublished: true },
    orderBy: { position: "asc" },
    select: {
      id: true,
      title: true,
      content: true,
      assessment: { select: { questions: true } },
      lab: { select: { instructions: true } },
    },
  });
  const path = `/dashboard/courses/${id}/handbook`;

  return (
    <main className="handbook" id="top">
      <header className="handbook-cover">
        <p className="eyebrow"><span /> Course handbook · {course.level}</p>
        <h1>{course.name}</h1>
        <p>{course.description}</p>
        <OfflineHandbookButton path={path} title={course.name} userId={session.user.id} />
        <p className="handbook-links">
          {/* Plain links: they must work as full page loads when offline. */}
          <a href={`/dashboard/courses/${id}`}>Back to the course</a>
          {" · "}
          <a href={`/api/courses/${id}/handbook`}>Download PDF</a>
          {" · "}
          <a href="/offline">Saved handbooks</a>
        </p>
      </header>

      <section>
        <h2>About this course</h2>
        <p><strong>Who it&rsquo;s for:</strong> {course.audience}</p>
        <p><strong>Duration:</strong> {course.duration}</p>
        <h3>What you&rsquo;ll learn</h3>
        <ul>
          {course.outcomes.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
      </section>

      {lessons.length === 0 ? (
        <p>No lessons published yet. Check back soon.</p>
      ) : (
        <>
          <nav aria-label="Contents" className="handbook-contents">
            <h2>Contents</h2>
            <ol>
              {lessons.map((l) => (
                <li key={l.id}>
                  <a href={`#lesson-${l.id}`}>{l.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          {lessons.map((lesson, i) => {
            const questions = questionsOf(lesson.assessment);
            return (
              <article key={lesson.id} id={`lesson-${lesson.id}`} className="handbook-lesson">
                <p className="handbook-lesson-number">Lesson {i + 1}</p>
                <h2>{lesson.title}</h2>
                {contentBlocks(lesson.content).map((b, bi) =>
                  b.code ? (
                    <pre key={bi}><code>{b.text}</code></pre>
                  ) : (
                    b.text.trim() && <p key={bi}>{b.text}</p>
                  ),
                )}
                {questions.length > 0 && (
                  <div className="handbook-box">
                    <h3>Check your understanding</h3>
                    <ol>
                      {questions.map((q, qi) => (
                        <li key={qi}>
                          {q.question}
                          <ol type="A">
                            {q.options.map((o, oi) => (
                              <li key={oi}>{o}</li>
                            ))}
                          </ol>
                        </li>
                      ))}
                    </ol>
                    <p className="handbook-note">Answer these in the online quiz to check your score.</p>
                  </div>
                )}
                {lesson.lab?.instructions && (
                  <div className="handbook-box">
                    <h3>Hands-on lab</h3>
                    <p>{lesson.lab.instructions}</p>
                    <p className="handbook-note">Open this lesson online to write, run and check your code.</p>
                  </div>
                )}
                <p className="handbook-top"><a href="#top">Back to top ↑</a></p>
              </article>
            );
          })}
        </>
      )}
    </main>
  );
}
