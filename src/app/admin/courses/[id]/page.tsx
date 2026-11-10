import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { updateCourse } from "../actions";
import { CourseForm } from "../course-form";

export default async function EditCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) notFound();

  return (
    <div>
      <p>
        <Link href="/admin/courses" className="text-link text-link-back">
          <span aria-hidden="true">←</span> Back to courses
        </Link>
      </p>
      <div className="admin-header">
        <h1>Edit {course.name}</h1>
        <Link href={`/instructor/courses/${course.id}`} className="text-link">
          Manage lessons, students &amp; instructors <span aria-hidden="true">→</span>
        </Link>
      </div>
      {error && <p className="auth-error">{error}</p>}
      <CourseForm
        action={updateCourse.bind(null, course.id)}
        defaults={course}
        submitLabel="Save changes"
        slugEditable={false}
      />
    </div>
  );
}
