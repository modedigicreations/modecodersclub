import Link from "next/link";
import { requireUser } from "@/lib/session";
import prisma from "@/lib/prisma";

export const instant = false;

export default async function InstructorCoursesPage() {
  const session = await requireUser();
  if (session.user.role !== "admin" && session.user.role !== "instructor") {
    return (
      <main className="section catalog-section">
        <div className="container">
          <p className="admin-empty">You don&rsquo;t have instructor access.</p>
        </div>
      </main>
    );
  }

  const courses = await prisma.course.findMany({
    where:
      session.user.role === "admin"
        ? { archivedAt: null }
        : { archivedAt: null, instructors: { some: { userId: session.user.id } } },
    orderBy: { order: "asc" },
    include: { _count: { select: { lessons: true, enrollments: true } } },
  });

  return (
    <main>
      <section className="catalog-hero">
        <div className="container">
          <p className="eyebrow"><span /> Instructor workspace</p>
          <h1>Your courses.</h1>
          <p>Manage lessons and enrolled learners for each course you teach.</p>
        </div>
      </section>
      <section className="section catalog-section">
        <div className="container">
          {courses.length === 0 ? (
            <p className="admin-empty">
              {session.user.role === "admin"
                ? "No courses yet — add one in Admin first."
                : "You haven't been assigned to any courses yet."}
            </p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Lessons</th>
                  <th>Students</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id}>
                    <td>{course.name}</td>
                    <td>{course._count.lessons}</td>
                    <td>{course._count.enrollments}</td>
                    <td>
                      <div className="admin-actions">
                        <Link href={`/instructor/courses/${course.id}`}>Open</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
