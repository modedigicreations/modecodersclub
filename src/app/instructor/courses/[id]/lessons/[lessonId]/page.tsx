import { notFound } from "next/navigation";
import { requireInstructorAccess } from "@/lib/session";
import prisma from "@/lib/prisma";
import { updateLesson } from "../../actions";

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

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId, courseId: id } });
  if (!lesson) notFound();

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
      </div>
    </main>
  );
}
