import Link from "next/link";
import { notFound } from "next/navigation";
import { requireInstructorAccess } from "@/lib/session";
import prisma from "@/lib/prisma";
import { getCourseLearnerProgress } from "@/lib/learner-progress";
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

  const [lessons, progress, instructors] = await Promise.all([
    prisma.lesson.findMany({ where: { courseId: id }, orderBy: { position: "asc" } }),
    getCourseLearnerProgress(id),
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
        <a className="text-link" href={`/api/courses/${id}/handbook`}>
          Handbook (PDF) <span aria-hidden="true">↓</span>
        </a>
      </div>
      {course.isDraft && (
        <p className="auth-error" style={{ background: "#fff7e6", color: "#7a4b00" }}>
          Draft: hidden from the catalogue and closed to enrolments until an admin publishes it from Admin → AI course generator.
        </p>
      )}

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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Enrolled students &amp; progress ({progress.length})</h2>
        {progress.length > 0 && (
          <a className="text-link" href={`/api/instructor/courses/${id}/progress`}>
            Download progress (CSV) <span aria-hidden="true">↓</span>
          </a>
        )}
      </div>
      <form className="admin-form" action={enrollStudent.bind(null, id)}>
        <div>
          <label htmlFor="email">Learner&rsquo;s email</label>
          <input id="email" name="email" type="email" required placeholder="learner@example.com" />
        </div>
        <button className="button button-primary" type="submit" style={{ justifySelf: "start" }}>
          Enroll
        </button>
      </form>

      {progress.length === 0 ? (
        <p className="admin-empty">No one enrolled yet.</p>
      ) : (
        <div style={{ overflowX: "auto", marginBottom: isAdmin ? 36 : 0 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Learner</th>
                <th>Lessons</th>
                <th>Quizzes</th>
                <th>Labs</th>
                <th>Last active</th>
                <th>Certificate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {progress.map((row) => (
                <tr key={row.enrollmentId}>
                  <td>
                    <strong>{row.name}</strong>
                    {row.isSchool && <span style={{ fontSize: 10, fontWeight: 800, marginLeft: 6 }}>SCHOOL</span>}
                    <br />
                    <span style={{ color: "var(--muted)", fontSize: 11 }}>{row.email}</span>
                  </td>
                  <td>
                    {row.lessonsDone}/{row.totalLessons} ({row.percent}%)
                    <div className="progress-bar" style={{ height: 6, marginTop: 4, minWidth: 80 }} aria-hidden="true">
                      <span style={{ width: `${row.percent}%` }} />
                    </div>
                  </td>
                  <td>
                    {row.quizzesPassed}/{row.quizzesTotal} passed
                    {row.quizAverage !== null && (
                      <>
                        <br />
                        <span style={{ color: "var(--muted)", fontSize: 11 }}>avg {row.quizAverage}%</span>
                      </>
                    )}
                  </td>
                  <td>
                    {row.labsStarted}/{row.labsTotal}
                  </td>
                  <td>{row.lastActivity ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(row.lastActivity) : "—"}</td>
                  <td style={{ fontSize: 11 }}>{row.certificateNumber ?? "—"}</td>
                  <td>
                    <form action={unenrollStudent.bind(null, id, row.enrollmentId)}>
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
        </div>
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
