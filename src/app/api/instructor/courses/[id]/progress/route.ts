import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { canManageCourse, getSession } from "@/lib/session";
import { getCourseLearnerProgress, progressCsv } from "@/lib/learner-progress";
import { slugify } from "@/lib/course-generator/clamp";

type RouteContext = { params: Promise<{ id: string }> };

/** CSV of every enrolled learner's progress. Admins and the course's own instructors only. */
export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  const { id } = await params;
  const course = await prisma.course.findUnique({ where: { id }, select: { name: true } });
  if (!course) return NextResponse.json({ error: "Course not found." }, { status: 404 });
  if (!(await canManageCourse(session, id))) {
    return NextResponse.json({ error: "You don't have access to this course." }, { status: 403 });
  }
  const csv = progressCsv(await getCourseLearnerProgress(id));
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugify(course.name)}-progress-${date}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
