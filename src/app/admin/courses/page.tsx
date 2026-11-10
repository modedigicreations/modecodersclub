import Link from "next/link";
import prisma from "@/lib/prisma";
import { createCourse, deleteCourse, setCourseArchived } from "./actions";
import { CourseForm } from "./course-form";

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const courses = await prisma.course.findMany({ orderBy: { order: "asc" } });

  return (
    <div>
      <div className="admin-header">
        <h1>Courses</h1>
      </div>

      {error && <p className="auth-error">{error}</p>}

      <CourseForm action={createCourse} submitLabel="Add course" />

      {courses.length === 0 ? (
        <p className="admin-empty">No courses yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id}>
                <td>
                  <strong>{course.name}</strong>
                  <br />
                  <span style={{ color: "var(--muted)", fontSize: 11 }}>/courses/{course.slug}</span>
                </td>
                <td>{course.category}</td>
                <td>
                  {course.price}
                  <br />
                  <span style={{ color: course.isFree ? "var(--muted)" : "var(--green-dark)", fontSize: 11, fontWeight: 700 }}>
                    {course.isFree ? "Free" : "Requires subscription"}
                  </span>
                </td>
                <td>{course.archivedAt ? "Archived" : "Active"}</td>
                <td>
                  <div className="admin-actions">
                    <Link href={`/admin/courses/${course.id}`}>Edit</Link>
                    <Link href={`/instructor/courses/${course.id}`}>Lessons &amp; instructors</Link>
                    <form action={setCourseArchived.bind(null, course.id, !course.archivedAt)}>
                      <button type="submit">{course.archivedAt ? "Unarchive" : "Archive"}</button>
                    </form>
                    <form action={deleteCourse.bind(null, course.id)}>
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
    </div>
  );
}
