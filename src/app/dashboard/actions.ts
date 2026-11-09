"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import prisma from "@/lib/prisma";

export async function markLessonComplete(courseId: string, lessonId: string) {
  const session = await requireUser();

  const enrollment = await prisma.enrollment.findUnique({
    where: { courseId_userId: { courseId, userId: session.user.id } },
  });
  if (!enrollment) redirect("/dashboard");

  await prisma.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
    update: {},
    create: { enrollmentId: enrollment.id, lessonId },
  });

  revalidatePath(`/dashboard/courses/${courseId}`);
  revalidatePath(`/dashboard/courses/${courseId}/lessons/${lessonId}`);
  revalidatePath("/dashboard");
}

// Called directly from the client lab editor (not bound to a form) for
// silent autosave — no redirect/revalidate, since there's no page
// transition to make visible.
export async function saveLabSubmission(labId: string, html: string, css: string, js: string) {
  const session = await requireUser();
  await prisma.labSubmission.upsert({
    where: { labId_userId: { labId, userId: session.user.id } },
    create: { labId, userId: session.user.id, html, css, js },
    update: { html, css, js },
  });
}
