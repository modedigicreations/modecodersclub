import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { canManageCourse, getSession } from "@/lib/session";
import { buildCourseHandbook } from "@/lib/course-handbook";
import { slugify } from "@/lib/course-generator/clamp";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Course handbook PDF.
 * - Admins and the course's instructors: every lesson, drafts included (marked draft).
 * - Enrolled learners: published lessons of a published, non-archived course.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });

  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      level: true,
      description: true,
      audience: true,
      duration: true,
      outcomes: true,
      isDraft: true,
      archivedAt: true,
    },
  });
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });

  const staff = await canManageCourse(session, course.id);
  if (!staff) {
    const enrolled = await prisma.enrollment.findUnique({
      where: { courseId_userId: { courseId: course.id, userId: session.user.id } },
      select: { id: true },
    });
    if (!enrolled || course.isDraft || course.archivedAt) {
      return NextResponse.json({ error: "You don't have access to this course." }, { status: 403 });
    }
  }

  const lessons = await prisma.lesson.findMany({
    where: { courseId: course.id, ...(staff ? {} : { isPublished: true }) },
    orderBy: { position: "asc" },
    select: {
      title: true,
      content: true,
      isPublished: true,
      assessment: { select: { questions: true } },
      lab: { select: { instructions: true } },
    },
  });

  try {
    const bytes = await buildCourseHandbook({ ...course, lessons });
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${slugify(course.name)}-handbook.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Handbook generation failed", error);
    return NextResponse.json({ error: "Couldn't build the handbook. Try again." }, { status: 500 });
  }
}
