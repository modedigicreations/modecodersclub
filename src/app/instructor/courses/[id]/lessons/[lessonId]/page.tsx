import { notFound } from "next/navigation";
import { requireInstructorAccess } from "@/lib/session";
import prisma from "@/lib/prisma";
import { GenerateAssessmentButton, GenerateLabButton } from "@/components/ai-generate-button";
import { deleteAssessment, deleteLab, updateLesson, upsertAssessment, upsertLab } from "../../actions";

export const instant = false;

export default async function EditLessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; lessonId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id, lessonId } = await params;
  const { error } = await searchParams;
  await requireInstructorAccess(id);

  const [lesson, lab, assessment] = await Promise.all([
    prisma.lesson.findUnique({ where: { id: lessonId, courseId: id } }),
    prisma.lab.findUnique({ where: { lessonId } }),
    prisma.assessment.findUnique({ where: { lessonId } }),
  ]);
  if (!lesson) notFound();

  const questionsText = assessment ? JSON.stringify(assessment.questions, null, 2) : "";

  return (
    <main className="section catalog-section">
      <div className="container">
        <div className="admin-header">
          <h1>Edit {lesson.title}</h1>
        </div>
        {error && <p className="auth-error">{error}</p>}
        <form className="admin-form" action={updateLesson.bind(null, id, lessonId)}>
          <div>
            <label htmlFor="title">Title</label>
            <input id="title" name="title" defaultValue={lesson.title} required />
          </div>
          <div>
            <label htmlFor="content">Content</label>
            <textarea id="content" name="content" defaultValue={lesson.content} style={{ minHeight: 160 }} required />
          </div>
          <div>
            <label htmlFor="videoUrl">Video URL (YouTube or Vimeo, optional)</label>
            <input id="videoUrl" name="videoUrl" type="url" defaultValue={lesson.videoUrl ?? ""} />
          </div>
          <div className="admin-form-row">
            <div>
              <label htmlFor="position">Position (lower shows first)</label>
              <input id="position" name="position" type="number" defaultValue={lesson.position} required />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, paddingBottom: 9 }}>
              <input id="isPublished" name="isPublished" type="checkbox" defaultChecked={lesson.isPublished} style={{ width: "auto" }} />
              <label htmlFor="isPublished" style={{ marginBottom: 0, textTransform: "none", fontSize: 13, color: "var(--ink)" }}>
                Published (visible to enrolled students)
              </label>
            </div>
          </div>
          <button className="button button-primary" type="submit" style={{ justifySelf: "start" }}>
            Save changes
          </button>
        </form>

        <div className="admin-header">
          <h2>Coding lab</h2>
        </div>
        <GenerateLabButton lessonId={lessonId} />
        <form className="admin-form" action={upsertLab.bind(null, id, lessonId)}>
          <div>
            <label htmlFor="instructions">Instructions</label>
            <textarea id="instructions" name="instructions" defaultValue={lab?.instructions ?? ""} style={{ minHeight: 100 }} required />
          </div>
          <div>
            <label htmlFor="starterHtml">Starter HTML</label>
            <textarea id="starterHtml" name="starterHtml" defaultValue={lab?.starterHtml ?? ""} style={{ minHeight: 90, fontFamily: "monospace" }} />
          </div>
          <div>
            <label htmlFor="starterCss">Starter CSS</label>
            <textarea id="starterCss" name="starterCss" defaultValue={lab?.starterCss ?? ""} style={{ minHeight: 90, fontFamily: "monospace" }} />
          </div>
          <div>
            <label htmlFor="starterJs">Starter JS</label>
            <textarea id="starterJs" name="starterJs" defaultValue={lab?.starterJs ?? ""} style={{ minHeight: 90, fontFamily: "monospace" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input id="hintsEnabled" name="hintsEnabled" type="checkbox" defaultChecked={lab?.hintsEnabled ?? false} style={{ width: "auto" }} />
            <label htmlFor="hintsEnabled" style={{ marginBottom: 0, textTransform: "none", fontSize: 13, color: "var(--ink)" }}>
              Allow AI hints for this lab
            </label>
          </div>
          <button className="button button-primary" type="submit" style={{ justifySelf: "start" }}>
            {lab ? "Save lab" : "Add lab"}
          </button>
        </form>
        {lab && (
          <form action={deleteLab.bind(null, id, lessonId)} style={{ marginBottom: 36 }}>
            <button className="button button-small" type="submit">Remove lab</button>
          </form>
        )}

        <div className="admin-header">
          <h2>Assessment</h2>
        </div>
        <GenerateAssessmentButton lessonId={lessonId} />
        <form className="admin-form" action={upsertAssessment.bind(null, id, lessonId)}>
          <div>
            <label htmlFor="questions">Questions (JSON)</label>
            <textarea
              id="questions"
              name="questions"
              defaultValue={questionsText}
              placeholder='[{"question": "...", "options": ["a", "b", "c", "d"], "correctIndex": 0}]'
              style={{ minHeight: 160, fontFamily: "monospace" }}
              required
            />
          </div>
          <button className="button button-primary" type="submit" style={{ justifySelf: "start" }}>
            {assessment ? "Save assessment" : "Add assessment"}
          </button>
        </form>
        {assessment && (
          <form action={deleteAssessment.bind(null, id, lessonId)}>
            <button className="button button-small" type="submit">Remove assessment</button>
          </form>
        )}
      </div>
    </main>
  );
}
