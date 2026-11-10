import Link from "next/link";
import { notFound } from "next/navigation";
import { requireInstructorAccess } from "@/lib/session";
import prisma from "@/lib/prisma";
import {
  assignInstructor,
  createLesson,
  deleteLesson,
  enrollStudent,
  unassignInstructor,
  unenrollStudent,
} from "./actions";

export const instant = false;

export default async function InstructorCourseWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const session = await requireInstructorAccess(id);
  const isAdmin = session.user.role === "admin";

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) notFound();

  const [lessons, enrollments, instructors] = await Promise.all([
    prisma.lesson.findMany({ where: { courseId: id }, orderBy: { position: "asc" } }),
    prisma.enrollment.findMany({
      where: { courseId: id },
      orderBy: { enrolledAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
    isAdmin
      ? prisma.courseInstructor.findMany({
          where: { courseId: id },
          orderBy: { assignedAt: "desc" },
          include: { user: { select: { name: true, email: true } } },
        })
      : Promise.resolve([]),
  ]);

  return (
    <main className="section catalog-section">
      <div className="container">
      <p>
        <Link className="text-link text-link-back" href={isAdmin ? "/admin/courses" : "/instructor"}>
          <span aria-hidden="true">←</span> Back to {isAdmin ? "courses" : "dashboard"}
        </Link>
      </p>

      <div className="admin-header">
        <h1>{course.name}</h1>
      </div>

      {error && <p className="auth-error">{error}</p>}

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Lessons</h2>
      <form className="admin-form" action={createLesson.bind(null, id)}>
        <div>
          <label htmlFor="title">Title</label>
          <input id="title" name="title" required />
        </div>
        <div>
          <label htmlFor="content">Content</label>
          <textarea id="content" name="content" style={{ minHeight: 120 }} required />
        </div>
        <div>
          <label htmlFor="videoUrl">Video URL (YouTube or Vimeo, optional)</label>
          <input id="videoUrl" name="videoUrl" type="url" placeholder="https://www.youtube.com/watch?v=..." />
        </div>
        <button className="button button-primary" type="submit" style={{ justifySelf: "start" }}>
          Add lesson
        </button>
      </form>

      {lessons.length === 0 ? (
        <p className="admin-empty">No lessons yet.</p>
      ) : (
        <table className="admin-table" style={{ marginBottom: 36 }}>
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {lessons.map((lesson) => (
              <tr key={lesson.id}>
                <td>{lesson.position}</td>
                <td>{lesson.title}</td>
                <td>{lesson.isPublished ? "Published" : "Draft"}</td>
                <td>
                  <div className="admin-actions">
                    <Link href={`/instructor/courses/${id}/lessons/${lesson.id}`}>Edit</Link>
                    <form action={deleteLesson.bind(null, id, lesson.id)}>
                      <button type="submit" className="danger">
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Enrolled students</h2>
      <form className="admin-form" action={enrollStudent.bind(null, id)}>
        <div>
          <label htmlFor="email">Learner&rsquo;s email</label>
          <input id="email" name="email" type="email" required placeholder="learner@example.com" />
        </div>
        <button className="button button-primary" type="submit" style={{ justifySelf: "start" }}>
          Enroll
        </button>
      </form>

      {enrollments.length === 0 ? (
        <p className="admin-empty">No one enrolled yet.</p>
      ) : (
        <table className="admin-table" style={{ marginBottom: isAdmin ? 36 : 0 }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Enrolled</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((enrollment) => (
              <tr key={enrollment.id}>
                <td>{enrollment.user.name}</td>
                <td>{enrollment.user.email}</td>
                <td>{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(enrollment.enrolledAt)}</td>
                <td>
                  <form action={unenrollStudent.bind(null, id, enrollment.id)}>
                    <div className="admin-actions">
                      <button type="submit" className="danger">
                        Unenroll
                      </button>
                    </div>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isAdmin && (
        <>
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>Instructors</h2>
          <form className="admin-form" action={assignInstructor.bind(null, id)}>
            <div>
              <label htmlFor="instructorEmail">Instructor&rsquo;s email</label>
              <input id="instructorEmail" name="email" type="email" required placeholder="instructor@example.com" />
            </div>
            <button className="button button-primary" type="submit" style={{ justifySelf: "start" }}>
              Assign
            </button>
          </form>

          {instructors.length === 0 ? (
            <p className="admin-empty">No instructors assigned yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {instructors.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>{assignment.user.name}</td>
                    <td>{assignment.user.email}</td>
                    <td>
                      <form action={unassignInstructor.bind(null, id, assignment.id)}>
                        <div className="admin-actions">
                          <button type="submit" className="danger">
                            Unassign
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
      </div>
    </main>
  );
}
